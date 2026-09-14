<?php

namespace App\Http\Controllers\Api\V1\Management;

use App\Http\Controllers\Controller;
use App\Http\Requests\Management\ListActionLogsRequest;
use App\Http\Resources\ActionLogResource;
use App\Models\AuditLog;
use App\Support\BusinessClock;
use App\Traits\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;

class ActionLogController extends Controller
{
    use ApiResponse;

    public function index(ListActionLogsRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $query = AuditLog::query()
            ->with('user')
            ->whereNotIn('action', [AuditLog::RESERVATION_SUBMITTED, AuditLog::LOGIN_FAILED])
            ->latest('id');

        if ($module = $validated['module'] ?? null) {
            $legacyActions = $this->legacyActionsForModule($module);
            $query->where(function ($query) use ($module, $legacyActions): void {
                $query->where('module', $module);
                if ($legacyActions !== []) {
                    $query->orWhere(function ($query) use ($legacyActions): void {
                        $query->whereNull('module')->whereIn('action', $legacyActions);
                    });
                }
            });
        }

        if ($search = $validated['search'] ?? null) {
            $query->where(function ($query) use ($search): void {
                $query->where('actor_name', 'like', "%{$search}%")
                    ->orWhere('target_label', 'like', "%{$search}%")
                    ->orWhere('action', 'like', "%{$search}%")
                    ->orWhereHas('user', fn ($users) => $users->where('name', 'like', "%{$search}%"));
            });
        }

        if ($date = $validated['date'] ?? null) {
            $start = CarbonImmutable::createFromFormat('Y-m-d', $date, BusinessClock::timezone())->startOfDay()->utc();
            $query->where('created_at', '>=', $start)->where('created_at', '<', $start->addDay());
        }

        $logs = $query->paginate((int) ($validated['per_page'] ?? 10));

        return $this->respondSuccess(ActionLogResource::collection($logs->items())->resolve($request), 'Action logs retrieved.', meta: [
            'current_page' => $logs->currentPage(),
            'last_page' => $logs->lastPage(),
            'per_page' => $logs->perPage(),
            'total' => $logs->total(),
        ]);
    }

    /** @return list<string> */
    private function legacyActionsForModule(string $module): array
    {
        return match ($module) {
            'RESERVATION' => [AuditLog::RESERVATION_SUBMITTED, AuditLog::RESERVATION_WALK_IN_CREATED, AuditLog::RESERVATION_VERIFIED, AuditLog::RESERVATION_REJECTED, AuditLog::RESERVATION_STARTED, AuditLog::RESERVATION_RESCHEDULED, AuditLog::RESERVATION_ADD_ON_ADDED, AuditLog::RESERVATION_COMPLETED, AuditLog::RESERVATION_CANCELLED, AuditLog::RESERVATION_NO_SHOW],
            'MANAGEMENT_AVAILABILITY_CLOSURES' => [AuditLog::DATE_CLOSED, AuditLog::COURT_SLOT_BLOCKED, AuditLog::DATE_REOPENED, AuditLog::COURT_SLOT_REOPENED],
            'MANAGEMENT_STORAGE_RETENTION' => [AuditLog::PAYMENT_PROOFS_DELETED],
            'MANAGEMENT_TEAM_ACCESS' => [AuditLog::STAFF_CREATED, AuditLog::STAFF_UPDATED, AuditLog::STAFF_ACTIVATED, AuditLog::STAFF_DEACTIVATED, AuditLog::STAFF_DELETED, AuditLog::STAFF_PASSWORD_RESET, AuditLog::ACCESS_CREATED, AuditLog::ACCESS_UPDATED, AuditLog::ACCESS_DELETED],
            'SECURITY' => [AuditLog::LOGIN_SUCCEEDED, AuditLog::LOGOUT_COMPLETED],
            'ACCOUNT' => [AuditLog::PASSWORD_CHANGED],
            default => [],
        };
    }
}

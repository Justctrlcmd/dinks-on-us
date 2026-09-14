<?php

namespace App\Http\Controllers\Api\V1\Management;

use App\Http\Controllers\Controller;
use App\Http\Requests\Management\DeleteStaffRequest;
use App\Http\Requests\Management\ResetStaffPasswordRequest;
use App\Http\Requests\Management\StoreStaffRequest;
use App\Http\Requests\Management\UpdateStaffRequest;
use App\Http\Resources\StaffResource;
use App\Models\AuditLog;
use App\Models\User;
use App\Services\SecurityAuditService;
use App\Services\SessionSecurityService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StaffController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $staff = User::query()
            ->whereHas('role', fn ($query) => $query->where('is_protected', false)->where('is_full_access', false))
            ->with('role')
            ->orderBy('name')
            ->orderBy('id')
            ->paginate(10);

        return $this->respondSuccess(
            StaffResource::collection($staff->items())->resolve($request),
            'Team members retrieved.',
            200,
            [
                'current_page' => $staff->currentPage(),
                'per_page' => $staff->perPage(),
                'total' => $staff->total(),
                'last_page' => $staff->lastPage(),
            ],
        );
    }

    public function store(StoreStaffRequest $request, SecurityAuditService $audit): JsonResponse
    {
        $staff = User::query()->create([
            ...$request->safe()->except('password_confirmation'),
            'email_verified_at' => now(),
            'is_active' => true,
        ])->load('role');
        $audit->record(AuditLog::STAFF_CREATED, $request, $request->user(), $staff, [
            'role_id' => $staff->role_id,
            'is_active' => $staff->is_active,
        ], 'MANAGEMENT_TEAM_ACCESS', $staff->name);

        return $this->respondSuccess(
            StaffResource::make($staff)->resolve($request),
            'Team member added.',
            201,
        );
    }

    public function update(
        UpdateStaffRequest $request,
        User $staff,
        SessionSecurityService $sessions,
        SecurityAuditService $audit,
    ): JsonResponse {
        if ($failure = $this->protectedAccountFailure($staff)) {
            return $failure;
        }

        abort_if($request->user()->is($staff), 403);

        $previousRoleId = $staff->role_id;
        $staff->update($request->validated());
        if ($previousRoleId !== $staff->role_id) {
            $sessions->invalidate($staff);
        }
        $audit->record(AuditLog::STAFF_UPDATED, $request, $request->user(), $staff, [
            'role_changed' => $previousRoleId !== $staff->role_id,
            'role_id' => $staff->role_id,
        ], 'MANAGEMENT_TEAM_ACCESS', $staff->name);

        return $this->respondSuccess(
            StaffResource::make($staff->fresh()->load('role'))->resolve($request),
            'Team member updated.',
        );
    }

    public function deactivate(
        Request $request,
        User $staff,
        SessionSecurityService $sessions,
        SecurityAuditService $audit,
    ): JsonResponse {
        if ($failure = $this->protectedAccountFailure($staff)) {
            return $failure;
        }

        if ($request->user()->is($staff)) {
            return $this->respondFailure(
                'You cannot deactivate your own account.',
                'SELF_DEACTIVATION',
                409,
            );
        }

        DB::transaction(function () use ($staff, $sessions): void {
            $staff->update(['is_active' => false]);
            $sessions->invalidate($staff);
        });
        $audit->record(AuditLog::STAFF_DEACTIVATED, $request, $request->user(), $staff, module: 'MANAGEMENT_TEAM_ACCESS', targetLabel: $staff->name);

        return $this->respondSuccess(
            StaffResource::make($staff->fresh()->load('role'))->resolve($request),
            'Team member deactivated.',
        );
    }

    public function activate(Request $request, User $staff, SecurityAuditService $audit): JsonResponse
    {
        if ($failure = $this->protectedAccountFailure($staff)) {
            return $failure;
        }

        $staff->update(['is_active' => true]);
        $audit->record(AuditLog::STAFF_ACTIVATED, $request, $request->user(), $staff, module: 'MANAGEMENT_TEAM_ACCESS', targetLabel: $staff->name);

        return $this->respondSuccess(
            StaffResource::make($staff->fresh()->load('role'))->resolve($request),
            'Team member reactivated.',
        );
    }

    public function destroy(
        DeleteStaffRequest $request,
        User $staff,
        SessionSecurityService $sessions,
        SecurityAuditService $audit,
    ): JsonResponse {
        if ($failure = $this->protectedAccountFailure($staff)) {
            return $failure;
        }

        if ($request->user()->is($staff)) {
            return $this->respondFailure(
                'You cannot delete your own account.',
                'SELF_DELETION',
                409,
            );
        }

        DB::transaction(function () use ($staff, $sessions): void {
            $staff->update(['is_active' => false]);
            $sessions->invalidate($staff);
            $staff->delete();
        });
        $audit->record(AuditLog::STAFF_DELETED, $request, $request->user(), $staff, [
            'is_active' => false,
            'soft_deleted' => true,
        ], 'MANAGEMENT_TEAM_ACCESS', $staff->name);

        return $this->respondSuccess(null, 'Team member deleted. Historical activity remains intact.');
    }

    public function resetPassword(
        ResetStaffPasswordRequest $request,
        User $staff,
        SessionSecurityService $sessions,
        SecurityAuditService $audit,
    ): JsonResponse {
        if ($failure = $this->protectedAccountFailure($staff)) {
            return $failure;
        }

        abort_if($request->user()->is($staff), 403);

        DB::transaction(function () use ($request, $staff, $sessions): void {
            $staff->update(['password' => $request->validated('password')]);
            $sessions->invalidate($staff);
        });
        $audit->record(AuditLog::STAFF_PASSWORD_RESET, $request, $request->user(), $staff, module: 'MANAGEMENT_TEAM_ACCESS', targetLabel: $staff->name);

        return $this->respondSuccess(null, 'Team member password reset.');
    }

    private function protectedAccountFailure(User $staff): ?JsonResponse
    {
        $staff->loadMissing('role');

        if (! $staff->role || $staff->role->is_protected || $staff->role->is_full_access) {
            return $this->respondFailure(
                'The Manager account is maintained through its own settings.',
                'PROTECTED_ACCOUNT',
                409,
            );
        }

        return null;
    }
}

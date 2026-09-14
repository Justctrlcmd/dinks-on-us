<?php

namespace App\Http\Resources;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

class ActionLogResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $action = (string) $this->action;
        $module = $this->module ?? self::legacyModule($action);
        $label = Str::of($action)->lower()->replace('_', ' ')->ucfirst()->toString();

        return [
            'id' => $this->id,
            'actor_name' => $this->actor_name ?? $this->user?->name ?? ($action === AuditLog::RESERVATION_SUBMITTED ? 'Customer' : 'System'),
            'action' => $action,
            'action_label' => $label,
            'module' => $module,
            'target_label' => $this->target_label ?? self::legacyTargetLabel($this->resource),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }

    public static function legacyModule(string $action): string
    {
        return match (true) {
            str_starts_with($action, 'RESERVATION_') => 'RESERVATION',
            in_array($action, [AuditLog::DATE_CLOSED, AuditLog::COURT_SLOT_BLOCKED, AuditLog::DATE_REOPENED, AuditLog::COURT_SLOT_REOPENED], true) => 'MANAGEMENT_AVAILABILITY_CLOSURES',
            $action === AuditLog::PAYMENT_PROOFS_DELETED => 'MANAGEMENT_STORAGE_RETENTION',
            str_starts_with($action, 'STAFF_'), str_starts_with($action, 'ACCESS_') => 'MANAGEMENT_TEAM_ACCESS',
            in_array($action, [AuditLog::LOGIN_SUCCEEDED, AuditLog::LOGOUT_COMPLETED], true) => 'SECURITY',
            $action === AuditLog::PASSWORD_CHANGED => 'ACCOUNT',
            default => 'ACCOUNT',
        };
    }

    private static function legacyTargetLabel(AuditLog $log): ?string
    {
        if ($log->action === AuditLog::RESERVATION_SUBMITTED || str_starts_with((string) $log->action, 'RESERVATION_')) {
            return $log->after['reference_number'] ?? ($log->target_id ? "Reservation #{$log->target_id}" : null);
        }

        return $log->target_id ? "Record #{$log->target_id}" : null;
    }
}

<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class SecurityAuditService
{
    /** @param array<string, mixed> $details */
    public function record(
        string $action,
        Request $request,
        ?User $actor = null,
        Model|string|null $target = null,
        array $details = [],
        ?string $module = null,
        ?string $targetLabel = null,
        ?string $actorName = null,
    ): AuditLog {
        $targetType = $target instanceof Model ? $target::class : (is_string($target) ? $target : null);
        $targetId = $target instanceof Model ? (string) $target->getKey() : null;

        return AuditLog::query()->create([
            'actor_id' => $actor?->id,
            'actor_name' => $actorName ?? $actor?->name,
            'action' => $action,
            'module' => $module,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'target_label' => $targetLabel,
            'after' => $details === [] ? null : $details,
            'ip_address' => $request->ip(),
            'user_agent' => mb_substr((string) $request->userAgent(), 0, 255),
        ]);
    }

    /** @param array<string, mixed> $details */
    public function recordFromContext(
        string $action,
        ?User $actor = null,
        Model|string|null $target = null,
        array $details = [],
        ?string $module = null,
        ?string $targetLabel = null,
        ?string $actorName = null,
    ): AuditLog {
        return $this->record($action, request(), $actor, $target, $details, $module, $targetLabel, $actorName);
    }

}

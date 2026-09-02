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
    ): AuditLog {
        $targetType = $target instanceof Model ? $target::class : (is_string($target) ? $target : null);
        $targetId = $target instanceof Model ? (string) $target->getKey() : null;

        return AuditLog::query()->create([
            'actor_id' => $actor?->id,
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'after' => $details === [] ? null : $details,
            'ip_address' => $request->ip(),
            'user_agent' => mb_substr((string) $request->userAgent(), 0, 255),
        ]);
    }

    public function credentialFingerprint(string $email): string
    {
        return hash_hmac('sha256', mb_strtolower(trim($email)), (string) config('app.key'));
    }
}

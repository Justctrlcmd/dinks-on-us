<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['actor_id', 'actor_name', 'action', 'module', 'target_type', 'target_id', 'target_label', 'before', 'after', 'ip_address', 'user_agent'])]
class AuditLog extends Model
{
    public const DATE_CLOSED = 'DATE_CLOSED';

    public const COURT_SLOT_BLOCKED = 'COURT_SLOT_BLOCKED';

    public const DATE_REOPENED = 'DATE_REOPENED';

    public const COURT_SLOT_REOPENED = 'COURT_SLOT_REOPENED';

    public const RESERVATION_SUBMITTED = 'RESERVATION_SUBMITTED';

    public const RESERVATION_WALK_IN_CREATED = 'RESERVATION_WALK_IN_CREATED';

    public const RESERVATION_VERIFIED = 'RESERVATION_VERIFIED';

    public const RESERVATION_REJECTED = 'RESERVATION_REJECTED';

    public const RESERVATION_STARTED = 'RESERVATION_STARTED';

    public const RESERVATION_RESCHEDULED = 'RESERVATION_RESCHEDULED';

    public const RESERVATION_ADD_ON_ADDED = 'RESERVATION_ADD_ON_ADDED';

    public const RESERVATION_COMPLETED = 'RESERVATION_COMPLETED';

    public const RESERVATION_CANCELLED = 'RESERVATION_CANCELLED';

    public const RESERVATION_NO_SHOW = 'RESERVATION_NO_SHOW';

    public const PAYMENT_PROOFS_DELETED = 'PAYMENT_PROOFS_DELETED';

    public const LOGIN_SUCCEEDED = 'LOGIN_SUCCEEDED';

    public const LOGIN_FAILED = 'LOGIN_FAILED';

    public const LOGOUT_COMPLETED = 'LOGOUT_COMPLETED';

    public const PASSWORD_CHANGED = 'PASSWORD_CHANGED';

    public const STAFF_CREATED = 'STAFF_CREATED';

    public const STAFF_UPDATED = 'STAFF_UPDATED';

    public const STAFF_ACTIVATED = 'STAFF_ACTIVATED';

    public const STAFF_DEACTIVATED = 'STAFF_DEACTIVATED';

    public const STAFF_DELETED = 'STAFF_DELETED';

    public const STAFF_PASSWORD_RESET = 'STAFF_PASSWORD_RESET';

    public const ACCESS_CREATED = 'ACCESS_CREATED';

    public const ACCESS_UPDATED = 'ACCESS_UPDATED';

    public const ACCESS_DELETED = 'ACCESS_DELETED';

    protected static function booted(): void
    {
        static::creating(function (AuditLog $log): void {
            if (! app()->bound('request')) {
                return;
            }

            $request = request();
            $log->ip_address ??= $request->ip();
            $log->user_agent ??= mb_substr((string) $request->userAgent(), 0, 255);
        });
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id')->withTrashed();
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'before' => 'array',
            'after' => 'array',
        ];
    }
}

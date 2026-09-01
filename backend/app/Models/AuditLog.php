<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['actor_id', 'action', 'target_type', 'target_id', 'before', 'after', 'ip_address', 'user_agent'])]
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

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
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

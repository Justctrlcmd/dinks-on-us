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

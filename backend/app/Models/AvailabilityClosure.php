<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'type',
    'date',
    'court_id',
    'reason',
    'is_active',
    'created_by_user_id',
    'reopened_by_user_id',
    'reopened_at',
])]
class AvailabilityClosure extends Model
{
    public const TYPE_ENTIRE_OPERATION = 'entire_operation';

    public const TYPE_COURT_TIME = 'court_time';

    /** @param Builder<AvailabilityClosure> $query */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }

    /** @return BelongsTo<Court, $this> */
    public function court(): BelongsTo
    {
        return $this->belongsTo(Court::class);
    }

    /** @return HasMany<AvailabilityClosurePeriod, $this> */
    public function periods(): HasMany
    {
        return $this->hasMany(AvailabilityClosurePeriod::class)->orderBy('start_hour');
    }

    /** @return BelongsTo<User, $this> */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /** @return BelongsTo<User, $this> */
    public function reopenedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reopened_by_user_id');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'date' => 'date',
            'is_active' => 'boolean',
            'reopened_at' => 'datetime',
        ];
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'reference_number', 'idempotency_key', 'source', 'booking_date', 'customer_name', 'customer_email',
    'customer_contact_number', 'status', 'is_rescheduled', 'reschedule_count',
    'original_additional_players', 'additional_player_unit_amount', 'original_amount',
    'adjustment_amount', 'final_amount', 'amount_paid', 'refundable_credit',
    'rejection_concern', 'rejection_reason', 'cancellation_reason', 'policy_snapshot',
    'policy_accepted_at', 'submitted_at', 'verified_at', 'started_at', 'completed_at',
    'cancelled_at', 'rejected_at', 'no_show_at', 'created_by_user_id',
    'verified_by_user_id', 'started_by_user_id', 'completed_by_user_id',
    'cancelled_by_user_id', 'rejected_by_user_id', 'no_show_by_user_id',
])]
class Reservation extends Model
{
    public const STATUS_PENDING = 'PENDING';

    public const STATUS_VERIFIED = 'VERIFIED';

    public const STATUS_ONGOING = 'ONGOING';

    public const STATUS_COMPLETED = 'COMPLETED';

    public const STATUS_CANCELLED = 'CANCELLED';

    public const STATUS_REJECTED = 'REJECTED';

    public const STATUS_NO_SHOW = 'NO_SHOW';

    public const OPERATIONAL_STATUSES = [self::STATUS_PENDING, self::STATUS_VERIFIED, self::STATUS_ONGOING];

    public const FINAL_STATUSES = [self::STATUS_COMPLETED, self::STATUS_CANCELLED, self::STATUS_REJECTED, self::STATUS_NO_SHOW];

    public function slots(): HasMany
    {
        return $this->hasMany(ReservationSlot::class);
    }

    public function currentSlots(): HasMany
    {
        return $this->slots()->where('is_current', true);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(ReservationPayment::class);
    }

    public function equipmentItems(): HasMany
    {
        return $this->hasMany(ReservationEquipmentItem::class);
    }

    public function adjustments(): HasMany
    {
        return $this->hasMany(ReservationAdjustment::class);
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(ReservationStatusHistory::class);
    }

    public function scheduleHistories(): HasMany
    {
        return $this->hasMany(ReservationScheduleHistory::class);
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(ReservationRefund::class);
    }

    public function scopeOperational(Builder $query): void
    {
        $query->whereIn('status', self::OPERATIONAL_STATUSES);
    }

    protected function casts(): array
    {
        return [
            'booking_date' => 'date:Y-m-d', 'is_rescheduled' => 'boolean', 'reschedule_count' => 'integer',
            'original_additional_players' => 'integer', 'additional_player_unit_amount' => 'decimal:2',
            'original_amount' => 'decimal:2', 'adjustment_amount' => 'decimal:2', 'final_amount' => 'decimal:2',
            'amount_paid' => 'decimal:2', 'refundable_credit' => 'decimal:2', 'policy_snapshot' => 'array',
            'policy_accepted_at' => 'datetime', 'submitted_at' => 'datetime', 'verified_at' => 'datetime',
            'started_at' => 'datetime', 'completed_at' => 'datetime', 'cancelled_at' => 'datetime',
            'rejected_at' => 'datetime', 'no_show_at' => 'datetime',
        ];
    }
}

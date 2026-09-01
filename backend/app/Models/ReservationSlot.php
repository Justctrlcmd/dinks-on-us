<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable(['reservation_id', 'court_id', 'date', 'start_hour', 'end_hour', 'unit_amount', 'kind', 'is_current', 'added_by_user_id'])]
class ReservationSlot extends Model
{
    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    public function court(): BelongsTo
    {
        return $this->belongsTo(Court::class);
    }

    public function lock(): HasOne
    {
        return $this->hasOne(ReservationSlotLock::class);
    }

    protected function casts(): array
    {
        return ['date' => 'date:Y-m-d', 'start_hour' => 'integer', 'end_hour' => 'integer', 'unit_amount' => 'decimal:2', 'is_current' => 'boolean'];
    }
}

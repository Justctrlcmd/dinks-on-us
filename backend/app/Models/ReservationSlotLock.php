<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['reservation_slot_id', 'court_id', 'date', 'start_hour'])]
class ReservationSlotLock extends Model
{
    public function reservationSlot(): BelongsTo { return $this->belongsTo(ReservationSlot::class); }
    protected function casts(): array { return ['date' => 'date:Y-m-d', 'start_hour' => 'integer']; }
}

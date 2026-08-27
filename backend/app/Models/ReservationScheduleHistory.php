<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['reservation_id', 'old_booking_date', 'new_booking_date', 'old_slots', 'new_slots', 'old_slot_amount', 'new_slot_amount', 'difference_amount', 'performed_by_user_id'])]
class ReservationScheduleHistory extends Model
{
    protected function casts(): array
    {
        return ['old_booking_date' => 'date:Y-m-d', 'new_booking_date' => 'date:Y-m-d', 'old_slots' => 'array', 'new_slots' => 'array', 'old_slot_amount' => 'decimal:2', 'new_slot_amount' => 'decimal:2', 'difference_amount' => 'decimal:2'];
    }
}

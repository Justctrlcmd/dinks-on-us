<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['reservation_id', 'type', 'status', 'amount', 'reason', 'created_by_user_id'])]
class ReservationRefund extends Model
{
    protected function casts(): array
    {
        return ['amount' => 'decimal:2'];
    }
}

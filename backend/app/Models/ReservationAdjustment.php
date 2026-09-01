<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['reservation_id', 'type', 'description', 'quantity', 'unit_amount', 'total_amount', 'metadata', 'created_by_user_id'])]
class ReservationAdjustment extends Model
{
    protected function casts(): array
    {
        return ['quantity' => 'integer', 'unit_amount' => 'decimal:2', 'total_amount' => 'decimal:2', 'metadata' => 'array'];
    }
}

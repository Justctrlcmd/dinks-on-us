<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['reservation_id', 'rental_equipment_id', 'name', 'quantity', 'unit_amount', 'kind', 'is_active', 'added_by_user_id'])]
class ReservationEquipmentItem extends Model
{
    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    protected function casts(): array
    {
        return ['quantity' => 'integer', 'unit_amount' => 'decimal:2', 'is_active' => 'boolean'];
    }
}

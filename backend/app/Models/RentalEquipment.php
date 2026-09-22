<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['name', 'price', 'total_quantity', 'is_active'])]
class RentalEquipment extends Model
{
    use SoftDeletes;

    protected $table = 'rental_equipment';

    /** @param Builder<RentalEquipment> $query */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'total_quantity' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}

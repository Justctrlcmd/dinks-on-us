<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'court_configuration_id',
    'day_type',
    'start_hour',
    'end_hour',
    'price',
    'display_order',
])]
class CourtRatePeriod extends Model
{
    /**
     * @return BelongsTo<CourtConfiguration, $this>
     */
    public function configuration(): BelongsTo
    {
        return $this->belongsTo(CourtConfiguration::class, 'court_configuration_id');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'start_hour' => 'integer',
            'end_hour' => 'integer',
            'price' => 'decimal:2',
            'display_order' => 'integer',
        ];
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'opening_hour',
    'closing_hour',
    'included_players_per_court',
    'additional_player_price',
    'updated_by_user_id',
])]
class CourtConfiguration extends Model
{
    /**
     * @return HasMany<CourtRatePeriod, $this>
     */
    public function ratePeriods(): HasMany
    {
        return $this->hasMany(CourtRatePeriod::class)->orderBy('day_type')->orderBy('display_order');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'opening_hour' => 'integer',
            'closing_hour' => 'integer',
            'included_players_per_court' => 'integer',
            'additional_player_price' => 'decimal:2',
        ];
    }
}

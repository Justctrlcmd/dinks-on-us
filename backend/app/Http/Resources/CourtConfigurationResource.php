<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CourtConfigurationResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'opening_hour' => $this->opening_hour,
            'closing_hour' => $this->closing_hour,
            'included_players_per_court' => $this->included_players_per_court,
            'additional_player_price' => (float) $this->additional_player_price,
            'advance_booking_days' => $this->advance_booking_days,
            'weekday_rates' => RatePeriodResource::collection($this->ratePeriods->where('day_type', 'weekday')->values())->resolve($request),
            'weekend_rates' => RatePeriodResource::collection($this->ratePeriods->where('day_type', 'weekend')->values())->resolve($request),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

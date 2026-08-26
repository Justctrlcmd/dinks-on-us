<?php

namespace App\Http\Resources;

use App\Models\AvailabilityClosurePeriod;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AvailabilityClosureResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'date' => $this->date->toDateString(),
            'reason' => $this->reason,
            'court' => $this->court ? [
                'id' => $this->court->id,
                'name' => "Court {$this->court->court_number}",
            ] : null,
            'periods' => $this->periods->map(fn (AvailabilityClosurePeriod $period): array => [
                'start_hour' => $period->start_hour,
                'end_hour' => $period->end_hour,
            ])->values()->all(),
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

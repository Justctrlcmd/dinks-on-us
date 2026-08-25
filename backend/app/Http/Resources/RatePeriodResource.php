<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RatePeriodResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'start_hour' => $this->start_hour,
            'end_hour' => $this->end_hour,
            'price' => (float) $this->price,
        ];
    }
}

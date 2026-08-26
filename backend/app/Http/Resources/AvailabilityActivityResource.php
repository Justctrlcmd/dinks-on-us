<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AvailabilityActivityResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'action' => $this->action,
            'actor_name' => $this->user?->name ?? 'Management',
            'details' => $this->after ?? $this->before ?? [],
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}

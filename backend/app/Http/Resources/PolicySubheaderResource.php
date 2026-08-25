<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PolicySubheaderResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'policy_section_id' => $this->policy_section_id,
            'title' => $this->title,
            'sort_order' => $this->sort_order,
            'rules' => PolicyRuleResource::collection($this->whenLoaded('rules')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

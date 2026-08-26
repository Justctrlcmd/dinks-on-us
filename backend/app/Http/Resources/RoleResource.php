<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $registryOrder = array_flip(array_keys(config('access.modules', [])));
        $modules = $this->is_full_access
            ? array_keys(config('access.modules', []))
            : $this->modules
                ->pluck('module')
                ->sortBy(fn (string $module): int => $registryOrder[$module] ?? PHP_INT_MAX)
                ->values()
                ->all();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'is_protected' => $this->is_protected,
            'is_full_access' => $this->is_full_access,
            'modules' => $modules,
            'team_count' => $this->whenCounted('users'),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

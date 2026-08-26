<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'display_order'])]
class GalleryTab extends Model
{
    /**
     * @return HasMany<GalleryImage, $this>
     */
    public function images(): HasMany
    {
        return $this->hasMany(GalleryImage::class);
    }

    /** @param Builder<GalleryTab> $query */
    public function scopeInDisplayOrder(Builder $query): void
    {
        $query->orderBy('display_order')->orderBy('id');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['display_order' => 'integer'];
    }
}

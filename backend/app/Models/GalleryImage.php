<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['gallery_tab_id', 'image_path', 'alt_text', 'display_order', 'uploaded_by_user_id'])]
class GalleryImage extends Model
{
    /** @return BelongsTo<GalleryTab, $this> */
    public function tab(): BelongsTo
    {
        return $this->belongsTo(GalleryTab::class, 'gallery_tab_id');
    }

    /** @return BelongsTo<User, $this> */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }

    /** @param Builder<GalleryImage> $query */
    public function scopeInDisplayOrder(Builder $query): void
    {
        $query->orderBy('display_order')->orderBy('id');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'gallery_tab_id' => 'integer',
            'display_order' => 'integer',
            'uploaded_by_user_id' => 'integer',
        ];
    }
}

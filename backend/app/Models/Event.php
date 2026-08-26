<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['header', 'slug', 'description', 'image_path', 'event_date', 'status', 'published_at', 'created_by_user_id'])]
class Event extends Model
{
    use HasFactory;

    public const STATUS_DRAFT = 'DRAFT';

    public const STATUS_PUBLISHED = 'PUBLISHED';

    public const STATUS_ARCHIVED = 'ARCHIVED';

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /** @param Builder<Event> $query */
    public function scopePublished(Builder $query): void
    {
        $query->where('status', self::STATUS_PUBLISHED)->whereNotNull('published_at');
    }

    /** @param Builder<Event> $query */
    public function scopeActiveForManagement(Builder $query): void
    {
        $query->where('status', '!=', self::STATUS_ARCHIVED);
    }

    /** @param Builder<Event> $query */
    public function scopeNewestEventFirst(Builder $query): void
    {
        $query->orderByDesc('event_date')->orderByDesc('id');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'event_date' => 'date:Y-m-d',
            'published_at' => 'datetime',
        ];
    }
}

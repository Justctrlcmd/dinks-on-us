<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['question', 'answer', 'display_order', 'is_active'])]
class Faq extends Model
{
    use HasFactory;

    /**
     * @param  Builder<Faq>  $query
     */
    public function scopeInDisplayOrder(Builder $query): void
    {
        $query->orderBy('display_order')->orderBy('id');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'display_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['slug', 'name', 'sort_order'])]
class PolicySection extends Model
{
    /** @param Builder<PolicySection> $query */
    public function scopeInDisplayOrder(Builder $query): void
    {
        $query->orderBy('sort_order')->orderBy('id');
    }

    /** @return HasMany<PolicySubheader, $this> */
    public function subheaders(): HasMany
    {
        return $this->hasMany(PolicySubheader::class)->inDisplayOrder();
    }
}

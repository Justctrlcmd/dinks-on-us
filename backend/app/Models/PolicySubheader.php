<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['policy_section_id', 'title', 'sort_order'])]
class PolicySubheader extends Model
{
    /** @param Builder<PolicySubheader> $query */
    public function scopeInDisplayOrder(Builder $query): void
    {
        $query->orderBy('sort_order')->orderBy('id');
    }

    /** @return BelongsTo<PolicySection, $this> */
    public function section(): BelongsTo
    {
        return $this->belongsTo(PolicySection::class, 'policy_section_id');
    }

    /** @return HasMany<PolicyRule, $this> */
    public function rules(): HasMany
    {
        return $this->hasMany(PolicyRule::class)->inDisplayOrder();
    }
}

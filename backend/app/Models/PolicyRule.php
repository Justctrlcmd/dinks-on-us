<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['policy_subheader_id', 'content', 'sort_order'])]
class PolicyRule extends Model
{
    /** @param Builder<PolicyRule> $query */
    public function scopeInDisplayOrder(Builder $query): void
    {
        $query->orderBy('sort_order')->orderBy('id');
    }

    /** @return BelongsTo<PolicySubheader, $this> */
    public function subheader(): BelongsTo
    {
        return $this->belongsTo(PolicySubheader::class, 'policy_subheader_id');
    }
}

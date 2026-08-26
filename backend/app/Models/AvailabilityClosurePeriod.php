<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['availability_closure_id', 'start_hour', 'end_hour'])]
class AvailabilityClosurePeriod extends Model
{
    /** @return BelongsTo<AvailabilityClosure, $this> */
    public function closure(): BelongsTo
    {
        return $this->belongsTo(AvailabilityClosure::class, 'availability_closure_id');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'start_hour' => 'integer',
            'end_hour' => 'integer',
        ];
    }
}

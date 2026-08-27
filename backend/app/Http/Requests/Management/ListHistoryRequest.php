<?php

namespace App\Http\Requests\Management;

use App\Models\Reservation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListHistoryRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:180'],
            'status' => ['nullable', Rule::in(Reservation::FINAL_STATUSES)],
            'source' => ['nullable', Rule::in(['ONLINE', 'WALK_IN'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', Rule::in([10])],
        ];
    }
}

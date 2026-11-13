<?php

namespace App\Http\Requests\Management;

use App\Models\Reservation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListReservationsRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:180'],
            'search_by' => ['nullable', 'string', Rule::in(['all', 'reference_number'])],
            'booking_date' => ['nullable', 'date_format:Y-m-d'],
            'sort' => ['nullable', 'string', Rule::in(['booking_date', 'reference_number'])],
            'direction' => ['nullable', 'string', Rule::in(['asc', 'desc'])],
            'status' => ['nullable', Rule::in([...Reservation::OPERATIONAL_STATUSES, 'RESCHEDULED'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', Rule::in([10])],
        ];
    }
}

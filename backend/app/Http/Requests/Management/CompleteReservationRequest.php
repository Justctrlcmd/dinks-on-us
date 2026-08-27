<?php

namespace App\Http\Requests\Management;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CompleteReservationRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'payment_channel' => ['nullable', Rule::in(['CASH', 'EWALLET', 'BANK'])],
            'payment_reference_number' => ['nullable', 'string', 'max:180'],
            'payment_proof' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ];
    }
}

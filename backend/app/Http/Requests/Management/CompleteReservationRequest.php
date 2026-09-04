<?php

namespace App\Http\Requests\Management;

use App\Support\Security\ImageUploadRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CompleteReservationRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'payment_channel' => ['nullable', Rule::in(['CASH', 'EWALLET', 'BANK'])],
            'payment_reference_number' => [
                Rule::prohibitedIf(fn (): bool => ! in_array($this->input('payment_channel'), ['EWALLET', 'BANK'], true)),
                'nullable', 'string', 'max:180',
            ],
            'payment_proof' => [
                Rule::prohibitedIf(fn (): bool => ! in_array($this->input('payment_channel'), ['EWALLET', 'BANK'], true)),
                ...ImageUploadRules::optional(),
            ],
        ];
    }
}

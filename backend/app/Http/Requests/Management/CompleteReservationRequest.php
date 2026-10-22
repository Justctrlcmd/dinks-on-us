<?php

namespace App\Http\Requests\Management;

use App\Support\Security\ImageUploadRules;
use Illuminate\Validation\Rule;

class CompleteReservationRequest extends ReservationActionRequest
{
    protected bool $requiresRevision = true;

    public function rules(): array
    {
        return [
            ...parent::rules(),
            'quoted_amount' => ['required_with:idempotency_key', 'numeric', 'min:0', 'decimal:0,2'],
            'quoted_payment_amount' => ['required_with:idempotency_key', 'numeric', 'min:0', 'decimal:0,2'],
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

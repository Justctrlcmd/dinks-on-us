<?php

namespace App\Http\Requests\Management;

use App\Http\Requests\Concerns\NormalizesInput;
use Illuminate\Validation\Rule;

class RejectReservationRequest extends ReservationActionRequest
{
    use NormalizesInput;

    public const CONCERNS = ['INVALID_PAYMENT_PROOF', 'UNVERIFIABLE_REFERENCE', 'INCORRECT_AMOUNT', 'DUPLICATE_OR_SUSPICIOUS_PAYMENT', 'RESERVATION_INFORMATION_ISSUE', 'OTHER'];

    protected function prepareForValidation(): void
    {
        $this->merge(['reason' => $this->normalizedMultilineText($this->input('reason'))]);
    }

    public function rules(): array
    {
        return [...parent::rules(), 'concern' => ['required', Rule::in(self::CONCERNS)], 'reason' => ['required', 'string', 'max:1500']];
    }
}

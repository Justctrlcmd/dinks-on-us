<?php

namespace App\Http\Requests\Management;

use App\Http\Requests\Concerns\NormalizesInput;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class CancelReservationRequest extends ReservationActionRequest
{
    protected bool $requiresRevision = true;

    use NormalizesInput;

    protected function prepareForValidation(): void
    {
        $this->merge(['reason' => $this->normalizedMultilineText($this->input('reason'))]);
    }

    public function rules(): array
    {
        return [
            ...parent::rules(),
            'quoted_refund_amount' => ['required_with:idempotency_key', 'numeric', 'min:0', 'decimal:0,2'],
            'reason' => ['required', 'string', 'max:1500'],
            'refund_type' => ['required', Rule::in(['FULL', 'CUSTOM'])],
            'refund_amount' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($this->input('refund_type') === 'CUSTOM' && $this->input('refund_amount') === null) {
                $validator->errors()->add('refund_amount', 'Enter the custom refund amount.');
            }
        }];
    }
}

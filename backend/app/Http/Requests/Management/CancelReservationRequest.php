<?php

namespace App\Http\Requests\Management;

use App\Http\Requests\Concerns\NormalizesInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class CancelReservationRequest extends FormRequest
{
    use NormalizesInput;

    protected function prepareForValidation(): void
    {
        $this->merge(['reason' => $this->normalizedMultilineText($this->input('reason'))]);
    }

    public function rules(): array
    {
        return [
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

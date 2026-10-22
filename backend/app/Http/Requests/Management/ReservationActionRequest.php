<?php

namespace App\Http\Requests\Management;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReservationActionRequest extends FormRequest
{
    protected bool $requiresRevision = false;

    public function validationData(): array
    {
        return [...parent::validationData(), 'idempotency_key' => $this->header('Idempotency-Key')];
    }

    public function rules(): array
    {
        return [
            'idempotency_key' => ['nullable', 'string', 'min:16', 'max:100', 'regex:/^[A-Za-z0-9._~-]+$/'],
            'expected_revision' => [Rule::requiredIf($this->requiresRevision && $this->filledKey()), 'nullable', 'integer', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'quoted_amount.required_with' => 'Review the current amount before continuing.',
            'quoted_payment_amount.required_with' => 'Review the current payment amount before continuing.',
            'quoted_refund_amount.required_with' => 'Review the current refund before continuing.',
            'expected_revision.required' => 'Refresh this reservation before continuing.',
            'expected_revision.integer' => 'Refresh this reservation before continuing.',
            'expected_revision.min' => 'Refresh this reservation before continuing.',
            'idempotency_key.regex' => 'Refresh the page before submitting this request again.',
            'idempotency_key.min' => 'Refresh the page before submitting this request again.',
            'idempotency_key.max' => 'Refresh the page before submitting this request again.',
        ];
    }

    private function filledKey(): bool
    {
        return (string) $this->header('Idempotency-Key') !== '';
    }
}

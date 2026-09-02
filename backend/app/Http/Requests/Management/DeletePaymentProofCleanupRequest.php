<?php

namespace App\Http\Requests\Management;

class DeletePaymentProofCleanupRequest extends PaymentProofDateRangeRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'confirm' => ['accepted'],
            'current_password' => ['required', 'string', 'current_password:web'],
        ];
    }
}

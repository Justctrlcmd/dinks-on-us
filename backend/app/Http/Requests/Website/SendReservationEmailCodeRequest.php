<?php

namespace App\Http\Requests\Website;

use Illuminate\Foundation\Http\FormRequest;

class SendReservationEmailCodeRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge([
            'customer_email' => is_string($this->input('customer_email')) ? mb_strtolower(trim($this->input('customer_email'))) : $this->input('customer_email'),
        ]);
    }

    public function rules(): array
    {
        return [
            'customer_email' => ['required', 'email:rfc', 'max:180'],
            'checkout_key' => ['required', 'string', 'min:32', 'max:100', 'regex:/^[A-Za-z0-9._~-]+$/'],
        ];
    }
}

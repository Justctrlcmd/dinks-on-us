<?php

namespace App\Http\Requests\Management;

class UpdatePaymentMethodRequest extends StorePaymentMethodRequest
{
    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'qr_image' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ];
    }
}

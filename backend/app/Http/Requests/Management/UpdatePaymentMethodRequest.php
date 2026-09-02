<?php

namespace App\Http\Requests\Management;

use App\Support\Security\ImageUploadRules;

class UpdatePaymentMethodRequest extends StorePaymentMethodRequest
{
    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'qr_image' => ImageUploadRules::optional(),
        ];
    }
}

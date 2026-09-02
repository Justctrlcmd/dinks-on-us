<?php

namespace App\Http\Requests\Management;

use App\Support\Security\ImageUploadRules;

class UpdateEventRequest extends StoreEventRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'image' => ImageUploadRules::optional(),
        ];
    }
}

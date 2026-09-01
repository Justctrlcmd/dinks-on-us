<?php

namespace App\Http\Requests\Management;

use Illuminate\Foundation\Http\FormRequest;

class DeletePushSubscriptionRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'endpoint' => ['required', 'url', 'max:2048'],
        ];
    }
}

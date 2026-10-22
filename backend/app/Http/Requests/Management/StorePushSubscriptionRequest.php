<?php

namespace App\Http\Requests\Management;

use App\Rules\PushEndpoint;
use App\Rules\PushKey;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePushSubscriptionRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'endpoint' => ['bail', 'required', 'url:https', 'max:2048', new PushEndpoint],
            'keys' => ['required', 'array'],
            'keys.p256dh' => ['bail', 'required', 'string', 'max:255', new PushKey(65)],
            'keys.auth' => ['bail', 'required', 'string', 'max:255', new PushKey(16)],
            'content_encoding' => ['nullable', 'string', Rule::in(['aes128gcm', 'aesgcm'])],
            'expiration_time' => ['nullable', 'integer', 'min:0'],
        ];
    }
}

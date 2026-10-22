<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\Concerns\NormalizesInput;
use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    use NormalizesInput;

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => $this->normalizedEmail($this->input('email')),
        ]);
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        // An existing session is checked by the controller, without authenticating
        // submitted credentials again or switching to another account.
        if ($this->user('web')) {
            return [];
        }

        return [
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['email.email' => 'Please enter a valid email address.'];
    }
}

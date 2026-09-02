<?php

namespace App\Http\Requests\Management;

use App\Support\Security\PasswordRules;
use Illuminate\Foundation\Http\FormRequest;

class ResetStaffPasswordRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'password' => PasswordRules::create(),
            'current_password' => ['required', 'string', 'current_password:web'],
        ];
    }

    public function messages(): array
    {
        return ['password.min' => 'The password must contain at least 8 characters.'];
    }
}

<?php

namespace App\Http\Requests\Management;

use Illuminate\Foundation\Http\FormRequest;

class DeleteStaffRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string', 'current_password:web'],
        ];
    }
}

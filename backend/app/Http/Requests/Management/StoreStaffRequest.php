<?php

namespace App\Http\Requests\Management;

use App\Http\Requests\Concerns\NormalizesInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStaffRequest extends FormRequest
{
    use NormalizesInput;

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => $this->normalizedText($this->input('name')),
            'email' => $this->normalizedEmail($this->input('email')),
            'contact_number' => is_string($this->input('contact_number')) ? trim($this->input('contact_number')) : $this->input('contact_number'),
        ]);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'contact_number' => ['required', 'string', 'size:11', 'regex:/^09[0-9]{9}$/'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role_id' => [
                'required',
                'integer',
                Rule::exists('roles', 'id')->where(fn ($query) => $query->where('is_protected', false)->where('is_full_access', false)),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'A Team account with this email already exists.',
            'contact_number.size' => 'The contact number must contain exactly 11 digits.',
            'contact_number.regex' => 'The contact number must start with 09 and contain exactly 11 digits.',
            'password.min' => 'The password must contain at least 8 characters.',
            'role_id.exists' => 'Select an available Access profile.',
        ];
    }
}

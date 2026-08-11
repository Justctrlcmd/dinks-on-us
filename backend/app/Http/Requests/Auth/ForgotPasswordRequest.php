<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\Concerns\NormalizesInput;
use Illuminate\Foundation\Http\FormRequest;
use RomegaSoftware\LaravelSchemaGenerator\Attributes\ValidationSchema;

#[ValidationSchema]
class ForgotPasswordRequest extends FormRequest
{
    use NormalizesInput;

    protected function prepareForValidation(): void
    {
        $this->merge(['email' => $this->normalizedEmail($this->input('email'))]);
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return ['email' => ['required', 'email']];
    }
}

<?php

namespace App\Http\Requests\Management;

use App\Http\Requests\Concerns\NormalizesInput;
use App\Support\Security\ImageUploadRules;
use Illuminate\Foundation\Http\FormRequest;

class StorePaymentMethodRequest extends FormRequest
{
    use NormalizesInput;

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => $this->normalizedText($this->input('name')),
            'account_name' => $this->normalizedText($this->input('account_name')),
        ]);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'qr_image' => ImageUploadRules::required(),
            'account_name' => ['required', 'string', 'max:150'],
            'account_number' => ['required', 'string', 'max:100'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'qr_image.required' => 'Select a QR image.',
            'qr_image.image' => 'The QR image must be a valid image file.',
            'qr_image.mimes' => 'The QR image must be a JPG, PNG, or WebP file.',
            'qr_image.max' => 'The QR image must not be larger than 5 MB.',
        ];
    }
}

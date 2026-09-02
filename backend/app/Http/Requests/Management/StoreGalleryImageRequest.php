<?php

namespace App\Http\Requests\Management;

use App\Http\Requests\Concerns\NormalizesInput;
use App\Support\Security\ImageUploadRules;
use Illuminate\Foundation\Http\FormRequest;

class StoreGalleryImageRequest extends FormRequest
{
    use NormalizesInput;

    protected function prepareForValidation(): void
    {
        $this->merge(['alt_text' => $this->normalizedText($this->input('alt_text'))]);
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'gallery_tab_id' => ['required', 'integer', 'exists:gallery_tabs,id'],
            'alt_text' => ['required', 'string', 'max:500'],
            'image' => ImageUploadRules::required(),
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'gallery_tab_id.required' => 'Choose a gallery category.',
            'gallery_tab_id.exists' => 'The selected gallery category is no longer available.',
            'alt_text.required' => 'Describe what appears in the image.',
            'image.required' => 'Select a gallery image.',
            'image.image' => 'The gallery image must be a valid image file.',
            'image.mimes' => 'The gallery image must be a JPG, PNG, or WebP file.',
            'image.max' => 'The gallery image must not be larger than 5 MB.',
        ];
    }
}

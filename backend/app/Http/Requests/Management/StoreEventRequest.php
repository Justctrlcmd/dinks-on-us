<?php

namespace App\Http\Requests\Management;

use App\Http\Requests\Concerns\NormalizesInput;
use Illuminate\Foundation\Http\FormRequest;

class StoreEventRequest extends FormRequest
{
    use NormalizesInput;

    protected function prepareForValidation(): void
    {
        $this->merge([
            'header' => $this->normalizedText($this->input('header')),
            'description' => $this->normalizedMultilineText($this->input('description')),
        ]);
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'header' => ['required', 'string', 'max:200'],
            'description' => ['required', 'string', 'max:10000'],
            'event_date' => ['required', 'date_format:Y-m-d'],
            'image' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'image.required' => 'Select an event image.',
            'image.image' => 'The event image must be a valid image file.',
            'image.mimes' => 'The event image must be a JPG, PNG, or WebP file.',
            'image.max' => 'The event image must not be larger than 5 MB.',
            'event_date.date_format' => 'Choose a valid event date.',
        ];
    }
}

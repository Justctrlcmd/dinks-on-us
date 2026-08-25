<?php

namespace App\Http\Requests\Management;

use App\Http\Requests\Concerns\NormalizesInput;
use Illuminate\Foundation\Http\FormRequest;

class StorePolicySubheaderRequest extends FormRequest
{
    use NormalizesInput;

    protected function prepareForValidation(): void
    {
        $this->merge(['title' => $this->normalizedText($this->input('title'))]);
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return ['title' => ['required', 'string', 'max:255']];
    }
}

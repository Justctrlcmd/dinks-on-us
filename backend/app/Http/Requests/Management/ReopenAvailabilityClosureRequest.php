<?php

namespace App\Http\Requests\Management;

use App\Http\Requests\Concerns\NormalizesInput;
use Illuminate\Foundation\Http\FormRequest;

class ReopenAvailabilityClosureRequest extends FormRequest
{
    use NormalizesInput;

    protected function prepareForValidation(): void
    {
        $this->merge(['reason' => $this->normalizedMultilineText($this->input('reason'))]);
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'max:1000'],
        ];
    }
}

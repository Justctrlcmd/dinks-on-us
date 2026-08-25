<?php

namespace App\Http\Requests\Management;

use App\Http\Requests\Concerns\NormalizesInput;
use Illuminate\Foundation\Http\FormRequest;

class StorePolicyRuleRequest extends FormRequest
{
    use NormalizesInput;

    protected function prepareForValidation(): void
    {
        $this->merge(['content' => $this->normalizedMultilineText($this->input('content'))]);
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'policy_subheader_id' => ['required', 'integer', 'exists:policy_subheaders,id'],
            'content' => ['required', 'string', 'max:5000'],
        ];
    }
}

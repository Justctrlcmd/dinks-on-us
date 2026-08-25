<?php

namespace App\Http\Requests\Management;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePolicySubheaderOrderRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return ['ids' => ['required', 'array'], 'ids.*' => ['required', 'integer', 'distinct', 'exists:policy_subheaders,id']];
    }
}

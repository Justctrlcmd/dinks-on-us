<?php

namespace App\Http\Requests\Management;

use App\Http\Requests\Concerns\NormalizesInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRoleRequest extends FormRequest
{
    use NormalizesInput;

    protected function prepareForValidation(): void
    {
        $this->merge(['name' => $this->normalizedText($this->input('name'))]);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100', Rule::unique('roles', 'name')],
            'modules' => ['required', 'array', 'min:1'],
            'modules.*' => ['required', 'string', 'distinct', Rule::in(array_keys(config('access.modules', [])))],
        ];
    }

    public function messages(): array
    {
        return [
            'name.unique' => 'An Access profile with this name already exists.',
            'modules.min' => 'Select at least one module.',
            'modules.*.in' => 'One or more selected modules are not supported.',
        ];
    }
}

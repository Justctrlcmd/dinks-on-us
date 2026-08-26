<?php

namespace App\Http\Requests\Management;

use App\Models\Role as AccessRole;
use Illuminate\Validation\Rule;

class UpdateRoleRequest extends StoreRoleRequest
{
    public function rules(): array
    {
        $role = $this->route('role');

        return [
            'name' => ['required', 'string', 'max:100', Rule::unique('roles', 'name')->ignore($role instanceof AccessRole ? $role->id : null)],
            'modules' => ['required', 'array', 'min:1'],
            'modules.*' => ['required', 'string', 'distinct', Rule::in(array_keys(config('access.modules', [])))],
        ];
    }
}

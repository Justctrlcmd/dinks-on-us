<?php

namespace App\Http\Requests\Website;

class VerifyReservationEmailCodeRequest extends SendReservationEmailCodeRequest
{
    public function rules(): array
    {
        return [...parent::rules(), 'code' => ['required', 'string', 'regex:/^[0-9]{6}$/']];
    }
}

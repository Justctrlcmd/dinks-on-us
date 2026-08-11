<?php

namespace App\Http\Controllers\Api\V1\Account;

use App\Http\Controllers\Controller;
use App\Http\Requests\Account\UpdatePasswordRequest;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class PasswordController extends Controller
{
    use ApiResponse;

    public function update(UpdatePasswordRequest $request): JsonResponse
    {
        $request->user()->update([
            'password' => $request->validated('password'),
        ]);

        return $this->respondSuccess(message: 'Your password has been changed.');
    }
}

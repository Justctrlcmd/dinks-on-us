<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class LoginController extends Controller
{
    use ApiResponse;

    public function __invoke(LoginRequest $request): JsonResponse
    {
        $credentials = $request->safe()->only(['email', 'password']);

        if (! Auth::guard('web')->attempt($credentials, $request->boolean('remember'))) {
            return $this->respondFailure(
                'The email or password is incorrect.',
                'INVALID_CREDENTIALS',
                422,
                ['email' => ['The email or password is incorrect.']],
            );
        }

        $request->session()->regenerate();

        return $this->respondSuccess(
            UserResource::make($request->user())->resolve($request),
            'Welcome back.',
        );
    }
}

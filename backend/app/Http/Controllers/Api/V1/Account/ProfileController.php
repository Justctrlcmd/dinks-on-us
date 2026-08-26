<?php

namespace App\Http\Controllers\Api\V1\Account;

use App\Http\Controllers\Controller;
use App\Http\Requests\Account\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Traits\ApiResponse;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    use ApiResponse;

    public function show(Request $request): JsonResponse
    {
        $request->user()->load('role.modules');

        return $this->respondSuccess(
            UserResource::make($request->user())->resolve($request),
            'Profile retrieved.',
        );
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $emailChanged = $user->email !== $request->validated('email');

        $user->fill($request->validated());

        if ($emailChanged) {
            $user->email_verified_at = null;
        }

        $user->save();

        if ($emailChanged) {
            event(new Registered($user));
        }

        $user->load('role.modules');

        return $this->respondSuccess(
            UserResource::make($user)->resolve($request),
            'Your profile has been updated.',
        );
    }
}

<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CurrentUserController extends Controller
{
    use ApiResponse;

    public function __invoke(Request $request): JsonResponse
    {
        $request->user()->load('role');

        return $this->respondSuccess(
            UserResource::make($request->user())->resolve($request),
            'Authenticated user retrieved.',
        );
    }
}

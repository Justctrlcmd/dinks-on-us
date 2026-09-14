<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\AuditLog;
use App\Services\SecurityAuditService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class LoginController extends Controller
{
    use ApiResponse;

    public function __invoke(LoginRequest $request, SecurityAuditService $audit): JsonResponse
    {
        $credentials = [
            ...$request->safe()->only(['email', 'password']),
            'is_active' => true,
        ];

        if (! Auth::guard('web')->attempt($credentials, $request->boolean('remember'))) {
            return $this->respondFailure(
                'The email or password is incorrect.',
                'INVALID_CREDENTIALS',
                422,
                ['email' => ['The email or password is incorrect.']],
            );
        }

        $request->session()->regenerate();

        $request->user()->update(['last_login_at' => now()]);
        $request->user()->load('role.modules');
        $audit->record(AuditLog::LOGIN_SUCCEEDED, $request, $request->user(), $request->user(), module: 'SECURITY', targetLabel: 'Account session');

        return $this->respondSuccess(
            UserResource::make($request->user())->resolve($request),
            'Welcome back.',
        );
    }
}

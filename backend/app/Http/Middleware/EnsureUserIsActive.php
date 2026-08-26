<?php

namespace App\Http\Middleware;

use App\Traits\ApiResponse;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    use ApiResponse;

    public function handle(Request $request, Closure $next): Response|JsonResponse
    {
        if ($request->user()?->is_active) {
            return $next($request);
        }

        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return $this->respondFailure(
            'This account is inactive. Ask an authorized team member to reactivate it.',
            'ACCOUNT_INACTIVE',
            403,
        );
    }
}

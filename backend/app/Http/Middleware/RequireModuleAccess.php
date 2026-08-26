<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireModuleAccess
{
    public function handle(Request $request, Closure $next, string $module): Response
    {
        if (! $request->user()?->canAccessModule($module)) {
            throw new AuthorizationException;
        }

        return $next($request);
    }
}

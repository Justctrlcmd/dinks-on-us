<?php

use App\Exceptions\ReservationConflictException;
use App\Exceptions\ReservationEmailVerificationException;
use App\Http\Middleware\AddSecurityHeaders;
use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\RequireModuleAccess;
use App\Http\Middleware\TrustConfiguredProxies;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->trimStrings(except: ['checkout_key', 'code']);
        $middleware->api(append: [AddSecurityHeaders::class]);

        // Resolve cached configuration when the middleware runs, after bootstrap.
        $middleware->replace(TrustProxies::class, TrustConfiguredProxies::class);
        $middleware->trustHosts(at: static fn (): array => array_map(
            static fn (string $host): string => '^'.preg_quote($host, '/').'$',
            config('security.trusted_hosts', []),
        ), subdomains: false);

        $middleware->alias([
            'active' => EnsureUserIsActive::class,
            'module' => RequireModuleAccess::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );

        $apiFailure = static fn (
            string $message,
            string $code,
            int $status,
            ?array $errors = null,
            array $headers = [],
        ) => response()->json([
            'success' => false,
            'message' => $message,
            'code' => $code,
            'data' => null,
            'errors' => $errors,
            'meta' => null,
        ], $status, $headers);

        $exceptions->render(function (ValidationException $exception, Request $request) use ($apiFailure) {
            if (! $request->is('api/*')) {
                return null;
            }

            return $apiFailure(
                'The provided information is invalid.',
                'VALIDATION_FAILED',
                422,
                $exception->errors(),
            );
        });

        $exceptions->render(function (AuthenticationException $exception, Request $request) use ($apiFailure) {
            return $request->is('api/*')
                ? $apiFailure('Your session has expired. Please sign in again.', 'UNAUTHENTICATED', 401)
                : null;
        });

        $exceptions->render(function (AuthorizationException $exception, Request $request) use ($apiFailure) {
            return $request->is('api/*')
                ? $apiFailure("You don't have access to this action.", 'FORBIDDEN', 403)
                : null;
        });

        $exceptions->render(function (ModelNotFoundException $exception, Request $request) use ($apiFailure) {
            return $request->is('api/*')
                ? $apiFailure("We couldn't find this record.", 'NOT_FOUND', 404)
                : null;
        });

        $exceptions->render(function (ThrottleRequestsException $exception, Request $request) use ($apiFailure) {
            if (! $request->is('api/*')) {
                return null;
            }

            $retryAfter = max(1, (int) ($exception->getHeaders()['Retry-After'] ?? 60));

            return $apiFailure(
                $request->routeIs('public.reservation-email.send')
                    ? "Please wait {$retryAfter} seconds before requesting another verification code. Check your inbox and spam folder."
                    : "You've made several requests in a short time. Please try again shortly.",
                'TOO_MANY_REQUESTS',
                429,
                headers: ['Retry-After' => (string) $retryAfter],
            );
        });

        $exceptions->render(function (ReservationEmailVerificationException $exception, Request $request) use ($apiFailure) {
            return $request->is('api/*')
                ? $apiFailure($exception->getMessage(), $exception->apiCode, $exception->status, headers: $exception->retryAfter ? ['Retry-After' => (string) $exception->retryAfter] : [])
                : null;
        });

        $exceptions->render(function (ReservationConflictException $exception, Request $request) use ($apiFailure) {
            return $request->is('api/*')
                ? $apiFailure($exception->getMessage(), $exception->apiCode, 409)
                : null;
        });

        $exceptions->render(function (Throwable $exception, Request $request) use ($apiFailure) {
            if (! $request->is('api/*')) {
                return null;
            }

            $status = $exception instanceof HttpExceptionInterface ? $exception->getStatusCode() : 500;

            return match ($status) {
                401 => $apiFailure('Your session has expired. Please sign in again.', 'UNAUTHENTICATED', 401),
                403 => $apiFailure("You don't have access to this action.", 'FORBIDDEN', 403),
                404 => $apiFailure("We couldn't find this record.", 'NOT_FOUND', 404),
                405 => $apiFailure('This request method is not supported.', 'METHOD_NOT_ALLOWED', 405),
                409 => $apiFailure('This request conflicts with the current state of the record.', 'CONFLICT', 409),
                419 => $apiFailure('Your session has expired. Please refresh the page and try again.', 'CSRF_TOKEN_MISMATCH', 419),
                429 => $apiFailure("You've made several requests in a short time. Please try again shortly.", 'TOO_MANY_REQUESTS', 429),
                default => $apiFailure('Something went wrong while processing your request. Please try again.', 'SERVER_ERROR', 500),
            };
        });
    })->create();

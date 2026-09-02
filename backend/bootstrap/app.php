<?php

use App\Exceptions\ReservationConflictException;
use App\Http\Middleware\AddSecurityHeaders;
use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\RequireModuleAccess;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Exceptions\ThrottleRequestsException;
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
        $middleware->api(append: [AddSecurityHeaders::class]);

        $trustedProxies = array_values(array_filter(array_map(
            static fn (string $value): string => trim($value),
            explode(',', (string) env('TRUSTED_PROXIES', '')),
        )));
        if ($trustedProxies !== []) {
            $middleware->trustProxies(at: $trustedProxies);
        }

        $trustedHosts = array_values(array_filter(array_map(
            static fn (string $value): string => trim($value),
            explode(',', (string) env('TRUSTED_HOSTS', '')),
        )));
        if ($trustedHosts !== []) {
            $middleware->trustHosts(at: $trustedHosts, subdomains: false);
        }

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
        ) => response()->json([
            'success' => false,
            'message' => $message,
            'code' => $code,
            'data' => null,
            'errors' => $errors,
            'meta' => null,
        ], $status);

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
            return $request->is('api/*')
                ? $apiFailure("You've made several requests in a short time. Please try again shortly.", 'TOO_MANY_REQUESTS', 429)
                : null;
        });

        $exceptions->render(function (ReservationConflictException $exception, Request $request) use ($apiFailure) {
            return $request->is('api/*')
                ? $apiFailure($exception->getMessage(), 'RESERVATION_CONFLICT', 409)
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

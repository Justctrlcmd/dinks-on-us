<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Password::defaults(fn (): Password => Password::min(8));

        RateLimiter::for('login', function (Request $request) {
            $email = Str::transliterate(Str::lower(trim((string) $request->input('email'))));

            return [
                Limit::perMinute(config('security.rate_limits.login_account_per_minute'))->by('login-account|'.$email),
                Limit::perMinute(config('security.rate_limits.login_ip_per_minute'))->by('login-ip|'.$request->ip()),
            ];
        });

        RateLimiter::for('api', fn (Request $request): Limit => Limit::perMinute(
            config('security.rate_limits.api_per_minute'),
        )->by('api|'.$this->requestIdentity($request)));

        RateLimiter::for('authenticated', fn (Request $request): Limit => Limit::perMinute(
            config('security.rate_limits.authenticated_per_minute'),
        )->by('authenticated|'.$this->requestIdentity($request)));

        RateLimiter::for('management', fn (Request $request): Limit => Limit::perMinute(
            config('security.rate_limits.management_per_minute'),
        )->by('management|'.$this->requestIdentity($request)));

        RateLimiter::for('public-read', fn (Request $request): Limit => Limit::perMinute(
            config('security.rate_limits.public_read_per_minute'),
        )->by('public-read|'.$request->ip()));

        RateLimiter::for('reservation-options', fn (Request $request): Limit => Limit::perMinute(
            config('security.rate_limits.reservation_options_per_minute'),
        )->by('reservation-options|'.$request->ip()));

        RateLimiter::for('reservation-submit', function (Request $request): array {
            $identity = Str::lower(trim((string) $request->input('customer_email'))).'|'.trim((string) $request->input('customer_contact_number'));
            $fingerprint = hash_hmac('sha256', $identity, (string) config('app.key'));

            return [
                Limit::perMinute(config('security.rate_limits.reservation_submit_per_minute'))->by('reservation-submit-minute|'.$request->ip()),
                Limit::perHour(config('security.rate_limits.reservation_submit_per_hour'))->by('reservation-submit-hour|'.$request->ip()),
                Limit::perHour(config('security.rate_limits.reservation_identity_per_hour'))->by('reservation-submit-identity|'.$fingerprint),
            ];
        });

        foreach (['reports', 'uploads', 'proof-downloads', 'destructive', 'proof-cleanup'] as $limiter) {
            $configKey = str_replace('-', '_', $limiter).'_per_minute';
            RateLimiter::for($limiter, fn (Request $request): Limit => Limit::perMinute(
                config('security.rate_limits.'.$configKey),
            )->by($limiter.'|'.$this->requestIdentity($request)));
        }

        ResetPassword::createUrlUsing(function (User $user, string $token): string {
            $frontendUrl = rtrim((string) config('app.frontend_url'), '/');

            return $frontendUrl.'/reset-password?token='.urlencode($token).'&email='.urlencode($user->email);
        });
    }

    private function requestIdentity(Request $request): string
    {
        return $request->user()
            ? 'user:'.$request->user()->getAuthIdentifier()
            : 'ip:'.$request->ip();
    }
}

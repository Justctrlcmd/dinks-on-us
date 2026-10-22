<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
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

        Gate::define('manage-own-profile', fn (User $user): bool => $user->role?->is_full_access === true);

        RateLimiter::for('login', function (Request $request) {
            $inputEmail = $request->input('email');
            $email = Str::transliterate(Str::lower(trim(is_string($inputEmail) ? $inputEmail : '')));
            $fingerprint = hash_hmac('sha256', $email, (string) config('app.key'));

            return [
                Limit::perMinute(config('security.rate_limits.login_account_per_minute'))->by('login-account|'.$fingerprint),
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
            $email = $request->input('customer_email');
            $contact = $request->input('customer_contact_number');
            $identity = Str::lower(trim(is_string($email) ? $email : '')).'|'.trim(is_string($contact) ? $contact : '');
            $fingerprint = hash_hmac('sha256', $identity, (string) config('app.key'));

            return [
                Limit::perMinute(config('security.rate_limits.reservation_submit_per_minute'))->by('reservation-submit-minute|'.$request->ip()),
                Limit::perHour(config('security.rate_limits.reservation_submit_per_hour'))->by('reservation-submit-hour|'.$request->ip()),
                Limit::perHour(config('security.rate_limits.reservation_identity_per_hour'))->by('reservation-submit-identity|'.$fingerprint),
            ];
        });

        RateLimiter::for('reservation-email-send', function (Request $request): array {
            $inputEmail = $request->input('customer_email');
            $email = hash_hmac('sha256', is_string($inputEmail) ? Str::lower(trim($inputEmail)) : 'invalid', (string) config('app.key'));

            return [
                Limit::perMinute(1)->by('reservation-email-minute|'.$email),
                Limit::perHour(5)->by('reservation-email-hour|'.$email),
                Limit::perMinute(5)->by('reservation-email-ip-minute|'.$request->ip()),
                Limit::perHour(20)->by('reservation-email-ip-hour|'.$request->ip()),
            ];
        });
        RateLimiter::for('reservation-email-verify', function (Request $request): array {
            $inputKey = $request->input('checkout_key');
            $key = hash('sha256', is_string($inputKey) ? $inputKey : 'invalid');

            return [
                Limit::perMinute(10)->by('reservation-email-verify-key|'.$key),
                Limit::perMinute(30)->by('reservation-email-verify-ip|'.$request->ip()),
            ];
        });

        foreach (['reports', 'uploads', 'proof-downloads', 'destructive', 'proof-cleanup'] as $limiter) {
            $configKey = str_replace('-', '_', $limiter).'_per_minute';
            RateLimiter::for($limiter, fn (Request $request): Limit => Limit::perMinute(
                config('security.rate_limits.'.$configKey),
            )->by($limiter.'|'.$this->requestIdentity($request)));
        }

    }

    private function requestIdentity(Request $request): string
    {
        return $request->user()
            ? 'user:'.$request->user()->getAuthIdentifier()
            : 'ip:'.$request->ip();
    }
}

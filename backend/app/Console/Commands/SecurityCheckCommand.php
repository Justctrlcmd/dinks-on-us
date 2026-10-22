<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\ReservationEmailVerificationService;
use App\Support\ManagerCredentials;
use Illuminate\Console\Command;
use RuntimeException;

class SecurityCheckCommand extends Command
{
    protected $signature = 'security:check {--production : Enforce production-only requirements}';

    protected $description = 'Fail when application security configuration is unsafe for its environment';

    public function handle(): int
    {
        $production = $this->option('production') || app()->isProduction();
        $failures = [];
        $warnings = [];

        $this->require($failures, config('hashing.driver') === 'argon2id', 'HASH_DRIVER must be argon2id.');
        $this->require($failures, config('filesystems.disks.local.serve') === false, 'The private local disk must not expose a serving route.');
        $this->require($failures, config('session.http_only') === true, 'SESSION_HTTP_ONLY must be true.');
        foreach (config('security.rate_limits', []) as $name => $limit) {
            $this->require($failures, is_int($limit) && $limit > 0, "Security rate limit {$name} must be greater than zero.");
        }

        if ($production) {
            try {
                ManagerCredentials::configured(true);
            } catch (RuntimeException $exception) {
                $failures[] = $exception->getMessage();
            }
            $knownPasswordInUse = false;
            User::query()->where('is_active', true)->select(['id', 'password'])->chunkById(100, function ($users) use (&$knownPasswordInUse): bool {
                foreach ($users as $user) {
                    // Native verification also handles legacy bcrypt when the
                    // configured Laravel hasher has already become strict.
                    if (password_verify('DinksManager2026!', $user->password)) {
                        $knownPasswordInUse = true;

                        return false;
                    }
                }

                return true;
            });
            $this->require($failures, ! $knownPasswordInUse, 'An active account still uses the repository development password. Change it before production use.');
            $this->require($failures, (int) config('mail.mailers.smtp.timeout') > 0 && (int) config('mail.mailers.smtp.timeout') <= 30, 'MAIL_TIMEOUT must be between 1 and 30 seconds.');
            if (config('push.enabled')) {
                $this->require($failures, in_array(config('push.queue_connection'), ['database', 'redis'], true), 'PUSH_QUEUE_CONNECTION must use a durable database or redis queue.');
                $this->require($failures, filled(config('push.public_key')) && filled(config('push.private_key')), 'Push VAPID keys must be configured when push is enabled.');
            }
            if (config('reservations.emails_enabled')) {
                $this->require($failures, in_array(config('reservations.mail_queue_connection'), ['database', 'redis'], true), 'RESERVATION_MAIL_QUEUE_CONNECTION must use a durable database or redis queue.');
            }
            $this->require($failures, app(ReservationEmailVerificationService::class)->deliveryConfigured(), 'MAIL_MAILER must deliver reservation verification codes; log/array transports and non-delivering fallbacks are not allowed.');
            $this->require($failures, config('app.debug') === false, 'APP_DEBUG must be false.');
            $this->require($failures, is_string(config('app.key')) && config('app.key') !== '', 'APP_KEY must be configured.');
            $this->require($failures, str_starts_with((string) config('app.url'), 'https://'), 'APP_URL must use HTTPS.');
            $this->require($failures, str_starts_with((string) config('app.frontend_url'), 'https://'), 'FRONTEND_URL must use HTTPS.');
            $this->require($failures, config('session.secure') === true, 'SESSION_SECURE_COOKIE must be true.');
            $this->require($failures, in_array(config('session.same_site'), ['lax', 'strict'], true), 'SESSION_SAME_SITE must be lax or strict.');
            $this->require($failures, config('security.hsts_enabled') === true, 'SECURITY_HSTS_ENABLED must be true.');
            $this->require($failures, ! in_array('*', config('cors.allowed_origins', []), true), 'CORS must not allow every origin.');
            $this->require($failures, config('session.driver') === 'database', 'SESSION_DRIVER must be database so privileged changes can revoke sessions.');
            $this->require($failures, config('security.trusted_hosts', []) !== [], 'TRUSTED_HOSTS must list the production hosts.');
            $this->require($failures, ! array_intersect(['*', '**', '0.0.0.0/0', '::/0', 'REMOTE_ADDR'], config('security.trusted_proxies', [])), 'TRUSTED_PROXIES must not trust every client.');

            if (config('security.trusted_proxies', []) === []) {
                $warnings[] = 'TRUSTED_PROXIES is empty. Configure it when TLS terminates at a known proxy or load balancer.';
            }
            if (config('hashing.argon.verify') !== true) {
                $warnings[] = 'HASH_VERIFY is disabled for legacy bcrypt migration. Enable it after every user password has been upgraded to Argon2id.';
            }
        }

        foreach ($warnings as $warning) {
            $this->warn("WARN: {$warning}");
        }

        if ($failures !== []) {
            foreach ($failures as $failure) {
                $this->error("FAIL: {$failure}");
            }

            return self::FAILURE;
        }

        $this->info($production ? 'Production security configuration passed.' : 'Security configuration passed.');

        return self::SUCCESS;
    }

    /** @param list<string> $failures */
    private function require(array &$failures, bool $condition, string $message): void
    {
        if (! $condition) {
            $failures[] = $message;
        }
    }
}

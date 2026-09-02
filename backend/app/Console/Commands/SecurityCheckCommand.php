<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

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

<?php

namespace Tests\Feature;

use App\Http\Middleware\TrustConfiguredProxies;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Middleware\TrustHosts;
use Illuminate\Http\Request;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class SecurityConfigurationTest extends TestCase
{
    use RefreshDatabase;

    public function test_production_gate_detects_an_existing_known_password_even_when_environment_credentials_are_private(): void
    {
        config(['manager.default.email' => 'manager@example.com', 'manager.default.password' => 'PrivateTestPassword!']);
        User::factory()->create(['password' => 'DinksManager2026!']);
        $this->artisan('security:check', ['--production' => true])
            ->expectsOutputToContain('An active account still uses the repository development password')
            ->assertFailed();
    }

    public function test_host_and_proxy_configuration_survives_a_cached_bootstrap_without_environment_variables(): void
    {
        $cached = config()->all();
        $cached['security']['trusted_hosts'] = ['cached.example.com'];
        $cached['security']['trusted_proxies'] = ['127.0.0.1'];
        $path = tempnam(sys_get_temp_dir(), 'dinks-config-test-');
        try {
            file_put_contents($path, '<?php return '.var_export($cached, true).';');
            $script = <<<'PHP'
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$app->make(Illuminate\Contracts\Http\Kernel::class);
$hosts = $app->make(Illuminate\Http\Middleware\TrustHosts::class)->hosts();
if ($hosts !== ['^cached\.example\.com$']) { exit(2); }
$request = Illuminate\Http\Request::create('http://cached.example.com/api/v1/health', server: [
    'REMOTE_ADDR' => '127.0.0.1', 'HTTP_X_FORWARDED_FOR' => '203.0.113.15', 'HTTP_X_FORWARDED_PROTO' => 'https',
]);
$app->make(App\Http\Middleware\TrustConfiguredProxies::class)->handle($request, function ($request) {
    if ($request->ip() !== '203.0.113.15' || !$request->isSecure()) { exit(3); }
    return response('ok');
});
echo 'cached-security-ok';
PHP;
            $process = new Process([PHP_BINARY, '-r', $script], base_path(), [
                'APP_CONFIG_CACHE' => $path, 'TRUSTED_HOSTS' => false, 'TRUSTED_PROXIES' => false,
            ]);
            $process->run();
            $this->assertTrue($process->isSuccessful(), 'Cached security bootstrap failed: '.$process->getErrorOutput());
            $this->assertSame('cached-security-ok', $process->getOutput());
        } finally {
            unlink($path);
        }
    }

    public function test_production_check_accepts_the_configured_single_vps_settings(): void
    {
        config([
            'manager.default.email' => 'manager@example.com', 'manager.default.password' => 'PrivateTestPassword!',
            'mail.default' => 'smtp', 'mail.mailers.smtp.timeout' => 10,
            'app.debug' => false, 'app.url' => 'https://dinksonusph.com', 'app.frontend_url' => 'https://dinksonusph.com',
            'session.secure' => true, 'session.http_only' => true, 'session.same_site' => 'lax', 'session.driver' => 'database',
            'security.hsts_enabled' => true, 'security.trusted_hosts' => ['dinksonusph.com'], 'security.trusted_proxies' => [],
            'cors.allowed_origins' => ['https://dinksonusph.com'], 'hashing.argon.verify' => true,
            'push.enabled' => false, 'reservations.emails_enabled' => true, 'reservations.mail_queue_connection' => 'database',
        ]);
        $this->artisan('security:check', ['--production' => true])
            ->expectsOutput('Production security configuration passed.')->assertSuccessful();
    }

    public function test_trusted_hosts_use_literal_cached_configuration_values(): void
    {
        // Environment variables are deliberately not changed here.
        config(['security.trusted_hosts' => ['dinksonusph.com', 'www.dinksonusph.com']]);
        $hosts = app(TrustHosts::class)->hosts();
        $this->assertCount(2, $hosts);
        $this->assertSame(1, preg_match('/'.$hosts[0].'/i', 'dinksonusph.com'));
        $this->assertSame(0, preg_match('/'.$hosts[0].'/i', 'dinksonusphXcom'));
        $this->assertSame(0, preg_match('/'.$hosts[0].'/i', 'evil.dinksonusph.com'));
    }

    public function test_only_configured_proxy_addresses_can_supply_client_ip_and_scheme(): void
    {
        config(['security.trusted_proxies' => ['127.0.0.1']]);
        foreach (['127.0.0.1' => '203.0.113.12', '198.51.100.10' => '198.51.100.10'] as $peer => $expected) {
            $request = Request::create('http://dinksonusph.com/api/v1/health', server: [
                'REMOTE_ADDR' => $peer, 'HTTP_X_FORWARDED_FOR' => '203.0.113.12',
                'HTTP_X_FORWARDED_PROTO' => 'https', 'HTTP_X_FORWARDED_HOST' => 'attacker.test',
            ]);
            app(TrustConfiguredProxies::class)->handle($request, function (Request $request) use ($peer, $expected) {
                $this->assertSame($expected, $request->ip());
                $this->assertSame($peer === '127.0.0.1', $request->isSecure());
                $this->assertSame('dinksonusph.com', $request->host());

                return response('ok');
            });
        }
        Request::setTrustedProxies([], 0);
    }

    public function test_production_check_rejects_default_credentials_and_non_durable_push(): void
    {
        config(['manager.default.password' => 'DinksManager2026!', 'push.enabled' => true, 'push.queue_connection' => 'sync', 'security.trusted_proxies' => ['*']]);
        $this->artisan('security:check', ['--production' => true])
            ->expectsOutputToContain('Configure Manager credentials')
            ->expectsOutputToContain('PUSH_QUEUE_CONNECTION must use a durable')
            ->expectsOutputToContain('TRUSTED_PROXIES must not trust every client')
            ->assertFailed();
    }

    public function test_default_security_configuration_passes(): void
    {
        $this->artisan('security:check')
            ->expectsOutput('Security configuration passed.')
            ->assertSuccessful();
    }

    public function test_production_check_rejects_an_insecure_configuration(): void
    {
        config()->set([
            'app.debug' => true,
            'app.key' => null,
            'app.url' => 'http://example.test',
            'app.frontend_url' => 'http://example.test',
            'session.secure' => false,
            'session.driver' => 'file',
            'security.hsts_enabled' => false,
            'security.trusted_hosts' => [],
        ]);

        $this->artisan('security:check', ['--production' => true])
            ->expectsOutputToContain('FAIL: APP_DEBUG must be false.')
            ->expectsOutputToContain('FAIL: APP_KEY must be configured.')
            ->expectsOutputToContain('FAIL: MAIL_MAILER must deliver reservation verification codes')
            ->assertFailed();
    }
}

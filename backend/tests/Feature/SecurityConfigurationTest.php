<?php

namespace Tests\Feature;

use Tests\TestCase;

class SecurityConfigurationTest extends TestCase
{
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
            ->assertFailed();
    }
}

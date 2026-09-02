<?php

namespace Tests\Feature;

use Tests\TestCase;

class LocalCorsConfigurationTest extends TestCase
{
    public function test_local_frontend_ports_are_allowed_for_sanctum_requests(): void
    {
        $response = $this
            ->withHeaders([
                'Origin' => 'http://127.0.0.1:3001',
                'Access-Control-Request-Method' => 'GET',
            ])
            ->options('/sanctum/csrf-cookie');

        $response
            ->assertSuccessful()
            ->assertHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:3001')
            ->assertHeader('Access-Control-Allow-Credentials', 'true');
    }

    public function test_untrusted_origins_do_not_receive_cors_authorization(): void
    {
        $this->withHeaders([
            'Origin' => 'https://evil.example',
            'Access-Control-Request-Method' => 'POST',
            'Access-Control-Request-Headers' => 'Content-Type,X-XSRF-TOKEN',
        ])->options('/api/v1/login')
            ->assertHeaderMissing('Access-Control-Allow-Origin')
            ->assertHeaderMissing('Access-Control-Allow-Credentials');
    }
}

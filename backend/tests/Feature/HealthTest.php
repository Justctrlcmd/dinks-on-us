<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthTest extends TestCase
{
    public function test_health_endpoint_returns_the_safe_api_contract(): void
    {
        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertExactJson([
                'success' => true,
                'message' => 'Service is available.',
                'code' => null,
                'data' => ['status' => 'ok'],
                'errors' => null,
                'meta' => null,
            ]);
    }

    public function test_unknown_api_routes_use_a_safe_error_envelope(): void
    {
        $this->getJson('/api/v1/does-not-exist')
            ->assertNotFound()
            ->assertJson([
                'success' => false,
                'message' => "We couldn't find this record.",
                'code' => 'NOT_FOUND',
                'data' => null,
                'errors' => null,
                'meta' => null,
            ])
            ->assertJsonMissing(['exception'])
            ->assertJsonMissing(['trace']);
    }
}

<?php

namespace Tests\Feature;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PushSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_reservation_staff_can_register_a_device_subscription(): void
    {
        $user = User::factory()->create();
        $payload = [
            'endpoint' => 'https://push.example.test/subscription/abc',
            'keys' => ['p256dh' => 'public-key', 'auth' => 'auth-token'],
            'content_encoding' => 'aes128gcm',
        ];

        $this->actingAs($user)->postJson('/api/v1/management/push-subscriptions', $payload)
            ->assertCreated()
            ->assertJsonPath('data', null);

        $this->assertDatabaseHas('push_subscriptions', [
            'user_id' => $user->id,
            'endpoint_hash' => hash('sha256', $payload['endpoint']),
            'content_encoding' => 'aes128gcm',
        ]);
    }

    public function test_a_device_subscription_can_be_removed_for_the_current_user(): void
    {
        $user = User::factory()->create();
        $endpoint = 'https://push.example.test/subscription/abc';
        PushSubscription::query()->create([
            'user_id' => $user->id,
            'endpoint' => $endpoint,
            'endpoint_hash' => hash('sha256', $endpoint),
            'public_key' => 'public-key',
            'auth_token' => 'auth-token',
            'content_encoding' => 'aes128gcm',
        ]);

        $this->actingAs($user)->deleteJson('/api/v1/management/push-subscriptions', ['endpoint' => $endpoint])
            ->assertOk();

        $this->assertDatabaseMissing('push_subscriptions', ['endpoint_hash' => hash('sha256', $endpoint)]);
    }

    public function test_guests_cannot_register_a_device_subscription(): void
    {
        $this->postJson('/api/v1/management/push-subscriptions', [
            'endpoint' => 'https://push.example.test/subscription/abc',
            'keys' => ['p256dh' => 'public-key', 'auth' => 'auth-token'],
        ])->assertUnauthorized();
    }
}

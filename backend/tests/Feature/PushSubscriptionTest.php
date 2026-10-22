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
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/abc',
            'keys' => ['p256dh' => rtrim(strtr(base64_encode("\x04".str_repeat('x', 64)), '+/', '-_'), '='), 'auth' => rtrim(strtr(base64_encode(str_repeat('a', 16)), '+/', '-_'), '=')],
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

    public function test_internal_untrusted_and_redirect_like_endpoints_are_rejected(): void
    {
        $user = User::factory()->create();
        foreach ([
            'http://fcm.googleapis.com/fcm/send/abc', 'https://127.0.0.1/secret',
            'https://169.254.169.254/latest/meta-data/', 'https://[::1]/secret',
            'https://fcm.googleapis.com.attacker.test/send', 'https://attacker.test/send',
            'https://fcm.googleapis.com:8443/send', 'https://user@fcm.googleapis.com/send',
            'https://fcm.googleapis.com/send#fragment',
        ] as $endpoint) {
            $this->actingAs($user)->postJson('/api/v1/management/push-subscriptions', [
                'endpoint' => $endpoint, 'keys' => ['p256dh' => 'invalid', 'auth' => 'invalid'],
            ])->assertUnprocessable()->assertJsonValidationErrors('endpoint');
        }
        $this->assertDatabaseCount('push_subscriptions', 0);
    }

    public function test_invalid_encryption_keys_are_rejected_for_an_allowed_provider(): void
    {
        $this->actingAs(User::factory()->create())->postJson('/api/v1/management/push-subscriptions', [
            'endpoint' => 'https://web.push.apple.com/test',
            'keys' => ['p256dh' => 'invalid', 'auth' => 'invalid'],
        ])->assertUnprocessable()->assertJsonValidationErrors(['keys.p256dh', 'keys.auth']);
    }
}

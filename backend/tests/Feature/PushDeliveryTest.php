<?php

namespace Tests\Feature;

use App\Jobs\SendNewReservationPush;
use App\Models\PushSubscription;
use App\Models\Reservation;
use App\Models\User;
use App\Rules\PushEndpoint;
use App\Services\PushNotificationService;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Minishlink\WebPush\MessageSentReport;
use Minishlink\WebPush\WebPush;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class PushDeliveryTest extends TestCase
{
    use RefreshDatabase;

    private function reservation(): Reservation
    {
        return Reservation::query()->create([
            'source' => 'ONLINE', 'booking_date' => '2026-10-22', 'customer_name' => 'Test',
            'customer_email' => 'test@example.com', 'customer_contact_number' => '09123456789',
            'status' => Reservation::STATUS_PENDING, 'original_amount' => 500, 'final_amount' => 500, 'amount_paid' => 500,
        ]);
    }

    private function subscription(string $endpoint = 'https://fcm.googleapis.com/fcm/send/test'): PushSubscription
    {
        config(['push.enabled' => true, 'push.public_key' => 'configured', 'push.private_key' => 'configured']);

        return PushSubscription::query()->create([
            'user_id' => User::factory()->create()->id, 'endpoint' => $endpoint, 'endpoint_hash' => hash('sha256', $endpoint),
            'public_key' => 'public-key', 'auth_token' => 'auth-token', 'content_encoding' => 'aes128gcm',
        ]);
    }

    public function test_failed_subscriptions_are_dispatched_to_independent_durable_jobs(): void
    {
        Bus::fake();
        $subscription = $this->subscription();
        $subscription->update(['failed_at' => now()]);
        $reservation = $this->reservation();

        app(PushNotificationService::class)->notifyNewReservation($reservation);

        Bus::assertDispatched(SendNewReservationPush::class, fn ($job): bool => $job->reservationId === $reservation->id
            && $job->subscriptionId === $subscription->id && $job->connection === 'database' && $job->queue === 'push' && $job->afterCommit);
    }

    public function test_transient_failure_is_retried_and_success_clears_failure_state(): void
    {
        $subscription = $this->subscription();
        $reservation = $this->reservation();
        $webPush = Mockery::mock(WebPush::class);
        $webPush->shouldReceive('sendOneNotification')->once()->andReturn(new MessageSentReport(new Request('POST', $subscription->endpoint), new Response(503), false));
        $webPush->shouldReceive('sendOneNotification')->once()->andReturn(new MessageSentReport(new Request('POST', $subscription->endpoint), new Response(201)));
        $service = Mockery::mock(PushNotificationService::class)->makePartial()->shouldAllowMockingProtectedMethods();
        $service->shouldReceive('webPush')->twice()->andReturn($webPush);

        try {
            $service->notifyNewReservation($reservation, $subscription->id);
            $this->fail('A transient failure must reach the queue retry mechanism.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Push delivery failed.', $exception->getMessage());
        }
        $this->assertNotNull($subscription->fresh()->failed_at);
        $service->notifyNewReservation($reservation, $subscription->id);
        $this->assertNull($subscription->fresh()->failed_at);
        $this->assertNotNull($subscription->fresh()->last_used_at);
    }

    public function test_expired_subscriptions_are_removed_and_legacy_internal_urls_never_send(): void
    {
        $subscription = $this->subscription();
        $reservation = $this->reservation();
        $webPush = Mockery::mock(WebPush::class);
        $webPush->shouldReceive('sendOneNotification')->once()->andReturn(new MessageSentReport(new Request('POST', $subscription->endpoint), new Response(410)));
        $service = Mockery::mock(PushNotificationService::class)->makePartial()->shouldAllowMockingProtectedMethods();
        $service->shouldReceive('webPush')->once()->andReturn($webPush);
        $service->notifyNewReservation($reservation, $subscription->id);
        $this->assertDatabaseMissing('push_subscriptions', ['id' => $subscription->id]);

        $internal = $this->subscription('https://127.0.0.1/private');
        $service->notifyNewReservation($reservation, $internal->id);
        $this->assertNotNull($internal->fresh()->failed_at);
    }

    public function test_supported_vendor_hosts_require_an_exact_domain_boundary(): void
    {
        foreach (['https://web.push.apple.com/abc', 'https://updates.push.services.mozilla.com/wpush/v2/abc', 'https://wns2.notify.windows.com/abc'] as $url) {
            $this->assertTrue(PushEndpoint::allowed($url));
        }
        $this->assertFalse(PushEndpoint::allowed('https://push.apple.com.attacker.test/abc'));
        $this->assertFalse(PushEndpoint::allowed('https://notpush.apple.com/abc'));
    }
}

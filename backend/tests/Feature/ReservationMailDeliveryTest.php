<?php

namespace Tests\Feature;

use App\Jobs\SendReservationStatusMail;
use App\Mail\ReservationStatusMail;
use App\Models\Reservation;
use App\Services\ReservationMailDispatcher;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use RuntimeException;
use Tests\TestCase;

class ReservationMailDeliveryTest extends TestCase
{
    use RefreshDatabase;

    private function reservation(): Reservation
    {
        return Reservation::query()->create([
            'source' => 'ONLINE', 'booking_date' => '2026-10-22', 'customer_name' => 'Test',
            'customer_email' => 'test@example.com', 'customer_contact_number' => '09123456789',
            'status' => Reservation::STATUS_VERIFIED, 'original_amount' => 500, 'final_amount' => 500, 'amount_paid' => 500,
        ]);
    }

    public function test_database_worker_can_decrypt_and_deliver_the_queued_snapshot(): void
    {
        config(['reservations.emails_enabled' => true, 'reservations.mail_queue_connection' => 'database']);
        Mail::fake();
        $reservation = $this->reservation()->load('currentSlots.court', 'equipmentItems', 'adjustments', 'payments', 'refunds');
        Queue::connection('database')->push(new SendReservationStatusMail($reservation, 'verified'), '', 'mail');
        $payload = (string) DB::table('jobs')->value('payload');
        $this->assertStringNotContainsString($reservation->customer_email, $payload);
        $this->assertStringNotContainsString('customer_contact_number', $payload);

        $job = Queue::connection('database')->pop('mail');
        $this->assertNotNull($job);
        $job->fire();
        $job->delete();

        Mail::assertSent(ReservationStatusMail::class, fn ($mail): bool => $mail->reservation->id === $reservation->id && $mail->event === 'verified');
        $this->assertDatabaseCount('jobs', 0);
    }

    public function test_status_mail_uses_a_durable_job_with_an_event_time_snapshot(): void
    {
        config(['reservations.emails_enabled' => true, 'reservations.mail_queue_connection' => 'database']);
        Bus::fake();
        Mail::fake();
        $reservation = $this->reservation();
        app(ReservationMailDispatcher::class)->dispatch($reservation, 'verified');

        Bus::assertDispatched(SendReservationStatusMail::class, function (SendReservationStatusMail $job): bool {
            $this->assertSame('database', $job->connection);
            $this->assertSame('mail', $job->queue);
            $this->assertTrue($job->afterCommit);
            // A later database update must not rewrite an earlier email's data.
            $job->reservation->newQuery()->whereKey($job->reservation->id)->update(['customer_name' => 'Later name']);
            $restored = unserialize(serialize($job));
            $this->assertSame('Test', $restored->reservation->customer_name);
            $this->assertTrue($restored->reservation->relationLoaded('currentSlots'));
            $restored->handle();

            return true;
        });
        Mail::assertSent(ReservationStatusMail::class, fn ($mail): bool => $mail->reservation->customer_name === 'Test' && $mail->event === 'verified');
    }

    public function test_delivery_failures_reach_the_worker_without_exposing_provider_details(): void
    {
        config(['reservations.emails_enabled' => true]);
        Mail::shouldReceive('to')->once()->andReturnSelf();
        Mail::shouldReceive('send')->once()->andThrow(new RuntimeException('Secret provider credentials'));
        $job = new SendReservationStatusMail($this->reservation(), 'verified');

        try {
            $job->handle();
            $this->fail('The worker must receive delivery failures for retry.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Reservation status email delivery failed.', $exception->getMessage());
            $this->assertNull($exception->getPrevious());
        }
        $this->assertSame(3, $job->tries);
        $this->assertSame([30, 120], $job->backoff());
        $this->assertInstanceOf(ShouldBeEncrypted::class, $job);
    }
}

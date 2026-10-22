<?php

namespace Tests\Feature;

use App\Mail\ReservationEmailCodeMail;
use App\Models\Court;
use App\Models\CourtConfiguration;
use App\Models\PaymentMethod;
use App\Models\Reservation;
use App\Models\ReservationEmailVerification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

class ReservationEmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    private string $checkoutKey;

    private Court $court;

    private PaymentMethod $paymentMethod;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Storage::fake('local');
        $this->checkoutKey = (string) Str::uuid();
        $this->court = Court::query()->create(['court_number' => 1, 'is_active' => true]);
        $configuration = CourtConfiguration::query()->create(['opening_hour' => 7, 'closing_hour' => 22, 'included_players_per_court' => 4, 'additional_player_price' => 100]);
        foreach (['weekday', 'weekend'] as $dayType) {
            $configuration->ratePeriods()->create(['day_type' => $dayType, 'start_hour' => 7, 'end_hour' => 22, 'price' => 500, 'display_order' => 1]);
        }
        $this->paymentMethod = PaymentMethod::query()->create(['name' => 'GCash', 'account_name' => 'Dinks on Us', 'account_number' => '09123456789', 'qr_image_path' => 'qr.png', 'is_active' => true]);
    }

    private function emailInput(): array
    {
        return ['checkout_key' => $this->checkoutKey, 'customer_email' => 'player@example.com'];
    }

    private function sendCode(): string
    {
        $this->postJson('/api/v1/public/reservation-email/send', $this->emailInput())->assertOk();

        return Mail::sent(ReservationEmailCodeMail::class)->last()->code;
    }

    private function verifyCheckout(): void
    {
        $code = $this->sendCode();
        $this->postJson('/api/v1/public/reservation-email/verify', [...$this->emailInput(), 'code' => $code])->assertOk();
    }

    private function payload(int $hour = 9): array
    {
        return [
            ...$this->emailInput(), 'customer_name' => 'Player', 'customer_contact_number' => '09123456789',
            'slots' => [['court_id' => $this->court->id, 'date' => now('Asia/Manila')->addDay()->toDateString(), 'start_hour' => $hour]],
            'equipment' => [], 'additional_players' => 0, 'quoted_amount' => 500,
            'payment_method_id' => $this->paymentMethod->id, 'payment_reference_number' => 'TX-123',
            'payment_proof' => UploadedFile::fake()->image('receipt.jpg'), 'policy_acknowledged' => '1',
        ];
    }

    public function test_guest_verifies_email_before_creating_a_pending_reservation(): void
    {
        $this->verifyCheckout();
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('reservations', 0);
        $this->assertDatabaseCount('reservation_slot_locks', 0);
        $verification = ReservationEmailVerification::query()->sole();
        $this->assertNull($verification->code_hash);
        $this->assertNotNull($verification->verified_at);
        $this->assertStringNotContainsString($this->checkoutKey, $verification->toJson());
        $this->assertStringContainsString('does not hold court times', Mail::sent(ReservationEmailCodeMail::class)->first()->render());

        $this->post('/api/v1/public/reservations', $this->payload(), ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('data.status', 'PENDING');
        $reservation = Reservation::query()->sole();
        $this->assertNotNull($reservation->customer_email_verified_at);
        $this->assertNull($reservation->verified_at);
        $this->assertSame($reservation->id, $verification->fresh()->reservation_id);
    }

    public function test_submission_without_verification_or_with_another_email_is_rejected_before_storing_proof(): void
    {
        $this->post('/api/v1/public/reservations', $this->payload(), ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonPath('code', 'EMAIL_VERIFICATION_REQUIRED');
        $this->verifyCheckout();
        $this->post('/api/v1/public/reservations', [...$this->payload(), 'customer_email' => 'other@example.com'], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonPath('code', 'EMAIL_VERIFICATION_REQUIRED');
        $this->assertDatabaseCount('reservations', 0);
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_code_is_bound_to_checkout_and_email_and_is_single_use(): void
    {
        $code = $this->sendCode();
        foreach ([['checkout_key' => (string) Str::uuid()], ['customer_email' => 'other@example.com']] as $changes) {
            $this->postJson('/api/v1/public/reservation-email/verify', [...$this->emailInput(), ...$changes, 'code' => $code])->assertUnprocessable()->assertJsonPath('code', 'EMAIL_CODE_INVALID');
        }
        $this->postJson('/api/v1/public/reservation-email/verify', [...$this->emailInput(), 'code' => $code])->assertOk();
        $this->postJson('/api/v1/public/reservation-email/verify', [...$this->emailInput(), 'code' => $code])->assertUnprocessable()->assertJsonPath('code', 'EMAIL_CODE_EXPIRED');
    }

    public function test_incorrect_attempts_commit_and_disable_the_code(): void
    {
        $code = $this->sendCode();
        $wrong = $code === '000000' ? '111111' : '000000';
        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/v1/public/reservation-email/verify', [...$this->emailInput(), 'code' => $wrong])->assertUnprocessable();
            $this->assertSame($attempt, ReservationEmailVerification::query()->sole()->failed_attempts);
        }
        $this->postJson('/api/v1/public/reservation-email/verify', [...$this->emailInput(), 'code' => $code])->assertUnprocessable();
        $this->assertNull(ReservationEmailVerification::query()->sole()->verified_at);
    }

    public function test_expiry_is_enforced_for_codes_and_verified_checkouts(): void
    {
        $code = $this->sendCode();
        $this->travel(10)->minutes();
        $this->postJson('/api/v1/public/reservation-email/verify', [...$this->emailInput(), 'code' => $code])->assertUnprocessable()->assertJsonPath('code', 'EMAIL_CODE_EXPIRED');
        $this->verifyCheckout();
        $this->travel(30)->minutes();
        $this->post('/api/v1/public/reservations', $this->payload(), ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonPath('code', 'EMAIL_VERIFICATION_REQUIRED');
    }

    public function test_resend_is_throttled_and_replaces_the_previous_code(): void
    {
        $oldCode = $this->sendCode();
        $this->postJson('/api/v1/public/reservation-email/send', $this->emailInput())->assertTooManyRequests()->assertHeader('Retry-After');
        $this->travel(61)->seconds();
        $newCode = $this->sendCode();
        $this->postJson('/api/v1/public/reservation-email/verify', [...$this->emailInput(), 'code' => $oldCode])->assertUnprocessable();
        $this->postJson('/api/v1/public/reservation-email/verify', [...$this->emailInput(), 'code' => $newCode])->assertOk();
        Mail::assertSentCount(2);
    }

    public function test_changing_email_on_the_same_checkout_invalidates_the_old_code(): void
    {
        $oldCode = $this->sendCode();
        $this->travel(61)->seconds();
        $newInput = [...$this->emailInput(), 'customer_email' => 'new@example.com'];
        $this->postJson('/api/v1/public/reservation-email/send', $newInput)->assertOk();
        $this->postJson('/api/v1/public/reservation-email/verify', [...$this->emailInput(), 'code' => $oldCode])->assertUnprocessable();
        $this->postJson('/api/v1/public/reservation-email/verify', [...$newInput, 'code' => Mail::sent(ReservationEmailCodeMail::class)->last()->code])->assertOk();
    }

    public function test_failed_booking_keeps_verification_and_success_consumes_it_with_safe_retries(): void
    {
        $this->verifyCheckout();
        $this->post('/api/v1/public/reservations', [...$this->payload(), 'quoted_amount' => 1], ['Accept' => 'application/json'])->assertConflict();
        $this->assertNull(ReservationEmailVerification::query()->sole()->reservation_id);
        $this->assertSame([], Storage::disk('local')->allFiles());

        $headers = ['Accept' => 'application/json', 'Idempotency-Key' => 'booking-key'];
        $first = $this->post('/api/v1/public/reservations', $this->payload(), $headers)->assertCreated()->json('data.id');
        $this->travel(31)->minutes();
        $this->post('/api/v1/public/reservations', $this->payload(), $headers)->assertOk()->assertJsonPath('data.id', $first);
        $this->post('/api/v1/public/reservations', $this->payload(10), ['Accept' => 'application/json', 'Idempotency-Key' => 'different-key'])->assertUnprocessable()->assertJsonPath('code', 'EMAIL_VERIFICATION_REQUIRED');
        $this->assertDatabaseCount('reservations', 1);
        $this->assertDatabaseCount('reservation_payments', 1);
        $this->assertCount(1, Storage::disk('local')->allFiles());
    }

    public function test_a_different_verified_checkout_cannot_retrieve_an_existing_idempotent_booking(): void
    {
        $this->verifyCheckout();
        $headers = ['Accept' => 'application/json', 'Idempotency-Key' => 'booking-key'];
        $this->post('/api/v1/public/reservations', $this->payload(), $headers)->assertCreated();
        $this->checkoutKey = (string) Str::uuid();
        $this->travel(61)->seconds();
        $this->verifyCheckout();
        $this->post('/api/v1/public/reservations', $this->payload(), $headers)->assertUnprocessable()->assertJsonPath('code', 'EMAIL_VERIFICATION_REQUIRED');
    }

    public function test_delivery_failure_does_not_mark_email_verified_or_expose_provider_details(): void
    {
        Mail::shouldReceive('to')->once()->andReturnSelf();
        Mail::shouldReceive('send')->once()->andThrow(new RuntimeException('Private provider credentials'));
        $response = $this->postJson('/api/v1/public/reservation-email/send', $this->emailInput())->assertStatus(503)->assertJsonPath('code', 'EMAIL_DELIVERY_UNAVAILABLE');
        $this->assertStringNotContainsString('Private provider credentials', $response->getContent());
        $verification = ReservationEmailVerification::query()->sole();
        $this->assertNull($verification->code_hash);
        $this->assertNull($verification->verified_at);
        $this->assertTrue($verification->resend_available_at->isFuture());
        $response->assertHeader('Retry-After', '60');
    }

    public function test_slow_delivery_failure_returns_the_remaining_cooldown_and_retry_explains_the_wait(): void
    {
        $this->freezeTime();
        Mail::shouldReceive('to')->once()->andReturnSelf();
        Mail::shouldReceive('send')->once()->andReturnUsing(function (): void {
            $this->travel(15)->seconds();
            throw new RuntimeException('SMTP timed out.');
        });
        $this->postJson('/api/v1/public/reservation-email/send', $this->emailInput())
            ->assertStatus(503)->assertHeader('Retry-After', '45');
        $this->postJson('/api/v1/public/reservation-email/send', $this->emailInput())
            ->assertTooManyRequests()->assertHeader('Retry-After', '45')
            ->assertJsonPath('message', 'Please wait 45 seconds before requesting another verification code. Check your inbox and spam folder.');
        $this->assertNull(ReservationEmailVerification::query()->sole()->code_hash);
    }

    public function test_code_delivery_does_not_hold_an_additional_database_transaction(): void
    {
        $initialLevel = DB::transactionLevel();
        Mail::shouldReceive('to')->once()->andReturnSelf();
        Mail::shouldReceive('send')->once()->andReturnUsing(function () use ($initialLevel): void {
            $this->assertSame($initialLevel, DB::transactionLevel());
            $verification = ReservationEmailVerification::query()->sole();
            $this->assertNotNull($verification->code_hash);
            $this->assertTrue($verification->resend_available_at->isFuture());
        });
        $this->postJson('/api/v1/public/reservation-email/send', $this->emailInput())->assertOk();
    }

    public function test_non_delivering_mailers_are_rejected_in_production(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
        config(['mail.default' => 'log']);
        $this->postJson('/api/v1/public/reservation-email/send', $this->emailInput())->assertStatus(503)->assertJsonPath('code', 'EMAIL_DELIVERY_UNAVAILABLE');
        Mail::assertNothingSent();
    }

    public function test_invalid_email_checkout_key_and_code_are_validated(): void
    {
        $this->postJson('/api/v1/public/reservation-email/send', ['customer_email' => 'invalid', 'checkout_key' => 'short'])->assertUnprocessable()->assertJsonValidationErrors(['customer_email', 'checkout_key']);
        $this->postJson('/api/v1/public/reservation-email/verify', [...$this->emailInput(), 'code' => '12345x'])->assertUnprocessable()->assertJsonValidationErrors(['code']);
        Mail::assertNothingSent();
    }

    public function test_non_delivering_fallback_and_cyclic_mailers_are_rejected(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
        config(['mail.default' => 'failover']);
        $this->postJson('/api/v1/public/reservation-email/send', $this->emailInput())->assertStatus(503);
        config(['mail.mailers.failover.mailers' => ['failover']]);
        $this->travel(61)->seconds();
        $this->postJson('/api/v1/public/reservation-email/send', $this->emailInput())->assertStatus(503);
        Mail::assertNothingSent();
    }

    public function test_email_limits_apply_across_checkouts_and_cannot_be_reset_by_resending(): void
    {
        $this->sendCode();
        $this->checkoutKey = (string) Str::uuid();
        $this->postJson('/api/v1/public/reservation-email/send', [...$this->emailInput(), 'customer_email' => ' PLAYER@EXAMPLE.COM '])->assertTooManyRequests();
        for ($send = 2; $send <= 5; $send++) {
            $this->travel(61)->seconds();
            $this->sendCode();
        }
        $this->travel(61)->seconds();
        $this->postJson('/api/v1/public/reservation-email/send', $this->emailInput())->assertTooManyRequests();
        Mail::assertSentCount(5);
    }

    public function test_array_inputs_and_whitespace_in_secrets_are_not_accepted(): void
    {
        $this->postJson('/api/v1/public/reservation-email/send', ['customer_email' => ['invalid'], 'checkout_key' => ['invalid']])->assertUnprocessable();
        $this->postJson('/api/v1/public/reservation-email/verify', ['customer_email' => ['invalid'], 'checkout_key' => ['invalid'], 'code' => ['invalid']])->assertUnprocessable();
        $code = $this->sendCode();
        $this->postJson('/api/v1/public/reservation-email/verify', [...$this->emailInput(), 'code' => ' '.$code.' '])->assertUnprocessable()->assertJsonValidationErrors(['code']);
        $this->postJson('/api/v1/public/reservation-email/verify', [...$this->emailInput(), 'checkout_key' => ' '.$this->checkoutKey, 'code' => $code])->assertUnprocessable()->assertJsonValidationErrors(['checkout_key']);
    }

    public function test_demo_reset_removes_consumed_and_pending_verification_records_before_reservations(): void
    {
        Storage::fake('public');
        $this->verifyCheckout();
        $this->post('/api/v1/public/reservations', $this->payload(), ['Accept' => 'application/json'])->assertCreated();
        $this->checkoutKey = (string) Str::uuid();
        $this->travel(61)->seconds();
        $this->sendCode();
        $this->assertDatabaseCount('reservation_email_verifications', 2);
        $this->artisan('system:reset-demo --force')->assertSuccessful();
        $this->assertDatabaseCount('reservation_email_verifications', 0);
        $this->assertDatabaseCount('reservations', 0);
    }
}

<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_responses_include_security_headers_and_private_responses_are_not_cached(): void
    {
        $this->getJson('/api/v1/public/events')
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

        $this->actingAs(User::factory()->create())
            ->getJson('/api/v1/user')
            ->assertOk()
            ->assertHeader('Cache-Control', 'max-age=0, no-store, private');
    }

    public function test_login_is_rate_limited_per_account_without_disclosing_credentials(): void
    {
        $email = 'rate-limit-'.uniqid().'@example.test';
        User::factory()->create(['email' => $email]);

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/v1/login', [
                'email' => $email,
                'password' => 'wrong-password',
            ])->assertUnprocessable()->assertJsonPath('code', 'INVALID_CREDENTIALS');
        }

        $this->postJson('/api/v1/login', [
            'email' => $email,
            'password' => 'wrong-password',
        ])->assertTooManyRequests();
    }

    public function test_passwords_require_eight_characters_and_are_hashed_with_argon2id(): void
    {
        $manager = User::factory()->create();
        $role = Role::factory()->create(['is_protected' => false, 'is_full_access' => false]);

        $base = [
            'name' => 'Security Test',
            'email' => 'security-password@example.test',
            'contact_number' => '09123456789',
            'password_confirmation' => '1234567',
            'role_id' => $role->id,
        ];

        $this->actingAs($manager)->postJson('/api/v1/management/staff', [
            ...$base,
            'password' => '1234567',
        ])->assertUnprocessable()->assertJsonValidationErrors(['password']);

        $this->actingAs($manager)->postJson('/api/v1/management/staff', [
            ...$base,
            'email' => 'security-password-8@example.test',
            'password' => '12345678',
            'password_confirmation' => '12345678',
        ])->assertCreated();

        $user = User::query()->where('email', 'security-password-8@example.test')->firstOrFail();
        $this->assertSame('argon2id', password_get_info($user->password)['algoName']);
        $this->assertNotSame('12345678', $user->password);
    }

    public function test_image_upload_rejects_spoofed_content_and_reencodes_accepted_images(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $payload = [
            'header' => 'Security event',
            'description' => 'Upload validation.',
            'event_date' => '2026-09-10',
        ];

        $this->actingAs($user)->post('/api/v1/management/events', [
            ...$payload,
            'image' => UploadedFile::fake()->createWithContent('spoofed.jpg', '<script>alert(1)</script>'),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['image']);

        $this->actingAs($user)->post('/api/v1/management/events', [
            ...$payload,
            'image' => UploadedFile::fake()->image('valid.png', 1200, 800),
        ], ['Accept' => 'application/json'])->assertCreated();

        $event = Event::query()->firstOrFail();
        $this->assertStringEndsWith('.webp', $event->image_path);
        Storage::disk('public')->assertExists($event->image_path);
    }

    public function test_sql_injection_shaped_route_input_is_treated_as_data(): void
    {
        $this->getJson('/api/v1/public/events/%27%20OR%201%3D1--')
            ->assertNotFound()
            ->assertJsonPath('code', 'NOT_FOUND');

        $this->assertDatabaseCount('events', 0);
    }

    public function test_payment_proof_response_rejects_paths_outside_managed_private_storage(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('secret.webp', 'secret');
        $reservation = Reservation::query()->create([
            'source' => 'ONLINE',
            'booking_date' => '2026-09-01',
            'customer_name' => 'Security Test',
            'customer_email' => 'security@example.test',
            'customer_contact_number' => '09123456789',
            'status' => Reservation::STATUS_PENDING,
            'original_amount' => 100,
            'final_amount' => 100,
            'amount_paid' => 100,
        ]);
        $payment = ReservationPayment::query()->create([
            'reservation_id' => $reservation->id,
            'payment_method_name' => 'Test',
            'channel' => 'EWALLET',
            'kind' => 'INITIAL',
            'status' => 'VERIFIED',
            'amount' => 100,
            'reference_number' => 'SAFE-TEST',
            'proof_path' => 'reservation-payment-proofs/../secret.webp',
        ]);

        $this->actingAs(User::factory()->create())
            ->getJson("/api/v1/management/reservation-payments/{$payment->id}/proof")
            ->assertNotFound();
    }
}

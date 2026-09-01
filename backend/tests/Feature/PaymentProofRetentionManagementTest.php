<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PaymentProofRetentionManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->manager = User::factory()->create();
    }

    public function test_preview_is_inclusive_and_only_counts_finalized_proofs(): void
    {
        $completed = $this->createReservation('2026-08-01', Reservation::STATUS_COMPLETED);
        $this->createPayment($completed, 'reservation-payment-proofs/completed.webp', 'INITIAL', 120);
        $this->createPayment($completed, 'reservation-payment-proofs/add-on.webp', 'ADD_ON', 80);

        $cancelled = $this->createReservation('2026-08-31', Reservation::STATUS_CANCELLED);
        $this->createPayment($cancelled, 'reservation-payment-proofs/cancelled.webp', 'INITIAL', 60);

        $pending = $this->createReservation('2026-08-15', Reservation::STATUS_PENDING);
        $this->createPayment($pending, 'reservation-payment-proofs/pending.webp', 'INITIAL', 40);

        $missing = $this->createReservation('2026-08-16', Reservation::STATUS_COMPLETED);
        $missing->payments()->create([
            'payment_method_name' => 'GCash', 'channel' => 'EWALLET', 'kind' => 'INITIAL', 'status' => 'VERIFIED',
            'amount' => 50, 'reference_number' => 'MISSING-PREVIEW', 'proof_path' => 'reservation-payment-proofs/missing-preview.webp',
        ]);

        $alreadyDeleted = $this->createReservation('2026-08-17', Reservation::STATUS_COMPLETED);
        $alreadyDeleted->payments()->create([
            'payment_method_name' => 'GCash', 'channel' => 'EWALLET', 'kind' => 'INITIAL', 'status' => 'VERIFIED',
            'amount' => 50, 'reference_number' => 'DELETED-PREVIEW', 'proof_path' => null,
            'proof_deleted_at' => now(), 'proof_deleted_by_user_id' => $this->manager->id,
        ]);

        $response = $this->actingAs($this->manager)->getJson('/api/v1/management/payment-proof-retention/preview?from=2026-08-01&to=2026-08-31');

        $response->assertOk()
            ->assertJsonPath('data.from', '2026-08-01')
            ->assertJsonPath('data.to', '2026-08-31')
            ->assertJsonPath('data.reservations_affected', 2)
            ->assertJsonPath('data.proof_count', 3)
            ->assertJsonPath('data.reclaimable_bytes', 260)
            ->assertJsonPath('data.status_counts.COMPLETED', 2)
            ->assertJsonPath('data.status_counts.CANCELLED', 1)
            ->assertJsonMissingPath('data.missing_files')
            ->assertJsonMissing(['proof_path' => 'reservation-payment-proofs/completed.webp']);
    }

    public function test_cleanup_deletes_only_proof_files_and_preserves_business_records(): void
    {
        $reservation = $this->createReservation('2026-08-01', Reservation::STATUS_COMPLETED);
        $payment = $this->createPayment($reservation, 'reservation-payment-proofs/receipt.webp', 'INITIAL', 120);
        $paymentValues = $payment->only(['reservation_id', 'kind', 'status', 'amount', 'reference_number']);

        $response = $this->actingAs($this->manager)->postJson('/api/v1/management/payment-proof-retention/delete', [
            'from' => '2026-08-01',
            'to' => '2026-08-01',
            'confirm' => true,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.proofs_deleted', 1)
            ->assertJsonPath('data.reservations_affected', 1)
            ->assertJsonPath('data.reclaimed_bytes', 120)
            ->assertJsonPath('data.failed_files', 0)
            ->assertJsonPath('data.result', 'COMPLETED');

        Storage::disk('local')->assertMissing('reservation-payment-proofs/receipt.webp');
        $payment->refresh();
        $this->assertNull($payment->proof_path);
        $this->assertNotNull($payment->proof_deleted_at);
        $this->assertSame($this->manager->id, $payment->proof_deleted_by_user_id);
        $this->assertSame($paymentValues, $payment->only(array_keys($paymentValues)));
        $this->assertDatabaseHas('reservations', ['id' => $reservation->id, 'status' => Reservation::STATUS_COMPLETED]);
        $this->assertDatabaseCount('reservation_payments', 1);
        $this->assertDatabaseCount('audit_logs', 1);
        $this->actingAs($this->manager)
            ->getJson("/api/v1/management/history/{$reservation->id}")
            ->assertOk()
            ->assertJsonPath('data.payments.0.proof_url', null);
        $this->actingAs($this->manager)
            ->getJson("/api/v1/management/history-payments/{$payment->id}/proof")
            ->assertNotFound();
    }

    public function test_missing_files_are_cleared_without_being_counted_as_reclaimed_storage(): void
    {
        $reservation = $this->createReservation('2026-08-01', Reservation::STATUS_NO_SHOW);
        $payment = $reservation->payments()->create([
            'payment_method_name' => 'GCash', 'channel' => 'EWALLET', 'kind' => 'INITIAL', 'status' => 'VERIFIED',
            'amount' => 500, 'reference_number' => 'MISSING-1', 'proof_path' => 'reservation-payment-proofs/missing.webp',
        ]);

        $this->actingAs($this->manager)->postJson('/api/v1/management/payment-proof-retention/delete', [
            'from' => '2026-08-01', 'to' => '2026-08-01', 'confirm' => true,
        ])->assertOk()
            ->assertJsonPath('data.proofs_deleted', 0)
            ->assertJsonPath('data.missing_files', 1)
            ->assertJsonPath('data.reclaimed_bytes', 0);

        $this->assertDatabaseHas('reservation_payments', [
            'id' => $payment->id,
            'proof_path' => null,
            'proof_deleted_by_user_id' => $this->manager->id,
        ]);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_activity_is_aggregate_and_does_not_expose_private_payment_data(): void
    {
        $reservation = $this->createReservation('2026-08-01', Reservation::STATUS_COMPLETED);
        $this->createPayment($reservation, 'reservation-payment-proofs/receipt.webp', 'INITIAL', 40);

        $this->actingAs($this->manager)->postJson('/api/v1/management/payment-proof-retention/delete', [
            'from' => '2026-08-01', 'to' => '2026-08-01', 'confirm' => true,
        ])->assertOk();

        $this->actingAs($this->manager)->getJson('/api/v1/management/payment-proof-retention/activity')
            ->assertOk()
            ->assertJsonPath('data.0.action', AuditLog::PAYMENT_PROOFS_DELETED)
            ->assertJsonPath('data.0.actor_name', $this->manager->name)
            ->assertJsonPath('data.0.details.proofs_deleted', 1)
            ->assertJsonPath('data.0.details.reservations_affected', 1)
            ->assertJsonPath('data.0.details.result', 'COMPLETED')
            ->assertJsonMissing(['reference_number' => 'REF-1'])
            ->assertJsonMissing(['proof_path' => 'reservation-payment-proofs/receipt.webp'])
            ->assertJsonMissingPath('data.0.details.payment_ids');
    }

    public function test_cleanup_routes_require_dedicated_module_access(): void
    {
        $this->getJson('/api/v1/management/payment-proof-retention/activity')->assertUnauthorized();

        $role = Role::factory()->create(['is_full_access' => false]);
        $role->modules()->create(['module' => 'MANAGEMENT_PAYMENT_METHODS']);
        $staff = User::factory()->create(['role_id' => $role->id]);

        $this->actingAs($staff)->getJson('/api/v1/management/payment-proof-retention/activity')->assertForbidden();
        $this->actingAs($staff)->getJson('/api/v1/management/payment-proof-retention/preview?from=2026-08-01&to=2026-08-01')->assertForbidden();
    }

    public function test_cleanup_requires_valid_dates_and_explicit_confirmation(): void
    {
        $this->actingAs($this->manager)->getJson('/api/v1/management/payment-proof-retention/preview?from=2026-08-02&to=2026-08-01')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['to']);

        $this->actingAs($this->manager)->postJson('/api/v1/management/payment-proof-retention/delete', [
            'from' => '2026-08-01', 'to' => '2026-08-01', 'confirm' => false,
        ])->assertUnprocessable()->assertJsonValidationErrors(['confirm']);
    }

    public function test_cleanup_does_not_delete_paths_outside_the_managed_directory(): void
    {
        $reservation = $this->createReservation('2026-08-01', Reservation::STATUS_COMPLETED);
        $payment = $reservation->payments()->create([
            'payment_method_name' => 'GCash', 'channel' => 'EWALLET', 'kind' => 'INITIAL', 'status' => 'VERIFIED',
            'amount' => 500, 'reference_number' => 'UNSAFE-1', 'proof_path' => 'reservation-payment-proofs/../other-file.webp',
        ]);
        Storage::disk('local')->put('other-file.webp', 'must remain');

        $this->actingAs($this->manager)->postJson('/api/v1/management/payment-proof-retention/delete', [
            'from' => '2026-08-01', 'to' => '2026-08-01', 'confirm' => true,
        ])->assertOk()
            ->assertJsonPath('data.proofs_deleted', 0)
            ->assertJsonPath('data.failed_files', 1)
            ->assertJsonPath('data.result', 'PARTIAL');

        $this->assertDatabaseHas('reservation_payments', ['id' => $payment->id, 'proof_path' => 'reservation-payment-proofs/../other-file.webp']);
        Storage::disk('local')->assertExists('other-file.webp');
        $this->assertDatabaseCount('audit_logs', 0);
    }

    private function createReservation(string $date, string $status): Reservation
    {
        return Reservation::query()->create([
            'source' => 'ONLINE',
            'booking_date' => $date,
            'customer_name' => 'Test Customer',
            'customer_email' => 'customer@example.com',
            'customer_contact_number' => '09123456789',
            'status' => $status,
            'original_amount' => 500,
            'final_amount' => 500,
            'amount_paid' => 500,
        ]);
    }

    private function createPayment(Reservation $reservation, string $path, string $kind, int $bytes): ReservationPayment
    {
        Storage::disk('local')->put($path, str_repeat('x', $bytes));

        return $reservation->payments()->create([
            'payment_method_name' => 'GCash',
            'channel' => 'EWALLET',
            'kind' => $kind,
            'status' => 'VERIFIED',
            'amount' => $bytes,
            'reference_number' => 'REF-1',
            'proof_path' => $path,
        ]);
    }
}

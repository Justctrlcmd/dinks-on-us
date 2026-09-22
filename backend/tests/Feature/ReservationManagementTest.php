<?php

namespace Tests\Feature;

use App\Mail\ReservationStatusMail;
use App\Models\Court;
use App\Models\CourtConfiguration;
use App\Models\PaymentMethod;
use App\Models\RentalEquipment;
use App\Models\Reservation;
use App\Models\Role;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ReservationManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    private Court $court;

    private PaymentMethod $paymentMethod;

    private string $date;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        Mail::fake();
        $this->manager = User::factory()->create();
        $this->court = Court::query()->create(['court_number' => 1, 'is_active' => true]);
        $configuration = CourtConfiguration::query()->create([
            'opening_hour' => 7, 'closing_hour' => 22, 'included_players_per_court' => 4,
            'additional_player_price' => 100, 'updated_by_user_id' => $this->manager->id,
        ]);
        foreach (['weekday', 'weekend'] as $dayType) {
            $configuration->ratePeriods()->createMany([
                ['day_type' => $dayType, 'start_hour' => 7, 'end_hour' => 17, 'price' => 500, 'display_order' => 1],
                ['day_type' => $dayType, 'start_hour' => 17, 'end_hour' => 22, 'price' => 600, 'display_order' => 2],
            ]);
        }
        $this->paymentMethod = PaymentMethod::query()->create([
            'name' => 'GCash', 'qr_image_path' => 'payment-methods/gcash.png', 'account_name' => 'Dinks on Us',
            'account_number' => '09123456789', 'is_active' => true,
        ]);
        $this->date = now('Asia/Manila')->addDays(7)->toDateString();
    }

    private function submissionPayload(int $hour = 9): array
    {
        return [
            'customer_name' => 'Juan Dela Cruz', 'customer_email' => 'juan@example.com',
            'customer_contact_number' => '09123456789', 'slots' => [['court_id' => $this->court->id, 'date' => $this->date, 'start_hour' => $hour]],
            'equipment' => [], 'additional_players' => 1, 'payment_method_id' => $this->paymentMethod->id,
            'quoted_amount' => $hour >= 17 ? 700 : 600,
            'payment_reference_number' => 'PAY-123456', 'payment_proof' => UploadedFile::fake()->image('receipt.jpg'),
            'policy_acknowledged' => '1',
        ];
    }

    private function submit(int $hour = 9): array
    {
        return $this->post('/api/v1/public/reservations', $this->submissionPayload($hour))
            ->assertCreated()->assertJsonPath('data.status', 'PENDING')->json('data');
    }

    private function walkInPayload(int $hour = 12): array
    {
        return [
            'customer_name' => '  Maria Walk In  ',
            'customer_email' => 'MARIA.WALKIN@EXAMPLE.COM',
            'customer_contact_number' => '09171234567',
            'slots' => [['court_id' => $this->court->id, 'date' => $this->date, 'start_hour' => $hour]],
            'equipment' => [],
            'additional_players' => 2,
            'payment_channel' => 'CASH',
            'payment_reference_number' => null,
        ];
    }

    public function test_pending_stock_blocks_public_and_walk_in_submissions_until_rejected(): void
    {
        $equipment = RentalEquipment::query()->create(['name' => 'Ball', 'price' => 30, 'total_quantity' => 5, 'is_active' => true]);
        $input = $this->submissionPayload(10);
        $input['equipment'] = [['id' => $equipment->id, 'quantity' => 5]];
        $input['quoted_amount'] = 750;
        $created = $this->post('/api/v1/public/reservations', $input)->assertCreated()->json('data');
        $snapshot = $this->getJson("/api/v1/public/reservation-options?date={$this->date}")->assertOk()->json('data.equipment.0');
        $byHour = collect($snapshot['slot_availability'])->keyBy('start_hour');
        $this->assertSame(0, $byHour[10]['available_quantity']);
        $this->assertSame(5, $byHour[11]['available_quantity']);
        $this->getJson("/api/v1/public/reservation-options?date={$this->date}&hours[]=11")->assertOk()->assertJsonPath('data.equipment.0.available_quantity', 5);
        $this->getJson("/api/v1/public/reservation-options?date={$this->date}&hours[]=10&hours[]=11")->assertOk()->assertJsonPath('data.equipment.0.available_quantity', 0);
        $this->getJson("/api/v1/public/reservation-options?date={$this->date}&hours[]=24")->assertUnprocessable();
        $court = Court::query()->create(['court_number' => 2, 'is_active' => true]);
        $input['slots'][0]['court_id'] = $court->id;
        $input['equipment'][0]['quantity'] = 1;
        $input['quoted_amount'] = 630;
        $proofs = Storage::disk('local')->allFiles('payment-proofs');
        $this->post('/api/v1/public/reservations', $input)->assertConflict()
            ->assertJsonPath('code', 'RESERVATION_CONFLICT')
            ->assertJsonPath('message', 'Only 0 Ball are currently available for the selected schedule.');
        $this->actingAs($this->manager)->postJson('/api/v1/management/reservations/walk-in', [
            ...$this->walkInPayload(10), 'slots' => $input['slots'], 'equipment' => $input['equipment'],
        ])->assertConflict();
        $this->assertDatabaseCount('reservations', 1);
        $this->assertSame($proofs, Storage::disk('local')->allFiles('payment-proofs'));
        $this->postJson("/api/v1/management/reservations/{$created['id']}/reject", ['concern' => 'INVALID_PAYMENT_PROOF', 'reason' => 'Payment could not be verified.'])->assertOk();
        $this->post('/api/v1/public/reservations', $input)->assertCreated();
    }

    public function test_public_reservations_cannot_bypass_the_advance_booking_window(): void
    {
        $payload = $this->submissionPayload();
        $payload['slots'][0]['date'] = now('Asia/Manila')->addDays(31)->toDateString();

        $this->post('/api/v1/public/reservations', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['slots.0.date']);

        $this->assertDatabaseEmpty('reservations');
        $this->assertSame([], Storage::disk('local')->allFiles('payment-proofs'));
    }

    public function test_final_reservation_pricing_uses_the_friday_weekend_rate(): void
    {
        $configuration = CourtConfiguration::query()->firstOrFail();
        $configuration->ratePeriods()->where('day_type', 'weekday')->update(['price' => 500]);
        $configuration->ratePeriods()->where('day_type', 'weekend')->update(['price' => 700]);

        $friday = CarbonImmutable::parse($this->date)->next(CarbonImmutable::FRIDAY)->toDateString();
        $payload = $this->submissionPayload();
        $payload['slots'][0]['date'] = $friday;
        $payload['quoted_amount'] = 800;

        $reservation = $this->post('/api/v1/public/reservations', $payload)
            ->assertCreated()
            ->json('data');

        $this->assertSame(800.0, (float) $reservation['amounts']['original']);
        $this->assertSame(700.0, (float) $reservation['slots'][0]['amount']);
    }

    public function test_public_submission_rejects_a_stale_checkout_quote_without_creating_a_reservation(): void
    {
        $payload = $this->submissionPayload();
        $payload['quoted_amount'] = 500;

        $this->post('/api/v1/public/reservations', $payload)
            ->assertConflict()
            ->assertJsonPath('code', 'RESERVATION_CONFLICT')
            ->assertJsonPath('message', 'Reservation pricing changed while you were checking out. Review the updated total before paying and submitting again.');

        $this->assertDatabaseCount('reservations', 0);
        $this->assertSame([], Storage::disk('local')->allFiles('reservation-payment-proofs'));
    }

    public function test_rescheduling_and_extending_slots_revalidate_existing_equipment(): void
    {
        $equipment = RentalEquipment::query()->create(['name' => 'Ball', 'price' => 30, 'total_quantity' => 5, 'is_active' => true]);
        $input = $this->submissionPayload(10);
        $input['equipment'] = [['id' => $equipment->id, 'quantity' => 5]];
        $input['quoted_amount'] = 750;
        $first = $this->post('/api/v1/public/reservations', $input)->assertCreated()->json('data');
        $court = Court::query()->create(['court_number' => 2, 'is_active' => true]);
        $input['slots'][0] = ['court_id' => $court->id, 'date' => $this->date, 'start_hour' => 11];
        $this->post('/api/v1/public/reservations', $input)->assertCreated();
        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$first['id']}/verify")->assertOk();
        $replacement = [['court_id' => $this->court->id, 'date' => $this->date, 'start_hour' => 11]];
        $this->postJson("/api/v1/management/reservations/{$first['id']}/reschedule", ['slots' => $replacement])->assertConflict();
        $this->assertDatabaseHas('reservation_slot_locks', ['court_id' => $this->court->id, 'start_hour' => 10]);
        $this->assertDatabaseMissing('reservation_slot_locks', ['court_id' => $this->court->id, 'start_hour' => 11]);
        $this->assertDatabaseCount('reservation_schedule_histories', 0);
        $this->postJson("/api/v1/management/reservations/{$first['id']}/start")->assertOk();
        $this->postJson("/api/v1/management/reservations/{$first['id']}/add-ons", ['slots' => $replacement, 'payment_channel' => 'CASH'])->assertConflict();
        $this->assertDatabaseCount('reservation_adjustments', 0);
        $this->assertDatabaseMissing('reservation_slot_locks', ['court_id' => $this->court->id, 'start_hour' => 11]);
    }

    public function test_equipment_input_rejects_negative_duplicate_unknown_and_inactive_items(): void
    {
        $equipment = RentalEquipment::query()->create(['name' => 'Ball', 'price' => 30, 'total_quantity' => 5, 'is_active' => true]);
        $input = $this->walkInPayload();
        foreach ([
            [['id' => $equipment->id, 'quantity' => -1]],
            [['id' => $equipment->id, 'quantity' => 3], ['id' => $equipment->id, 'quantity' => 3]],
            [['id' => 999999, 'quantity' => 1]],
        ] as $selection) {
            $this->actingAs($this->manager)->postJson('/api/v1/management/reservations/walk-in', [...$input, 'equipment' => $selection])->assertUnprocessable();
        }
        $equipment->update(['is_active' => false]);
        $this->getJson("/api/v1/public/reservation-options?date={$this->date}")
            ->assertOk()
            ->assertJsonCount(0, 'data.equipment');
        $this->postJson('/api/v1/management/reservations/walk-in', [...$input, 'equipment' => [['id' => $equipment->id, 'quantity' => 1]]])->assertUnprocessable();
        $this->assertDatabaseCount('reservations', 0);
    }

    public function test_public_submission_persists_a_pending_reservation_and_locks_the_slot(): void
    {
        $reservation = $this->submit();
        $this->assertSame('RF-001', $reservation['reference_number']);
        $this->assertDatabaseHas('reservation_slot_locks', ['court_id' => $this->court->id, 'date' => $this->date, 'start_hour' => 9]);
        $proofPath = Reservation::query()->firstOrFail()->payments()->firstOrFail()->proof_path;
        Storage::disk('local')->assertExists($proofPath);
        $this->assertIsString($proofPath);
        $this->assertStringEndsWith('.webp', $proofPath);

        $this->getJson("/api/v1/public/reservation-options?date={$this->date}")
            ->assertOk()
            ->assertJsonFragment(['court_id' => $this->court->id, 'start_hour' => 9])
            ->assertJsonPath('data.reserved_slots.0.court_id', $this->court->id)
            ->assertJsonPath('data.reserved_slots.0.start_hour', 9);

        $this->post('/api/v1/public/reservations', $this->submissionPayload())
            ->assertConflict()
            ->assertJsonPath('code', 'RESERVATION_SLOTS_UNAVAILABLE')
            ->assertJsonPath('message', 'Some of your selected times were just booked. Please choose another available time.');
        $this->assertDatabaseCount('reservations', 1);
        Mail::assertNothingSent();
    }

    public function test_public_submission_is_idempotent_when_the_same_key_is_replayed(): void
    {
        $headers = ['Accept' => 'application/json', 'Idempotency-Key' => 'reservation-submit-001'];

        $this->post('/api/v1/public/reservations', $this->submissionPayload(), $headers)->assertCreated();
        $this->post('/api/v1/public/reservations', $this->submissionPayload(), $headers)
            ->assertOk()
            ->assertJsonPath('data.reference_number', 'RF-001');

        $this->assertDatabaseCount('reservations', 1);
    }

    public function test_pending_summary_returns_a_lightweight_count_and_latest_submission_marker(): void
    {
        $this->submit();

        $this->actingAs($this->manager)->getJson('/api/v1/management/reservations/pending-summary')
            ->assertOk()
            ->assertJsonPath('data.pending_count', 1)
            ->assertJsonPath('data.latest_online_submission_id', 1)
            ->assertJsonPath('data.latest_online_submission_at', fn ($value): bool => is_string($value));
    }

    public function test_public_submission_requires_an_eleven_digit_contact_number_starting_with_zero_nine(): void
    {
        foreach (['0912345678', '091234567890', '09A23456789', '+639123456789'] as $contactNumber) {
            $payload = $this->submissionPayload();
            $payload['customer_contact_number'] = $contactNumber;

            $this->post('/api/v1/public/reservations', $payload, ['Accept' => 'application/json'])
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['customer_contact_number']);
        }
    }

    public function test_walk_in_submission_requires_an_eleven_digit_contact_number_starting_with_zero_nine(): void
    {
        foreach (['0912345678', '091234567890', '09A23456789', '+639123456789'] as $contactNumber) {
            $payload = $this->walkInPayload();
            $payload['customer_contact_number'] = $contactNumber;

            $this->actingAs($this->manager)
                ->postJson('/api/v1/management/reservations/walk-in', $payload)
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['customer_contact_number']);
        }
    }

    public function test_customer_emails_are_sent_for_verification_rejection_rescheduling_and_cancellation(): void
    {
        config(['reservations.emails_enabled' => true]);

        $verified = $this->submit(9);
        Mail::assertNothingSent();

        $this->actingAs($this->manager)
            ->postJson("/api/v1/management/reservations/{$verified['id']}/verify")
            ->assertOk();

        Mail::assertSent(ReservationStatusMail::class, function (ReservationStatusMail $mail) use ($verified): bool {
            $html = $mail->render();

            return $mail->event === 'verified'
                && $mail->hasTo('juan@example.com')
                && $mail->envelope()->subject === "Reservation Verified — {$verified['reference_number']}"
                && str_contains($html, 'Your reservation is verified')
                && str_contains($html, 'your payment has been verified and your reservation is confirmed')
                && str_contains($html, $verified['reference_number']);
        });
        Mail::assertSent(ReservationStatusMail::class, 1);

        $this->actingAs($this->manager)
            ->postJson("/api/v1/management/reservations/{$verified['id']}/reschedule", [
                'slots' => [['court_id' => $this->court->id, 'date' => $this->date, 'start_hour' => 11]],
            ])
            ->assertOk();

        Mail::assertSent(ReservationStatusMail::class, function (ReservationStatusMail $mail) use ($verified): bool {
            $html = $mail->render();

            return $mail->event === 'rescheduled'
                && $mail->hasTo('juan@example.com')
                && $mail->envelope()->subject === "Reservation Rescheduled — {$verified['reference_number']}"
                && str_contains($html, 'Your reservation has been rescheduled')
                && str_contains($html, '11:00 AM – 12:00 PM')
                && str_contains($html, '>Court</div>')
                && str_contains($html, '>Price</div>')
                && str_contains($html, '>Date</div>')
                && str_contains($html, '>Time</div>')
                && str_contains($html, '1 Additional Player')
                && str_contains($html, 'Court rental')
                && str_contains($html, 'Reservation total')
                && str_contains($html, 'Amount paid')
                && str_contains($html, 'Payment status')
                && str_contains($html, 'Settled')
                && ! str_contains($html, 'Balance due')
                && ! str_contains($html, 'Original reservation subtotal')
                && ! str_contains($html, 'Current total')
                && str_contains($html, 'Follow us for more information')
                && str_contains($html, 'facebook.com/dinksonus')
                && ! str_contains($html, '<img')
                && ! str_contains($html, '9:00 AM – 10:00 AM');
        });
        Mail::assertSent(ReservationStatusMail::class, 2);

        $this->actingAs($this->manager)
            ->postJson("/api/v1/management/reservations/{$verified['id']}/cancel", [
                'reason' => 'Approved force majeure', 'refund_type' => 'FULL',
            ])
            ->assertOk();
        Mail::assertSent(ReservationStatusMail::class, function (ReservationStatusMail $mail) use ($verified): bool {
            $html = $mail->render();

            return $mail->event === 'cancelled'
                && $mail->hasTo('juan@example.com')
                && $mail->envelope()->subject === "Reservation Cancelled — {$verified['reference_number']}"
                && str_contains($html, 'Your reservation has been cancelled')
                && str_contains($html, 'Approved force majeure')
                && str_contains($html, 'Refunded amount')
                && str_contains($html, '₱600.00');
        });
        Mail::assertSent(ReservationStatusMail::class, 3);
        $this->assertDatabaseHas('reservation_refunds', [
            'reservation_id' => $verified['id'],
            'type' => 'CANCELLATION',
            'status' => 'COMPLETED',
            'amount' => 600,
        ]);

        $rejected = $this->submit(10);
        Mail::assertSent(ReservationStatusMail::class, 3);

        $this->actingAs($this->manager)
            ->postJson("/api/v1/management/reservations/{$rejected['id']}/reject", [
                'concern' => 'INVALID_PAYMENT_PROOF', 'reason' => 'Receipt cannot be read.',
            ])
            ->assertOk();

        Mail::assertSent(ReservationStatusMail::class, function (ReservationStatusMail $mail) use ($rejected): bool {
            $html = $mail->render();

            return $mail->event === 'rejected'
                && $mail->hasTo('juan@example.com')
                && $mail->envelope()->subject === "Reservation Not Approved — {$rejected['reference_number']}"
                && str_contains($html, 'Your reservation was not approved')
                && str_contains($html, 'Invalid Payment Proof')
                && str_contains($html, 'Receipt cannot be read.');
        });
        Mail::assertSent(ReservationStatusMail::class, 4);
    }

    public function test_reservation_status_email_groups_multiple_slots_for_one_court(): void
    {
        config(['reservations.emails_enabled' => true]);

        $payload = $this->submissionPayload(9);
        $secondCourt = Court::query()->create(['court_number' => 2, 'is_active' => true]);
        $payload['slots'] = [
            ['court_id' => $this->court->id, 'date' => $this->date, 'start_hour' => 9],
            ['court_id' => $this->court->id, 'date' => $this->date, 'start_hour' => 10],
            ['court_id' => $secondCourt->id, 'date' => $this->date, 'start_hour' => 9],
        ];
        $payload['quoted_amount'] = 1600;
        $reservation = $this->post('/api/v1/public/reservations', $payload)->assertCreated()->json('data');

        $this->actingAs($this->manager)
            ->postJson("/api/v1/management/reservations/{$reservation['id']}/verify")
            ->assertOk();

        Mail::assertSent(ReservationStatusMail::class, function (ReservationStatusMail $mail): bool {
            $html = $mail->render();

            return $mail->event === 'verified'
                && substr_count($html, '>Court 1</strong>') === 1
                && substr_count($html, '>Court 2</strong>') === 1
                && str_contains($html, '>Time slots (2)</div>')
                && str_contains($html, '9:00 AM – 10:00 AM')
                && str_contains($html, '10:00 AM – 11:00 AM')
                && str_contains($html, '>Court total</div>')
                && str_contains($html, '₱1,000.00')
                && str_contains($html, '₱1,500.00');
        });
    }

    public function test_completion_email_includes_recorded_add_ons_and_no_show_email_confirms_payment_is_non_refundable(): void
    {
        config(['reservations.emails_enabled' => true]);

        $completed = $this->submit(9);
        $equipment = RentalEquipment::query()->create(['name' => 'Ball', 'price' => 30, 'total_quantity' => 20, 'is_active' => true]);
        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$completed['id']}/verify")->assertOk();
        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$completed['id']}/start")->assertOk();
        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$completed['id']}/add-ons", [
            'additional_players' => 2,
            'equipment' => [['id' => $equipment->id, 'quantity' => 1]],
            'payment_channel' => 'CASH',
        ])->assertOk()->assertJsonPath('data.amounts.final', 830);
        Mail::assertSent(ReservationStatusMail::class, 1);

        $this->actingAs($this->manager)->post("/api/v1/management/reservations/{$completed['id']}/complete")
            ->assertOk()->assertJsonPath('data.status', 'COMPLETED');

        Mail::assertSent(ReservationStatusMail::class, function (ReservationStatusMail $mail) use ($completed): bool {
            $html = $mail->render();

            return $mail->event === 'completed'
                && $mail->hasTo('juan@example.com')
                && $mail->envelope()->subject === "Reservation Completed — {$completed['reference_number']}"
                && str_contains($html, 'Your reservation is complete')
                && str_contains($html, 'includes any recorded add-ons')
                && str_contains($html, '₱830.00')
                && str_contains($html, 'Payment status')
                && str_contains($html, 'Settled');
        });
        Mail::assertSent(ReservationStatusMail::class, 2);

        $noShow = $this->submit(10);
        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$noShow['id']}/verify")->assertOk();
        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$noShow['id']}/no-show")->assertOk()
            ->assertJsonPath('data.status', 'NO_SHOW');

        Mail::assertSent(ReservationStatusMail::class, function (ReservationStatusMail $mail) use ($noShow): bool {
            $html = $mail->render();

            return $mail->event === 'no_show'
                && $mail->hasTo('juan@example.com')
                && $mail->envelope()->subject === "Reservation No-show — {$noShow['reference_number']}"
                && str_contains($html, 'marked as a no-show')
                && str_contains($html, 'retained and is not refundable')
                && str_contains($html, 'Non-refundable amount retained')
                && str_contains($html, '₱600.00');
        });
        Mail::assertSent(ReservationStatusMail::class, 4);
    }

    public function test_rescheduled_email_labels_the_collected_balance_as_additional_payment_and_settled(): void
    {
        config(['reservations.emails_enabled' => true]);

        $created = $this->submit(9);
        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$created['id']}/verify")->assertOk();

        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$created['id']}/reschedule", [
            'slots' => [['court_id' => $this->court->id, 'date' => $this->date, 'start_hour' => 18]],
            'payment_channel' => 'CASH',
        ])->assertOk();

        Mail::assertSent(ReservationStatusMail::class, function (ReservationStatusMail $mail): bool {
            $html = $mail->render();

            return $mail->event === 'rescheduled'
                && str_contains($html, 'Additional payment')
                && str_contains($html, 'Payment status')
                && str_contains($html, 'Settled')
                && ! str_contains($html, 'Balance due');
        });
    }

    public function test_authorized_staff_can_create_a_verified_walk_in_with_a_configured_non_cash_method(): void
    {
        config(['reservations.emails_enabled' => true]);

        $equipment = RentalEquipment::query()->create([
            'name' => 'Paddle', 'price' => 50, 'total_quantity' => 10, 'is_active' => true,
        ]);
        $payload = $this->walkInPayload();
        $payload['equipment'] = [['id' => $equipment->id, 'quantity' => 2]];
        $payload['payment_channel'] = 'EWALLET_BANK';
        $payload['payment_method_id'] = $this->paymentMethod->id;
        $payload['payment_reference_number'] = 'BANK-9081';
        $payload['payment_proof'] = UploadedFile::fake()->image('walk-in-receipt.jpg');

        $response = $this->actingAs($this->manager)
            ->post('/api/v1/management/reservations/walk-in', $payload)
            ->assertCreated()
            ->assertJsonPath('data.source', 'WALK_IN')
            ->assertJsonPath('data.status', 'VERIFIED')
            ->assertJsonPath('data.customer.name', 'Maria Walk In')
            ->assertJsonPath('data.customer.email', 'maria.walkin@example.com')
            ->assertJsonPath('data.amounts.original', 800)
            ->assertJsonPath('data.amounts.paid', 800)
            ->assertJsonPath('data.amounts.outstanding', 0)
            ->assertJsonPath('data.payments.0.method', 'GCash')
            ->assertJsonPath('data.payments.0.reference_number', 'BANK-9081');

        $reservation = Reservation::query()->findOrFail($response->json('data.id'));
        $this->assertSame($this->manager->id, $reservation->created_by_user_id);
        $this->assertSame($this->manager->id, $reservation->verified_by_user_id);
        $this->assertDatabaseHas('reservation_slot_locks', [
            'court_id' => $this->court->id, 'date' => $this->date, 'start_hour' => 12,
        ]);
        $this->assertDatabaseHas('reservation_equipment_items', [
            'reservation_id' => $reservation->id, 'rental_equipment_id' => $equipment->id,
            'quantity' => 2, 'kind' => 'ORIGINAL',
        ]);
        $payment = $reservation->payments()->firstOrFail();
        $this->assertSame($this->paymentMethod->id, $payment->payment_method_id);
        $this->assertSame('GCash', $payment->payment_method_name);
        Storage::disk('local')->assertExists($payment->proof_path);
        Mail::assertSent(ReservationStatusMail::class, function (ReservationStatusMail $mail): bool {
            $html = $mail->render();

            return $mail->event === 'verified'
                && $mail->hasTo('maria.walkin@example.com')
                && str_contains($html, 'Your reservation is verified')
                && str_contains($html, '2 Paddle')
                && str_contains($html, '2 Additional Players')
                && str_contains($html, 'Court rental')
                && str_contains($html, 'Rental equipment')
                && str_contains($html, 'Reservation total')
                && str_contains($html, 'Amount paid')
                && ! str_contains($html, 'Original reservation subtotal')
                && ! str_contains($html, 'Current total')
                && ! str_contains($html, '<img');
        });
    }

    public function test_walk_in_cash_payment_allows_an_empty_reference_and_receipt(): void
    {
        $created = $this->actingAs($this->manager)
            ->postJson('/api/v1/management/reservations/walk-in', $this->walkInPayload(13))
            ->assertCreated()
            ->assertJsonPath('data.payments.0.method', 'Cash')
            ->assertJsonPath('data.payments.0.reference_number', null)
            ->assertJsonPath('data.payments.0.proof_url', null)
            ->json('data');

        $this->assertDatabaseHas('reservation_payments', [
            'reservation_id' => $created['id'], 'channel' => 'CASH', 'status' => 'VERIFIED',
            'payment_method_id' => null, 'payment_method_name' => 'Cash',
        ]);
    }

    public function test_walk_in_non_cash_payment_requires_an_active_method_reference_and_receipt(): void
    {
        $missingDetails = $this->walkInPayload(15);
        $missingDetails['payment_channel'] = 'EWALLET_BANK';
        unset($missingDetails['payment_reference_number']);

        $this->actingAs($this->manager)
            ->postJson('/api/v1/management/reservations/walk-in', $missingDetails)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payment_method_id', 'payment_reference_number', 'payment_proof']);

        $this->paymentMethod->update(['is_active' => false]);
        $inactiveMethod = $this->walkInPayload(15);
        $inactiveMethod['payment_channel'] = 'EWALLET_BANK';
        $inactiveMethod['payment_method_id'] = $this->paymentMethod->id;
        $inactiveMethod['payment_reference_number'] = 'GCASH-1001';
        $inactiveMethod['payment_proof'] = UploadedFile::fake()->image('inactive-method-receipt.jpg');

        $this->actingAs($this->manager)
            ->post('/api/v1/management/reservations/walk-in', $inactiveMethod)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payment_method_id']);

        $this->assertDatabaseCount('reservations', 0);
        $this->assertSame([], Storage::disk('local')->allFiles('reservation-payment-proofs'));
    }

    public function test_walk_in_creation_rejects_duplicate_or_already_reserved_slots_without_partial_writes(): void
    {
        $duplicate = $this->walkInPayload(14);
        $duplicate['slots'][] = $duplicate['slots'][0];
        $this->actingAs($this->manager)
            ->postJson('/api/v1/management/reservations/walk-in', $duplicate)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['slots']);
        $this->assertDatabaseCount('reservations', 0);

        $this->submit(14);
        $this->actingAs($this->manager)
            ->postJson('/api/v1/management/reservations/walk-in', $this->walkInPayload(14))
            ->assertConflict()
            ->assertJsonPath('code', 'RESERVATION_SLOTS_UNAVAILABLE');
        $this->assertDatabaseCount('reservations', 1);
    }

    public function test_walk_in_equipment_conflict_rolls_back_the_reservation_and_new_receipt(): void
    {
        $equipment = RentalEquipment::query()->create([
            'name' => 'Limited Paddle', 'price' => 50, 'total_quantity' => 2, 'is_active' => true,
        ]);
        $online = $this->submissionPayload(16);
        $online['equipment'] = [['id' => $equipment->id, 'quantity' => 2]];
        $online['quoted_amount'] = 700;
        $created = $this->post('/api/v1/public/reservations', $online)->assertCreated()->json('data');
        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$created['id']}/verify")->assertOk();
        $filesBefore = Storage::disk('local')->allFiles('reservation-payment-proofs');

        $secondCourt = Court::query()->create(['court_number' => 2, 'is_active' => true]);
        $walkIn = $this->walkInPayload(16);
        $walkIn['slots'][0]['court_id'] = $secondCourt->id;
        $walkIn['equipment'] = [['id' => $equipment->id, 'quantity' => 1]];
        $walkIn['payment_channel'] = 'EWALLET_BANK';
        $walkIn['payment_method_id'] = $this->paymentMethod->id;
        $walkIn['payment_reference_number'] = 'CONFLICT-RECEIPT-1';
        $walkIn['payment_proof'] = UploadedFile::fake()->image('conflicting-walk-in.jpg');
        $this->actingAs($this->manager)
            ->post('/api/v1/management/reservations/walk-in', $walkIn)
            ->assertConflict()
            ->assertJsonPath('code', 'RESERVATION_CONFLICT');

        $this->assertDatabaseCount('reservations', 1);
        $this->assertDatabaseCount('reservation_payments', 1);
        $this->assertSame($filesBefore, Storage::disk('local')->allFiles('reservation-payment-proofs'));
    }

    public function test_walk_in_creation_requires_reservation_access_and_a_supported_payment_mode(): void
    {
        $this->postJson('/api/v1/management/reservations/walk-in', $this->walkInPayload())->assertUnauthorized();

        $role = Role::factory()->create(['is_full_access' => false]);
        $staff = User::factory()->create(['role_id' => $role->id]);
        $this->actingAs($staff)
            ->postJson('/api/v1/management/reservations/walk-in', $this->walkInPayload())
            ->assertForbidden();

        $invalid = $this->walkInPayload();
        $invalid['payment_channel'] = 'BANK';
        $this->actingAs($this->manager)
            ->postJson('/api/v1/management/reservations/walk-in', $invalid)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payment_channel']);
    }

    public function test_submission_rejects_mixed_dates_and_payment_proof_requires_reservation_access(): void
    {
        $payload = $this->submissionPayload();
        $payload['slots'][] = ['court_id' => $this->court->id, 'date' => now('Asia/Manila')->addDays(8)->toDateString(), 'start_hour' => 10];
        $this->post('/api/v1/public/reservations', $payload)->assertUnprocessable()->assertJsonValidationErrors(['slots']);

        $created = $this->submit();
        $paymentId = Reservation::query()->findOrFail($created['id'])->payments()->firstOrFail()->id;
        $this->get("/api/v1/management/reservation-payments/{$paymentId}/proof")->assertUnauthorized();
        $this->actingAs($this->manager)->get("/api/v1/management/reservation-payments/{$paymentId}/proof")->assertOk();
    }

    public function test_verified_reservation_can_be_started_given_add_ons_and_completed_with_add_on_payment(): void
    {
        $created = $this->submit();
        $equipment = RentalEquipment::query()->create(['name' => 'Ball', 'price' => 30, 'total_quantity' => 20, 'is_active' => true]);
        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$created['id']}/verify")
            ->assertOk()->assertJsonPath('data.status', 'VERIFIED')->assertJsonPath('data.amounts.paid', 600);
        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$created['id']}/start")
            ->assertOk()->assertJsonPath('data.status', 'ONGOING');
        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$created['id']}/add-ons", ['additional_players' => 2, 'equipment' => [['id' => $equipment->id, 'quantity' => 1]], 'payment_channel' => 'CASH'])
            ->assertOk()->assertJsonPath('data.amounts.final', 830)->assertJsonPath('data.amounts.paid', 830)->assertJsonPath('data.amounts.outstanding', 0);
        $this->actingAs($this->manager)->post("/api/v1/management/reservations/{$created['id']}/complete")
            ->assertOk()->assertJsonPath('data.status', 'COMPLETED')->assertJsonPath('data.amounts.paid', 830);
        $this->assertDatabaseMissing('reservation_slot_locks', ['court_id' => $this->court->id, 'date' => $this->date, 'start_hour' => 9]);
        $this->assertDatabaseHas('reservation_equipment_items', ['reservation_id' => $created['id'], 'rental_equipment_id' => $equipment->id, 'quantity' => 1, 'kind' => 'ADD_ON']);
        $this->assertDatabaseHas('reservation_payments', ['reservation_id' => $created['id'], 'kind' => 'ADD_ON', 'channel' => 'CASH', 'amount' => 230]);
        $this->assertDatabaseMissing('reservation_payments', ['reservation_id' => $created['id'], 'kind' => 'SETTLEMENT']);
    }

    public function test_verified_reservation_can_receive_add_ons_only_on_its_booking_date(): void
    {
        $created = $this->submit(9);
        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$created['id']}/verify")->assertOk();

        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$created['id']}/add-ons", [
            'slots' => [['court_id' => $this->court->id, 'date' => now('Asia/Manila')->addDays(8)->toDateString(), 'start_hour' => 10]],
            'payment_channel' => 'CASH',
        ])->assertUnprocessable()->assertJsonPath('errors.slots.0', 'Additional court times must use the reservation booking date.');

        $response = $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$created['id']}/add-ons", [
            'slots' => [['court_id' => $this->court->id, 'date' => $this->date, 'start_hour' => 10]],
            'payment_channel' => 'CASH',
        ])->assertOk();

        $response->assertJsonPath('data.status', 'VERIFIED')
            ->assertJsonPath('data.amounts.final', 1100)
            ->assertJsonPath('data.amounts.paid', 1100)
            ->assertJsonPath('data.amounts.outstanding', 0);
        $this->assertDatabaseHas('reservation_slots', ['reservation_id' => $created['id'], 'kind' => 'ADD_ON', 'start_hour' => 10, 'is_current' => true]);
        $this->assertDatabaseHas('reservation_payments', ['reservation_id' => $created['id'], 'kind' => 'ADD_ON', 'channel' => 'CASH', 'amount' => 500]);
    }

    public function test_add_on_non_cash_payment_uses_a_configured_method_and_requires_evidence(): void
    {
        $created = $this->submit(17);
        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$created['id']}/verify")->assertOk();
        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$created['id']}/start")->assertOk();

        $missingDetails = [
            'additional_players' => 1,
            'payment_channel' => 'EWALLET_BANK',
        ];
        $this->actingAs($this->manager)
            ->postJson("/api/v1/management/reservations/{$created['id']}/add-ons", $missingDetails)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payment_method_id', 'payment_reference_number', 'payment_proof']);

        $payload = [
            'additional_players' => 1,
            'payment_channel' => 'EWALLET_BANK',
            'payment_method_id' => $this->paymentMethod->id,
            'payment_reference_number' => 'GCASH-ADDON-1',
            'payment_proof' => UploadedFile::fake()->image('add-on-receipt.jpg'),
        ];
        $response = $this->actingAs($this->manager)
            ->post("/api/v1/management/reservations/{$created['id']}/add-ons", $payload)
            ->assertOk()
            ->assertJsonPath('data.amounts.paid', 800)
            ->assertJsonPath('data.payments.1.method', 'GCash')
            ->assertJsonPath('data.payments.1.reference_number', 'GCASH-ADDON-1');

        $payment = Reservation::query()->findOrFail($response->json('data.id'))->payments()->where('kind', 'ADD_ON')->firstOrFail();
        $this->assertSame($this->paymentMethod->id, $payment->payment_method_id);
        $this->assertSame('GCash', $payment->payment_method_name);
        Storage::disk('local')->assertExists($payment->proof_path);
    }

    public function test_manager_can_reschedule_repeatedly_and_cheaper_slot_creates_credit(): void
    {
        $created = $this->submit(18);
        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$created['id']}/verify")->assertOk();

        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$created['id']}/reschedule", [
            'slots' => [['court_id' => $this->court->id, 'date' => $this->date, 'start_hour' => 9]],
        ])->assertOk()->assertJsonPath('data.display_status', 'RESCHEDULED')->assertJsonPath('data.amounts.refundable_credit', 100);

        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$created['id']}/reschedule", [
            'slots' => [['court_id' => $this->court->id, 'date' => $this->date, 'start_hour' => 18]],
        ])->assertOk()->assertJsonPath('data.reschedule_count', 2)->assertJsonPath('data.amounts.refundable_credit', 0);
        $this->assertDatabaseCount('reservation_schedule_histories', 2);
    }

    public function test_reschedule_moves_existing_add_on_court_slots_and_locks_to_the_new_date(): void
    {
        $created = $this->submit(9);
        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$created['id']}/verify")->assertOk();
        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$created['id']}/add-ons", [
            'slots' => [['court_id' => $this->court->id, 'date' => $this->date, 'start_hour' => 10]],
            'payment_channel' => 'CASH',
        ])->assertOk();

        $newDate = now('Asia/Manila')->addDays(8)->toDateString();
        $response = $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$created['id']}/reschedule", [
            'slots' => [['court_id' => $this->court->id, 'date' => $newDate, 'start_hour' => 9]],
        ])->assertOk();

        $response->assertJsonPath('data.booking_date', $newDate)
            ->assertJsonCount(2, 'data.slots');
        $this->assertDatabaseHas('reservation_slots', ['reservation_id' => $created['id'], 'date' => $this->date, 'start_hour' => 10, 'kind' => 'ADD_ON', 'is_current' => false]);
        $this->assertDatabaseHas('reservation_slots', ['reservation_id' => $created['id'], 'date' => $newDate, 'start_hour' => 10, 'kind' => 'ADD_ON', 'is_current' => true]);
        $this->assertDatabaseMissing('reservation_slot_locks', ['court_id' => $this->court->id, 'date' => $this->date, 'start_hour' => 10]);
        $this->assertDatabaseHas('reservation_slot_locks', ['court_id' => $this->court->id, 'date' => $newDate, 'start_hour' => 10]);
    }

    public function test_existing_credit_can_fully_cover_an_add_on_without_payment_details(): void
    {
        $created = $this->submit(18);
        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$created['id']}/verify")->assertOk();
        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$created['id']}/reschedule", [
            'slots' => [['court_id' => $this->court->id, 'date' => $this->date, 'start_hour' => 9]],
        ])->assertOk()->assertJsonPath('data.amounts.refundable_credit', 100);

        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$created['id']}/add-ons", [
            'additional_players' => 1,
        ])->assertOk()
            ->assertJsonPath('data.amounts.final', 700)
            ->assertJsonPath('data.amounts.paid', 700)
            ->assertJsonPath('data.amounts.refundable_credit', 0)
            ->assertJsonPath('data.amounts.outstanding', 0);

        $this->assertDatabaseMissing('reservation_payments', ['reservation_id' => $created['id'], 'kind' => 'ADD_ON']);
    }

    public function test_reschedule_records_full_outstanding_balance_and_add_ons_on_the_same_reservation(): void
    {
        $created = $this->submit(9);
        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$created['id']}/verify")->assertOk();

        $response = $this->actingAs($this->manager)->post("/api/v1/management/reservations/{$created['id']}/reschedule", [
            'slots' => [['court_id' => $this->court->id, 'date' => $this->date, 'start_hour' => 18]],
            'add_on_slots' => [['court_id' => $this->court->id, 'date' => $this->date, 'start_hour' => 17]],
            'additional_players' => 1,
            'payment_channel' => 'CASH',
        ])->assertOk();

        $response->assertJsonPath('data.amounts.original', 600)
            ->assertJsonPath('data.amounts.final', 1400)
            ->assertJsonPath('data.amounts.paid', 1400)
            ->assertJsonPath('data.amounts.outstanding', 0);
        $this->assertDatabaseHas('reservation_slots', ['reservation_id' => $created['id'], 'kind' => 'RESCHEDULED', 'start_hour' => 18, 'is_current' => true]);
        $this->assertDatabaseHas('reservation_slots', ['reservation_id' => $created['id'], 'kind' => 'ADD_ON', 'start_hour' => 17, 'is_current' => true]);
        $this->assertDatabaseHas('reservation_adjustments', ['reservation_id' => $created['id'], 'type' => 'RESCHEDULE_BALANCE', 'total_amount' => 100]);
        $this->assertDatabaseHas('reservation_adjustments', ['reservation_id' => $created['id'], 'type' => 'COURT_ADD_ON', 'total_amount' => 600]);
        $this->assertDatabaseHas('reservation_adjustments', ['reservation_id' => $created['id'], 'type' => 'ADDITIONAL_PLAYER', 'total_amount' => 100]);
        $this->assertDatabaseHas('reservation_payments', ['reservation_id' => $created['id'], 'kind' => 'RESCHEDULE', 'channel' => 'CASH', 'amount' => 800]);
    }

    public function test_reschedule_requires_transaction_number_and_proof_for_online_balance_payment(): void
    {
        $created = $this->submit(9);
        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$created['id']}/verify")->assertOk();

        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$created['id']}/reschedule", [
            'slots' => [['court_id' => $this->court->id, 'date' => $this->date, 'start_hour' => 18]],
            'payment_channel' => 'EWALLET_BANK',
        ])->assertUnprocessable()->assertJsonValidationErrors(['payment_method_id', 'payment_reference_number', 'payment_proof']);

        $this->actingAs($this->manager)->post("/api/v1/management/reservations/{$created['id']}/reschedule", [
            'slots' => [['court_id' => $this->court->id, 'date' => $this->date, 'start_hour' => 18]],
            'payment_channel' => 'EWALLET_BANK',
            'payment_method_id' => $this->paymentMethod->id,
            'payment_reference_number' => 'RESCHEDULE-100',
            'payment_proof' => UploadedFile::fake()->image('reschedule-receipt.jpg'),
        ])->assertOk()->assertJsonPath('data.amounts.outstanding', 0);

        $payment = Reservation::query()->findOrFail($created['id'])->payments()->where('kind', 'RESCHEDULE')->firstOrFail();
        $this->assertSame('RESCHEDULE-100', $payment->reference_number);
        Storage::disk('local')->assertExists($payment->proof_path);
    }

    public function test_reschedule_collects_an_existing_unpaid_balance_even_when_the_slot_price_is_unchanged(): void
    {
        $created = $this->submit(9);
        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$created['id']}/verify")->assertOk();
        Reservation::query()->whereKey($created['id'])->update(['amount_paid' => 300]);

        $this->actingAs($this->manager)->post("/api/v1/management/reservations/{$created['id']}/reschedule", [
            'slots' => [['court_id' => $this->court->id, 'date' => $this->date, 'start_hour' => 9]],
            'payment_channel' => 'CASH',
        ])->assertOk()->assertJsonPath('data.amounts.paid', 600)->assertJsonPath('data.amounts.outstanding', 0);

        $this->assertDatabaseHas('reservation_payments', ['reservation_id' => $created['id'], 'kind' => 'RESCHEDULE', 'amount' => 300]);
    }

    public function test_reschedule_and_cancellation_are_manager_only_and_custom_refund_is_capped(): void
    {
        $created = $this->submit();
        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$created['id']}/verify")->assertOk();

        $role = Role::factory()->create(['is_full_access' => false]);
        $role->modules()->create(['module' => 'RESERVATION']);
        $staff = User::factory()->create(['role_id' => $role->id]);
        $this->actingAs($staff)->postJson("/api/v1/management/reservations/{$created['id']}/reschedule", [
            'slots' => [['court_id' => $this->court->id, 'date' => $this->date, 'start_hour' => 10]],
        ])->assertForbidden();
        $this->actingAs($staff)->postJson("/api/v1/management/reservations/{$created['id']}/cancel", ['reason' => 'Typhoon', 'refund_type' => 'FULL'])->assertForbidden();

        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$created['id']}/cancel", [
            'reason' => 'Approved force majeure', 'refund_type' => 'CUSTOM', 'refund_amount' => 500,
        ])->assertOk()->assertJsonPath('data.status', 'CANCELLED')->assertJsonPath('data.refunds.0.amount', 500);
    }

    public function test_finalized_reservations_move_from_operations_into_read_only_history(): void
    {
        $noShow = $this->submit();
        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$noShow['id']}/verify")->assertOk();
        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$noShow['id']}/no-show")
            ->assertOk()->assertJsonPath('data.status', 'NO_SHOW')->assertJsonPath('data.amounts.paid', 600);

        $pending = $this->submit(10);
        $this->actingAs($this->manager)->postJson("/api/v1/management/reservations/{$pending['id']}/reject", [
            'concern' => 'INVALID_PAYMENT_PROOF', 'reason' => 'Receipt cannot be read.',
        ])->assertOk()->assertJsonPath('data.status', 'REJECTED');
        $this->assertDatabaseMissing('reservation_slot_locks', ['court_id' => $this->court->id, 'date' => $this->date, 'start_hour' => 10]);

        $pending = $this->submit(11);

        $this->actingAs($this->manager)->getJson('/api/v1/management/reservations')
            ->assertOk()->assertJsonCount(1, 'data.reservations')->assertJsonPath('data.reservations.0.status', 'PENDING');
        $this->actingAs($this->manager)->getJson('/api/v1/management/reservations?status=NO_SHOW')->assertUnprocessable();

        $this->actingAs($this->manager)->getJson('/api/v1/management/history')
            ->assertOk()
            ->assertJsonCount(2, 'data.reservations')
            ->assertJsonPath('data.kpis.completed', 0)
            ->assertJsonPath('data.kpis.cancelled', 0)
            ->assertJsonPath('data.kpis.rejected', 1)
            ->assertJsonPath('data.kpis.no_show', 1);
        $this->actingAs($this->manager)->getJson('/api/v1/management/history?status=NO_SHOW&source=ONLINE')
            ->assertOk()->assertJsonCount(1, 'data.reservations')->assertJsonPath('data.reservations.0.status', 'NO_SHOW');
        $this->actingAs($this->manager)->getJson('/api/v1/management/history?status=PENDING')->assertUnprocessable();
        $this->actingAs($this->manager)->getJson("/api/v1/management/history/{$pending['id']}")->assertNotFound();

        $noShowPayment = Reservation::query()->findOrFail($noShow['id'])->payments()->firstOrFail();
        $role = Role::factory()->create(['is_full_access' => false]);
        $role->modules()->create(['module' => 'HISTORY']);
        $historyStaff = User::factory()->create(['role_id' => $role->id]);
        $this->actingAs($historyStaff)->getJson('/api/v1/management/history')->assertOk();
        $this->actingAs($historyStaff)->getJson("/api/v1/management/history/{$noShow['id']}")
            ->assertOk()
            ->assertJsonPath('data.status', 'NO_SHOW')
            ->assertJsonPath('data.payments.0.proof_url', "/api/v1/management/history-payments/{$noShowPayment->id}/proof");
        $this->actingAs($historyStaff)->get("/api/v1/management/history-payments/{$noShowPayment->id}/proof")->assertOk();
        $this->actingAs($historyStaff)->getJson('/api/v1/management/reservations')->assertForbidden();
    }
}

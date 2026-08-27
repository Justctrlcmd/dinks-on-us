<?php

namespace Tests\Feature;

use App\Models\Court;
use App\Models\CourtConfiguration;
use App\Models\Reservation;
use App\Models\ReservationSlotLock;
use App\Models\Role;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private User $dashboardUser;

    private Court $courtOne;

    private Court $courtTwo;

    protected function setUp(): void
    {
        parent::setUp();
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-08-27 10:30:00', 'Asia/Manila'));
        Storage::fake('local');

        $role = Role::factory()->create(['is_full_access' => false]);
        $role->modules()->create(['module' => 'DASHBOARD']);
        $this->dashboardUser = User::factory()->create(['role_id' => $role->id]);
        $this->courtOne = Court::query()->create(['court_number' => 1, 'is_active' => true]);
        $this->courtTwo = Court::query()->create(['court_number' => 2, 'is_active' => true]);
        $configuration = CourtConfiguration::query()->create([
            'opening_hour' => 9,
            'closing_hour' => 14,
            'included_players_per_court' => 4,
            'additional_player_price' => 100,
        ]);
        foreach (['weekday', 'weekend'] as $dayType) {
            $configuration->ratePeriods()->create([
                'day_type' => $dayType,
                'start_hour' => 9,
                'end_hour' => 14,
                'price' => 500,
                'display_order' => 1,
            ]);
        }
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_dashboard_returns_displayed_week_kpis_availability_and_slot_statuses(): void
    {
        $pending = $this->reservation('RF-101', Reservation::STATUS_PENDING, $this->courtOne, 11, 500, true);
        $verified = $this->reservation('RF-102', Reservation::STATUS_VERIFIED, $this->courtTwo, 12, 600, true);
        $completed = $this->reservation('RF-103', Reservation::STATUS_COMPLETED, $this->courtOne, 13, 1200);
        $this->reservation('RF-104', Reservation::STATUS_COMPLETED, $this->courtTwo, 13, 900, false, '2026-09-03');

        $response = $this->actingAs($this->dashboardUser)->getJson(
            '/api/v1/management/dashboard?week_start=2026-08-24&date=2026-08-27',
        );

        $response->assertOk()
            ->assertJsonPath('data.week.start', '2026-08-24')
            ->assertJsonPath('data.week.end', '2026-08-30')
            ->assertJsonPath('data.kpis.pending', 1)
            ->assertJsonPath('data.kpis.verified', 1)
            ->assertJsonPath('data.kpis.completed', 1)
            ->assertJsonPath('data.kpis.revenue', 1200)
            ->assertJsonPath('data.days.3.total_slots', 8)
            ->assertJsonPath('data.days.3.available_slots', 6);

        $slots = collect($response->json('data.selected_date.courts'))->flatMap(
            fn (array $court) => collect($court['slots'])->map(fn (array $slot): array => [...$slot, 'court_id' => $court['id']]),
        );
        $this->assertSame('PAST', $slots->first(fn (array $slot): bool => $slot['court_id'] === $this->courtOne->id && $slot['start_hour'] === 9)['status']);
        $this->assertSame('AVAILABLE', $slots->first(fn (array $slot): bool => $slot['court_id'] === $this->courtOne->id && $slot['start_hour'] === 10)['status']);
        $this->assertSame('PENDING', $slots->first(fn (array $slot): bool => $slot['court_id'] === $this->courtOne->id && $slot['start_hour'] === 11)['status']);
        $this->assertSame($pending->id, $slots->first(fn (array $slot): bool => $slot['court_id'] === $this->courtOne->id && $slot['start_hour'] === 11)['reservation_id']);
        $this->assertSame('VERIFIED', $slots->first(fn (array $slot): bool => $slot['court_id'] === $this->courtTwo->id && $slot['start_hour'] === 12)['status']);
        $this->assertSame($verified->id, $slots->first(fn (array $slot): bool => $slot['court_id'] === $this->courtTwo->id && $slot['start_hour'] === 12)['reservation_id']);
        $this->assertSame('COMPLETED', $slots->first(fn (array $slot): bool => $slot['court_id'] === $this->courtOne->id && $slot['start_hour'] === 13)['status']);
        $this->assertSame($completed->id, $slots->first(fn (array $slot): bool => $slot['court_id'] === $this->courtOne->id && $slot['start_hour'] === 13)['reservation_id']);
    }

    public function test_dashboard_only_staff_can_read_slot_details_and_proofs_but_not_reservation_management(): void
    {
        $reservation = $this->reservation('RF-201', Reservation::STATUS_PENDING, $this->courtOne, 11, 500, true);
        Storage::disk('local')->put('reservation-payment-proofs/dashboard.jpg', 'proof');
        $payment = $reservation->payments()->create([
            'payment_method_name' => 'GCash',
            'channel' => 'EWALLET',
            'kind' => 'INITIAL',
            'status' => 'PENDING',
            'amount' => 500,
            'proof_path' => 'reservation-payment-proofs/dashboard.jpg',
        ]);

        $this->actingAs($this->dashboardUser)
            ->getJson("/api/v1/management/dashboard/reservations/{$reservation->id}")
            ->assertOk()
            ->assertJsonPath('data.reference_number', 'RF-201')
            ->assertJsonPath('data.payments.0.proof_url', "/api/v1/management/dashboard-payments/{$payment->id}/proof");
        $this->actingAs($this->dashboardUser)
            ->get("/api/v1/management/dashboard-payments/{$payment->id}/proof")
            ->assertOk();
        $this->actingAs($this->dashboardUser)
            ->getJson('/api/v1/management/reservations')
            ->assertForbidden();
    }

    public function test_slot_becomes_past_only_after_its_end_time(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-08-27 10:00:00', 'Asia/Manila'));
        $atEndTime = $this->getJson('/api/v1/public/reservation-options?date=2026-08-27')->assertOk();
        $this->assertFalse(collect($atEndTime->json('data.past_slots'))->contains(
            fn (array $slot): bool => $slot['court_id'] === $this->courtOne->id && $slot['start_hour'] === 9,
        ));

        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-08-27 10:01:00', 'Asia/Manila'));
        $afterEndTime = $this->getJson('/api/v1/public/reservation-options?date=2026-08-27')->assertOk();
        $this->assertTrue(collect($afterEndTime->json('data.past_slots'))->contains(
            fn (array $slot): bool => $slot['court_id'] === $this->courtOne->id && $slot['start_hour'] === 9,
        ));
        $this->assertTrue(collect($afterEndTime->json('data.unavailable_slots'))->contains(
            fn (array $slot): bool => $slot['court_id'] === $this->courtOne->id && $slot['start_hour'] === 9,
        ));
    }

    public function test_dashboard_requires_authentication_module_access_and_valid_dates(): void
    {
        $url = '/api/v1/management/dashboard?week_start=2026-08-24&date=2026-08-27';
        $this->getJson($url)->assertUnauthorized();

        $role = Role::factory()->create(['is_full_access' => false]);
        $role->modules()->create(['module' => 'RESERVATION']);
        $reservationUser = User::factory()->create(['role_id' => $role->id]);
        $this->actingAs($reservationUser)->getJson($url)->assertForbidden();

        $this->actingAs($this->dashboardUser)
            ->getJson('/api/v1/management/dashboard?week_start=not-a-date&date=2026-08-27')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['week_start']);
    }

    private function reservation(
        string $reference,
        string $status,
        Court $court,
        int $startHour,
        float $amount,
        bool $locked = false,
        string $date = '2026-08-27',
    ): Reservation {
        $reservation = Reservation::query()->create([
            'reference_number' => $reference,
            'source' => 'ONLINE',
            'booking_date' => $date,
            'customer_name' => 'Dashboard Customer',
            'customer_email' => strtolower($reference).'@example.com',
            'customer_contact_number' => '09123456789',
            'status' => $status,
            'original_amount' => $amount,
            'final_amount' => $amount,
            'amount_paid' => $status === Reservation::STATUS_PENDING ? 0 : $amount,
            'submitted_at' => now(),
            'completed_at' => $status === Reservation::STATUS_COMPLETED ? now() : null,
        ]);
        $slot = $reservation->slots()->create([
            'court_id' => $court->id,
            'date' => $date,
            'start_hour' => $startHour,
            'end_hour' => $startHour + 1,
            'unit_amount' => $amount,
            'kind' => 'ORIGINAL',
            'is_current' => true,
        ]);
        if ($locked) {
            ReservationSlotLock::query()->create([
                'reservation_slot_id' => $slot->id,
                'court_id' => $court->id,
                'date' => $date,
                'start_hour' => $startHour,
            ]);
        }

        return $reservation;
    }
}

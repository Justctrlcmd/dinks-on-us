<?php

namespace Tests\Feature;

use App\Models\AvailabilityClosure;
use App\Models\Court;
use App\Models\CourtConfiguration;
use App\Models\PaymentMethod;
use App\Models\Reservation;
use App\Models\Role;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportsAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    private User $reportsUser;

    private Court $courtOne;

    private Court $courtTwo;

    /** @var array<string, Reservation> */
    private array $reservations = [];

    protected function setUp(): void
    {
        parent::setUp();
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-08-27 12:30:00', 'Asia/Manila'));

        $role = Role::factory()->create(['is_full_access' => false]);
        $role->modules()->create(['module' => 'REPORTS']);
        $this->reportsUser = User::factory()->create(['role_id' => $role->id]);
        $this->courtOne = Court::query()->create(['court_number' => 1, 'is_active' => true]);
        $this->courtTwo = Court::query()->create(['court_number' => 2, 'is_active' => true]);
        $configuration = CourtConfiguration::query()->create([
            'opening_hour' => 9,
            'closing_hour' => 15,
            'included_players_per_court' => 4,
            'additional_player_price' => 100,
        ]);
        foreach (['weekday', 'weekend'] as $dayType) {
            $configuration->ratePeriods()->create([
                'day_type' => $dayType,
                'start_hour' => 9,
                'end_hour' => 15,
                'price' => 500,
                'display_order' => 1,
            ]);
        }

        $this->seedReportTransactions();
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_reports_require_authentication_and_reports_module_access(): void
    {
        $url = $this->url('overview');
        $this->getJson($url)->assertUnauthorized();

        $role = Role::factory()->create(['is_full_access' => false]);
        $role->modules()->create(['module' => 'RESERVATION']);
        $user = User::factory()->create(['role_id' => $role->id]);
        $this->actingAs($user)->getJson($url)->assertForbidden();

        $this->actingAs($this->reportsUser)->getJson($url)
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('code', null)
            ->assertJsonPath('errors', null)
            ->assertJsonPath('meta', null)
            ->assertJsonPath('data.context.range.time_zone', 'Asia/Manila');
    }

    public function test_report_filters_validate_dates_source_and_court(): void
    {
        $base = '/api/v1/management/reports/overview';
        $this->actingAs($this->reportsUser)
            ->getJson("{$base}?from=2026-08-27&to=2026-08-26")
            ->assertUnprocessable()->assertJsonValidationErrors(['to']);
        $this->actingAs($this->reportsUser)
            ->getJson("{$base}?from=2026-08-25&to=2026-08-28")
            ->assertUnprocessable()->assertJsonValidationErrors(['to']);
        $this->actingAs($this->reportsUser)
            ->getJson("{$base}?from=2026-08-25&to=2026-08-27&source=PHONE")
            ->assertUnprocessable()->assertJsonValidationErrors(['source']);
        $this->actingAs($this->reportsUser)
            ->getJson("{$base}?from=2026-08-25&to=2026-08-27&court_id=9999")
            ->assertUnprocessable()->assertJsonValidationErrors(['court_id']);
    }

    public function test_recognized_revenue_uses_completed_final_amount_and_no_show_collections_only(): void
    {
        $response = $this->actingAs($this->reportsUser)->getJson($this->url('revenue'))->assertOk();

        $response
            ->assertJsonPath('data.metrics.completed_reservation_revenue', 2500)
            ->assertJsonPath('data.metrics.no_show_recognized_revenue', 500)
            ->assertJsonPath('data.metrics.recognized_revenue', 3000)
            ->assertJsonPath('data.metrics.completed_reservations', 2)
            ->assertJsonPath('data.metrics.average_reservation_value', 1250);
        $this->assertNotEquals(3900, $response->json('data.metrics.recognized_revenue'));
    }

    public function test_zero_completed_reservations_returns_null_average(): void
    {
        $response = $this->actingAs($this->reportsUser)
            ->getJson('/api/v1/management/reports/revenue?from=2026-08-20&to=2026-08-20')
            ->assertOk();

        $response->assertJsonPath('data.metrics.completed_reservations', 0)
            ->assertJsonPath('data.metrics.average_reservation_value', null)
            ->assertJsonPath('data.has_reportable_data', false);
    }

    public function test_source_and_court_filters_do_not_duplicate_multi_court_reservations(): void
    {
        $online = $this->actingAs($this->reportsUser)
            ->getJson($this->url('revenue').'&source=ONLINE')
            ->assertOk();
        $online->assertJsonPath('data.metrics.completed_reservations', 1)
            ->assertJsonPath('data.metrics.recognized_revenue', 1500);

        $court = $this->actingAs($this->reportsUser)
            ->getJson($this->url('revenue')."&court_id={$this->courtTwo->id}")
            ->assertOk();
        $court->assertJsonPath('data.metrics.completed_reservations', 1)
            ->assertJsonPath('data.metrics.completed_reservation_revenue', 800)
            ->assertJsonPath('data.metrics.no_show_recognized_revenue', 0)
            ->assertJsonPath('data.metrics.recognized_revenue', 800);
    }

    public function test_outcome_rate_denominators_follow_the_formula_contract(): void
    {
        $response = $this->actingAs($this->reportsUser)->getJson($this->url('reservations'))->assertOk();

        $response
            ->assertJsonPath('data.outcomes.completed', 2)
            ->assertJsonPath('data.outcomes.cancelled', 1)
            ->assertJsonPath('data.outcomes.rejected', 1)
            ->assertJsonPath('data.outcomes.no_show', 1)
            ->assertJsonPath('data.rates.no_show_percent', 33.3)
            ->assertJsonPath('data.rates.cancellation_percent', 25)
            ->assertJsonPath('data.trend_basis', 'submitted_at');
    }

    public function test_utilization_excludes_closures_future_hours_and_no_shows(): void
    {
        $wholeClosure = AvailabilityClosure::query()->create([
            'type' => AvailabilityClosure::TYPE_ENTIRE_OPERATION,
            'date' => '2026-08-26',
            'reason' => 'Maintenance',
            'is_active' => true,
        ]);
        $courtClosure = AvailabilityClosure::query()->create([
            'type' => AvailabilityClosure::TYPE_COURT_TIME,
            'date' => '2026-08-25',
            'court_id' => $this->courtOne->id,
            'reason' => 'Surface repair',
            'is_active' => true,
        ]);
        $courtClosure->periods()->create(['start_hour' => 14, 'end_hour' => 15]);

        $response = $this->actingAs($this->reportsUser)->getJson($this->url('court-utilization'))->assertOk();
        $response
            ->assertJsonPath('data.summary.potential_hours', 30)
            ->assertJsonPath('data.summary.closed_hours', 13)
            ->assertJsonPath('data.summary.sellable_hours', 17)
            ->assertJsonPath('data.summary.completed_hours', 3)
            ->assertJsonPath('data.summary.utilization_percent', 17.6)
            ->assertJsonPath('data.summary.operational_availability_percent', 56.7);
        $this->assertDatabaseHas('availability_closures', ['id' => $wholeClosure->id]);
    }

    public function test_report_scope_omits_courts_without_slot_records_and_retains_inactive_courts_with_history(): void
    {
        $unusedCourt = Court::query()->create(['court_number' => 3, 'is_active' => true]);
        $historicalCourt = Court::query()->create(['court_number' => 4, 'is_active' => false]);
        $this->slot($this->reservations['rejected'], $historicalCourt, '2026-08-26', 12, 600);

        $response = $this->actingAs($this->reportsUser)->getJson($this->url('court-utilization'))->assertOk();
        $courtIds = collect($response->json('data.courts'))->pluck('court_id')->all();
        $contextCourtIds = collect($response->json('data.context.courts'))->pluck('id')->all();

        $this->assertContains($historicalCourt->id, $courtIds);
        $this->assertNotContains($unusedCourt->id, $courtIds);
        $this->assertSame($courtIds, $contextCourtIds);
    }

    public function test_popular_times_use_completed_current_slots_and_not_no_shows(): void
    {
        $response = $this->actingAs($this->reportsUser)->getJson($this->url('popular-times'))->assertOk();
        $nine = collect($response->json('data.popular_hours'))->firstWhere('start_hour', 9);
        $eleven = collect($response->json('data.popular_hours'))->firstWhere('start_hour', 11);

        $this->assertSame(2, $nine['completed_slots']);
        $this->assertSame(1, $eleven['completed_slots']);
        $this->assertSame('completed_slot_count', $response->json('data.measure'));
    }

    public function test_manila_day_boundary_includes_utc_timestamp_from_previous_utc_date(): void
    {
        $this->reservations['online_completed']->update([
            'completed_at' => CarbonImmutable::parse('2026-08-25 00:30:00', 'Asia/Manila')->utc(),
        ]);

        $response = $this->actingAs($this->reportsUser)
            ->getJson('/api/v1/management/reports/revenue?from=2026-08-25&to=2026-08-25&group_by=day')
            ->assertOk();

        $response->assertJsonPath('data.metrics.completed_reservations', 1)
            ->assertJsonPath('data.trend.points.0.period', '2026-08-25')
            ->assertJsonPath('data.trend.points.0.completed_revenue', 1000);
    }

    public function test_payment_and_operations_reports_use_transactional_histories(): void
    {
        $this->reservations['online_completed']->payments()->create([
            'payment_method_name' => 'GCash',
            'channel' => 'EWALLET',
            'kind' => 'INITIAL',
            'status' => 'VERIFIED',
            'amount' => 1000,
            'verified_at' => CarbonImmutable::parse('2026-08-25 10:30:00', 'Asia/Manila')->utc(),
        ]);
        $this->reservations['online_completed']->scheduleHistories()->create([
            'old_booking_date' => '2026-08-24',
            'new_booking_date' => '2026-08-25',
            'old_slots' => [],
            'new_slots' => [],
            'old_slot_amount' => 600,
            'new_slot_amount' => 600,
            'difference_amount' => 0,
            'created_at' => CarbonImmutable::parse('2026-08-25 11:00:00', 'Asia/Manila')->utc(),
        ]);
        $this->reservations['walkin_completed']->currentSlots()->first()->update(['kind' => 'ADD_ON']);

        $payments = $this->actingAs($this->reportsUser)->getJson($this->url('payments'))->assertOk();
        $payments->assertJsonPath('data.verification.sample_size', 4)
            ->assertJsonPath('data.verification.average_minutes', 30)
            ->assertJsonPath('data.verification.median_minutes', 30)
            ->assertJsonPath('data.verified_payments.methods.0.name', 'GCash');

        $operations = $this->actingAs($this->reportsUser)->getJson($this->url('operations'))->assertOk();
        $operations->assertJsonPath('data.rescheduling.reservations_affected', 1)
            ->assertJsonPath('data.rescheduling.operations', 1)
            ->assertJsonPath('data.extensions.reservations_with_extension', 1)
            ->assertJsonPath('data.rejection_concerns.0.concern', 'INVALID_PAYMENT_PROOF');
    }

    public function test_payment_report_groups_renamed_linked_methods_under_the_current_name(): void
    {
        $method = PaymentMethod::query()->create([
            'name' => 'Gcash',
            'qr_image_path' => 'payment-methods/gcash.png',
            'account_name' => 'Dinks on Us',
            'account_number' => '09170000000',
            'is_active' => true,
        ]);
        foreach ([$this->reservations['online_completed'], $this->reservations['walkin_completed']] as $reservation) {
            $reservation->payments()->create([
                'payment_method_id' => $method->id,
                'payment_method_name' => 'GCASH',
                'channel' => 'EWALLET',
                'kind' => 'INITIAL',
                'status' => 'VERIFIED',
                'amount' => 500,
                'verified_at' => CarbonImmutable::parse('2026-08-25 10:30:00', 'Asia/Manila')->utc(),
            ]);
        }

        $response = $this->actingAs($this->reportsUser)->getJson($this->url('payments'))->assertOk();
        $methods = $response->json('data.verified_payments.methods');

        $this->assertCount(1, $methods);
        $this->assertSame(['name' => 'Gcash', 'count' => 2, 'amount' => 1000, 'share_percent' => 100], $methods[0]);
    }

    private function seedReportTransactions(): void
    {
        $this->reservations['online_completed'] = $this->reservation(
            'RF-101', Reservation::STATUS_COMPLETED, 'ONLINE', '2026-08-25', 1000, 1000,
            '2026-08-25 10:00:00', '2026-08-25 10:30:00',
        );
        $this->slot($this->reservations['online_completed'], $this->courtOne, '2026-08-25', 9, 600);

        $this->reservations['walkin_completed'] = $this->reservation(
            'RF-102', Reservation::STATUS_COMPLETED, 'WALK_IN', '2026-08-27', 1500, 1500,
            '2026-08-27 08:30:00', '2026-08-27 12:00:00',
        );
        $this->slot($this->reservations['walkin_completed'], $this->courtOne, '2026-08-27', 9, 700);
        $this->slot($this->reservations['walkin_completed'], $this->courtTwo, '2026-08-27', 11, 800);

        $this->reservations['no_show'] = $this->reservation(
            'RF-103', Reservation::STATUS_NO_SHOW, 'ONLINE', '2026-08-25', 900, 500,
            '2026-08-25 09:00:00', null, '2026-08-25 13:00:00',
        );
        $this->slot($this->reservations['no_show'], $this->courtOne, '2026-08-25', 11, 900);

        $this->reservations['verified'] = $this->reservation(
            'RF-104', Reservation::STATUS_VERIFIED, 'ONLINE', '2026-08-27', 900, 900,
            '2026-08-27 09:00:00', null,
        );
        $this->slot($this->reservations['verified'], $this->courtOne, '2026-08-27', 12, 900);

        $this->reservations['cancelled'] = $this->reservation(
            'RF-105', Reservation::STATUS_CANCELLED, 'ONLINE', '2026-08-26', 700, 700,
            '2026-08-25 09:00:00', null, null, '2026-08-26 11:00:00',
        );
        $this->slot($this->reservations['cancelled'], $this->courtTwo, '2026-08-26', 10, 700);

        $this->reservations['rejected'] = $this->reservation(
            'RF-106', Reservation::STATUS_REJECTED, 'ONLINE', '2026-08-26', 600, 0,
            '2026-08-25 09:00:00', null, null, null, '2026-08-26 10:00:00',
        );
        $this->reservations['rejected']->update(['rejection_concern' => 'INVALID_PAYMENT_PROOF']);
        $this->slot($this->reservations['rejected'], $this->courtOne, '2026-08-26', 12, 600);
    }

    private function reservation(
        string $reference,
        string $status,
        string $source,
        string $bookingDate,
        float $finalAmount,
        float $amountPaid,
        string $submittedAt,
        ?string $completedAt = null,
        ?string $noShowAt = null,
        ?string $cancelledAt = null,
        ?string $rejectedAt = null,
    ): Reservation {
        return Reservation::query()->create([
            'reference_number' => $reference,
            'source' => $source,
            'booking_date' => $bookingDate,
            'customer_name' => 'Report Customer',
            'customer_email' => strtolower($reference).'@example.com',
            'customer_contact_number' => '09123456789',
            'status' => $status,
            'original_amount' => $finalAmount,
            'final_amount' => $finalAmount,
            'amount_paid' => $amountPaid,
            'submitted_at' => CarbonImmutable::parse($submittedAt, 'Asia/Manila')->utc(),
            'verified_at' => $status === Reservation::STATUS_REJECTED ? null : CarbonImmutable::parse($submittedAt, 'Asia/Manila')->addMinutes(30)->utc(),
            'completed_at' => $completedAt ? CarbonImmutable::parse($completedAt, 'Asia/Manila')->utc() : null,
            'no_show_at' => $noShowAt ? CarbonImmutable::parse($noShowAt, 'Asia/Manila')->utc() : null,
            'cancelled_at' => $cancelledAt ? CarbonImmutable::parse($cancelledAt, 'Asia/Manila')->utc() : null,
            'rejected_at' => $rejectedAt ? CarbonImmutable::parse($rejectedAt, 'Asia/Manila')->utc() : null,
        ]);
    }

    private function slot(Reservation $reservation, Court $court, string $date, int $startHour, float $amount): void
    {
        $reservation->slots()->create([
            'court_id' => $court->id,
            'date' => $date,
            'start_hour' => $startHour,
            'end_hour' => $startHour + 1,
            'unit_amount' => $amount,
            'kind' => 'ORIGINAL',
            'is_current' => true,
        ]);
    }

    private function url(string $report): string
    {
        return "/api/v1/management/reports/{$report}?from=2026-08-25&to=2026-08-27";
    }
}

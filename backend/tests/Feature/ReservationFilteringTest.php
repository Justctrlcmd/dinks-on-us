<?php

namespace Tests\Feature;

use App\Models\Court;
use App\Models\Reservation;
use App\Models\Role;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReservationFilteringTest extends TestCase
{
    use RefreshDatabase;

    private Court $court;

    protected function setUp(): void
    {
        parent::setUp();
        config(['business.timezone' => 'Asia/Manila']);
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-10-22 16:30:00', 'UTC'));
        $this->court = Court::query()->create(['court_number' => 1, 'is_active' => true]);
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    private function booking(string $reference, string $date = '2026-10-23', int $hour = 9, array $attributes = []): Reservation
    {
        $reservation = Reservation::query()->create([
            'reference_number' => $reference, 'source' => 'ONLINE', 'booking_date' => $date,
            'customer_name' => 'Filter Player', 'customer_email' => 'player@example.com',
            'customer_contact_number' => '09123456789', 'status' => Reservation::STATUS_PENDING,
            'original_amount' => 500, 'final_amount' => 500, 'submitted_at' => now(),
            ...$attributes,
        ]);
        $reservation->slots()->create([
            'court_id' => $this->court->id, 'date' => $date, 'start_hour' => $hour, 'end_hour' => $hour + 1,
            'unit_amount' => 500, 'is_current' => true, 'kind' => 'ORIGINAL',
        ]);

        return $reservation;
    }

    private function list(array $filters = [])
    {
        return $this->getJson('/api/v1/management/reservations?'.http_build_query($filters));
    }

    public function test_filters_require_an_active_account_with_reservation_module_access(): void
    {
        $this->booking('RF-001');
        $filters = ['search_by' => 'reference_number', 'search' => 'RF-001', 'booking_date' => '2026-10-23'];
        $this->list($filters)->assertUnauthorized()->assertJsonPath('data', null);

        $role = Role::factory()->create(['is_full_access' => false]);
        $role->modules()->create(['module' => 'HISTORY']);
        $this->actingAs(User::factory()->create(['role_id' => $role->id]));
        $this->list($filters)->assertForbidden()->assertJsonPath('data', null);

        $role->modules()->create(['module' => 'RESERVATION']);
        $this->list($filters)->assertOk()->assertJsonPath('data.reservations.0.reference_number', 'RF-001');

        $this->actingAs(User::factory()->create(['is_active' => false]));
        $this->list($filters)->assertForbidden()->assertJsonPath('data', null);
    }

    public function test_reference_search_matches_partial_ids_without_matching_customer_or_payment_references(): void
    {
        $this->actingAs(User::factory()->create());
        $this->booking('RF-001');
        $other = $this->booking('RF-002', attributes: ['customer_name' => 'RF-001']);
        $other->payments()->create([
            'channel' => 'CASH', 'kind' => 'INITIAL', 'status' => 'PENDING', 'amount' => 500,
            'reference_number' => 'RF-001',
        ]);

        foreach (['RF-001', '001', '  RF-001  ', '0'] as $search) {
            $response = $this->list(['search_by' => 'reference_number', 'search' => $search])->assertOk();
            $response->assertJsonCount($search === '0' ? 2 : 1, 'data.reservations');
        }
        $this->list(['search' => 'RF-001'])->assertOk()->assertJsonCount(2, 'data.reservations');
        $this->list(['search_by' => 'all', 'search' => 'RF-001'])->assertOk()->assertJsonCount(2, 'data.reservations');
        $this->list(['search_by' => 'reference_number', 'search' => 'missing'])->assertOk()
            ->assertJsonCount(0, 'data.reservations')->assertJsonPath('meta.total', 0);
    }

    public function test_date_matches_current_booking_date_instead_of_submission_or_old_schedule(): void
    {
        $this->actingAs(User::factory()->create());
        $rescheduled = $this->booking('RF-001', attributes: ['status' => Reservation::STATUS_VERIFIED, 'is_rescheduled' => true]);
        $rescheduled->slots()->create([
            'court_id' => $this->court->id, 'date' => '2026-10-22', 'start_hour' => 9, 'end_hour' => 10,
            'unit_amount' => 500, 'is_current' => false, 'kind' => 'ORIGINAL',
        ]);
        $past = $this->booking('RF-002', '2026-10-22');
        $this->booking('RF-003', '2026-10-24');
        foreach (Reservation::FINAL_STATUSES as $index => $status) {
            $this->booking('RF-'.($index + 100), attributes: ['status' => $status]);
        }

        $this->list(['booking_date' => '2026-10-23'])->assertOk()->assertJsonCount(1, 'data.reservations')
            ->assertJsonPath('data.reservations.0.id', $rescheduled->id);
        $this->list(['booking_date' => '2026-10-22'])->assertOk()->assertJsonCount(1, 'data.reservations')
            ->assertJsonPath('data.reservations.0.id', $past->id);
        $this->list(['booking_date' => '2026-10-23', 'status' => 'RESCHEDULED'])->assertOk()
            ->assertJsonPath('data.reservations.0.id', $rescheduled->id);
        $this->list(['booking_date' => '2026-10-23', 'status' => 'VERIFIED'])->assertOk()->assertJsonCount(0, 'data.reservations');
    }

    public function test_combined_filters_apply_before_pagination_preserve_order_and_keep_overall_kpis(): void
    {
        $this->actingAs(User::factory()->create());
        $this->booking('RF-900', '2026-10-22');
        $this->booking('RF-901', attributes: ['status' => Reservation::STATUS_VERIFIED]);
        $this->booking('RF-902', '2026-10-24');
        $expected = [];
        // Insert in reverse order to prove filtering retains server schedule ordering.
        for ($hour = 18; $hour >= 7; $hour--) {
            array_unshift($expected, $this->booking('RF-1'.$hour, hour: $hour)->id);
        }
        $filters = ['search_by' => 'reference_number', 'search' => 'RF-1', 'booking_date' => '2026-10-23', 'status' => 'PENDING'];
        $first = $this->list($filters)->assertOk()->assertJsonCount(10, 'data.reservations')
            ->assertJsonPath('meta.total', 12)->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('data.kpis.pending', 14)->assertJsonPath('data.kpis.verified', 1);
        $this->assertSame(array_slice($expected, 0, 10), array_column($first->json('data.reservations'), 'id'));
        $second = $this->list([...$filters, 'page' => 2])->assertOk()->assertJsonCount(2, 'data.reservations');
        $this->assertSame(array_slice($expected, 10), array_column($second->json('data.reservations'), 'id'));
    }

    public function test_reference_payloads_cannot_inject_sql_or_expand_wildcards(): void
    {
        $this->actingAs(User::factory()->create());
        $this->booking('RF-001');
        foreach (["' OR 1=1 --", '%', '_', '!', 'RF-%', 'RF-00_', '<script>alert(1)</script>', 'RF-001%26status=PENDING'] as $search) {
            $this->list(['search_by' => 'reference_number', 'search' => $search])->assertOk()
                ->assertJsonCount(0, 'data.reservations')->assertJsonPath('meta.total', 0);
        }
        $this->assertDatabaseCount('reservations', 1);
    }

    public function test_invalid_filter_types_modes_dates_and_unbounded_searches_return_safe_validation_errors(): void
    {
        $this->actingAs(User::factory()->create());
        foreach ([
            ['search_by' => 'customer_name'], ['search_by' => 'reference_number desc; DROP TABLE reservations'],
            ['search_by' => ['reference_number']], ['search' => ['RF-001']], ['search' => str_repeat('a', 181)],
            ['booking_date' => '2026-02-30'], ['booking_date' => '10/23/2026'], ['booking_date' => '2026-10-23T00:00:00Z'],
            ['booking_date' => ['2026-10-23']], ['booking_date' => "2026-10-23' OR 1=1"],
            ['status' => 'COMPLETED'], ['page' => 0], ['per_page' => 100000],
        ] as $filters) {
            $this->list($filters)->assertUnprocessable()->assertJsonValidationErrors(array_keys($filters))
                ->assertJsonStructure(['success', 'message', 'code', 'data', 'errors', 'meta'])
                ->assertJsonMissingPath('exception')->assertJsonMissingPath('trace');
        }
    }
}

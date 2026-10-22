<?php

namespace Tests\Feature;

use App\Models\Court;
use App\Models\Reservation;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReservationOrderingTest extends TestCase
{
    use RefreshDatabase;

    private Court $court;

    protected function setUp(): void
    {
        parent::setUp();
        config(['business.timezone' => 'Asia/Manila']);
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-10-22 11:30:00', 'Asia/Manila'));
        $this->actingAs(User::factory()->create());
        $this->court = Court::query()->create(['court_number' => 1, 'is_active' => true]);
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    private function booking(string $date, array $hours, string $status = Reservation::STATUS_PENDING): Reservation
    {
        $reservation = Reservation::query()->create([
            'source' => 'ONLINE', 'booking_date' => $date, 'customer_name' => 'Sorting Player',
            'customer_email' => 'player@example.com', 'customer_contact_number' => '09123456789',
            'status' => $status, 'original_amount' => 500, 'final_amount' => 500, 'submitted_at' => now(),
        ]);
        $reservation->update(['reference_number' => 'RF-'.$reservation->id]);
        foreach ($hours as $hour) {
            $reservation->slots()->create([
                'court_id' => $this->court->id, 'date' => $date, 'start_hour' => $hour, 'end_hour' => $hour + 1,
                'unit_amount' => 500, 'is_current' => true, 'kind' => 'ORIGINAL',
            ]);
        }

        return $reservation;
    }

    private function ids(string $query = ''): array
    {
        return array_column($this->getJson('/api/v1/management/reservations'.$query)->assertOk()->json('data.reservations'), 'id');
    }

    public function test_current_then_nearest_upcoming_bookings_precede_later_bookings_and_recent_submissions(): void
    {
        $tomorrow = $this->booking('2026-10-23', [7]);
        $later = $this->booking('2026-10-22', [18]);
        $current = $this->booking('2026-10-22', [11], Reservation::STATUS_ONGOING);
        $next = $this->booking('2026-10-22', [12], Reservation::STATUS_VERIFIED);
        $later->update(['submitted_at' => now()->addHour()]);

        $this->assertSame([$current->id, $next->id, $later->id, $tomorrow->id], $this->ids());
    }

    public function test_unresolved_past_bookings_come_first_oldest_first_before_current_and_upcoming_bookings(): void
    {
        $yesterday = $this->booking('2026-10-21', [23], Reservation::STATUS_ONGOING);
        $early = $this->booking('2026-10-22', [8], Reservation::STATUS_VERIFIED);
        $recent = $this->booking('2026-10-22', [10]);
        $current = $this->booking('2026-10-22', [11]);
        $tomorrow = $this->booking('2026-10-23', [20]);

        $this->assertSame([$yesterday->id, $early->id, $recent->id, $current->id, $tomorrow->id], $this->ids());
    }

    public function test_nonconsecutive_hours_add_ons_and_rescheduled_slot_history_use_the_next_actual_slot(): void
    {
        $gap = $this->booking('2026-10-22', [7, 14]);
        $gap->slots()->create(['court_id' => $this->court->id, 'date' => '2026-10-22', 'start_hour' => 11, 'end_hour' => 12, 'unit_amount' => 500, 'kind' => 'ORIGINAL', 'is_current' => false]);
        $next = $this->booking('2026-10-22', [12]);
        $addOn = $this->booking('2026-10-22', [8]);
        $addOn->slots()->create(['court_id' => $this->court->id, 'date' => '2026-10-22', 'start_hour' => 13, 'end_hour' => 14, 'unit_amount' => 500, 'kind' => 'ADD_ON', 'is_current' => true]);

        $this->assertSame([$next->id, $addOn->id, $gap->id], $this->ids());
    }

    public function test_ordering_updates_at_slot_end_and_uses_the_business_timezone_across_midnight(): void
    {
        $late = $this->booking('2026-10-22', [23]);
        $gap = $this->booking('2026-10-23', [0, 7]);
        $early = $this->booking('2026-10-23', [1]);
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-10-22 15:59:59', 'UTC'));
        $this->assertSame([$late->id, $gap->id, $early->id], $this->ids());
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-10-22 16:00:00', 'UTC'));
        $this->assertSame([$late->id, $gap->id, $early->id], $this->ids());
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-10-22 17:00:00', 'UTC'));
        $this->assertSame([$late->id, $early->id, $gap->id], $this->ids());
    }

    public function test_past_bookings_take_the_first_page_and_finished_records_stay_in_history(): void
    {
        $past = [];
        for ($hour = 7; $hour <= 18; $hour++) {
            $past[] = $this->booking('2026-10-21', [$hour])->id;
        }
        $current = $this->booking('2026-10-22', [11]);
        $future = $this->booking('2026-10-23', [7]);
        foreach ([Reservation::STATUS_COMPLETED, Reservation::STATUS_REJECTED, Reservation::STATUS_CANCELLED, Reservation::STATUS_NO_SHOW] as $status) {
            $this->booking('2026-10-20', [7], $status);
        }

        $this->assertSame(array_slice($past, 0, 10), $this->ids());
        $this->assertSame([...array_slice($past, 10), $current->id, $future->id], $this->ids('?page=2'));
        $this->assertSame(array_slice($past, 0, 10), $this->ids('?status=PENDING&search=Sorting'));
    }

    public function test_pagination_and_filters_keep_the_same_order_with_deterministic_ties(): void
    {
        $tomorrow = [];
        for ($hour = 7; $hour <= 18; $hour++) {
            $tomorrow[] = $this->booking('2026-10-23', [$hour])->id;
        }
        $next = $this->booking('2026-10-22', [12], Reservation::STATUS_VERIFIED);
        $next->update(['is_rescheduled' => true]);
        $this->booking('2026-10-22', [11], Reservation::STATUS_COMPLETED);
        $this->assertSame([$next->id, ...array_slice($tomorrow, 0, 9)], $this->ids());
        $this->assertSame(array_slice($tomorrow, 9), $this->ids('?page=2'));
        $this->assertSame([$next->id], $this->ids('?status=RESCHEDULED&search=Sorting'));
        $this->assertSame(array_slice($tomorrow, 0, 10), $this->ids('?status=PENDING'));

        $tied = $this->booking('2026-10-22', [12], Reservation::STATUS_VERIFIED);
        $this->assertSame([$tied->id, $next->id], array_slice($this->ids(), 0, 2));
    }
}

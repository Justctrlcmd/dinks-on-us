<?php

namespace Tests\Feature;

use App\Models\Court;
use App\Models\RentalEquipment;
use App\Models\Reservation;
use App\Services\EquipmentAvailabilityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EquipmentAvailabilityTest extends TestCase
{
    use RefreshDatabase;

    private RentalEquipment $equipment;

    private string $date = '2030-09-12';

    protected function setUp(): void
    {
        parent::setUp();
        $this->equipment = RentalEquipment::query()->create(['name' => 'Ball', 'price' => 30, 'total_quantity' => 20, 'is_active' => true]);
    }

    private function booking(array $hours, int $quantity, string $status = Reservation::STATUS_PENDING, ?Court $court = null): Reservation
    {
        $court ??= Court::query()->create(['court_number' => Court::count() + 1, 'is_active' => true]);
        $reservation = Reservation::query()->create([
            'booking_date' => $this->date, 'customer_name' => 'Customer', 'customer_email' => 'customer@example.com',
            'customer_contact_number' => '09123456789', 'status' => $status, 'original_amount' => 0, 'final_amount' => 0,
        ]);
        foreach ($hours as $hour) {
            $reservation->slots()->create(['court_id' => $court->id, 'date' => $this->date, 'start_hour' => $hour, 'end_hour' => $hour + 1, 'unit_amount' => 500, 'is_current' => true]);
        }
        $reservation->equipmentItems()->create(['rental_equipment_id' => $this->equipment->id, 'name' => 'Ball', 'quantity' => $quantity, 'unit_amount' => 30, 'is_active' => true]);

        return $reservation;
    }

    private function available(array $hours, ?string $date = null): int
    {
        return app(EquipmentAvailabilityService::class)->forSlots(
            RentalEquipment::all(),
            array_map(fn ($hour): array => ['date' => $date ?? $this->date, 'start_hour' => $hour], $hours),
        )[$this->equipment->id]['available_quantity'];
    }

    public function test_empty_inventory_usage_and_exact_end_boundary(): void
    {
        $this->assertSame(20, $this->available([10, 11]));
        $this->booking([10, 11], 5);
        $this->assertSame(15, $this->available([10, 11]));
        $this->assertSame(20, $this->available([12]));
        $this->assertSame(20, $this->available([10], '2030-09-13'));
    }

    public function test_shared_courts_and_minimum_across_selected_hours(): void
    {
        $this->booking([10, 11], 5);
        $this->booking([10, 11, 12, 13, 14, 15], 10, Reservation::STATUS_VERIFIED);
        $this->assertSame(5, $this->available([10, 11]));
        $this->assertSame(5, $this->available([11]));
        $this->assertSame(10, $this->available([12]));
        $this->assertSame(5, $this->available([11, 12]));
        $this->assertSame(20, $this->available([16]));
    }

    public function test_non_simultaneous_bookings_are_not_added_together(): void
    {
        $this->booking([10], 5);
        $this->booking([11], 5);
        $this->assertSame(15, $this->available([10, 11]));
    }

    public function test_non_consecutive_slots_do_not_occupy_the_gap(): void
    {
        $this->booking([10, 13], 5);
        $this->booking([11, 12], 20);
        $this->assertSame(15, $this->available([10, 13]));
        $this->assertSame(0, $this->available([11]));
    }

    public function test_simultaneous_courts_count_one_reservation_allocation_once(): void
    {
        $reservation = $this->booking([10], 5);
        $court = Court::query()->create(['court_number' => 2, 'is_active' => true]);
        $reservation->slots()->create(['court_id' => $court->id, 'date' => $this->date, 'start_hour' => 10, 'end_hour' => 11, 'unit_amount' => 500, 'is_current' => true]);
        $this->assertSame(15, $this->available([10, 10]));
    }

    public function test_statuses_and_inactive_allocations_release_stock_without_counters(): void
    {
        $reservation = $this->booking([10], 5);
        foreach (Reservation::OPERATIONAL_STATUSES as $status) {
            $reservation->update(['status' => $status]);
            $this->assertSame(15, $this->available([10]));
        }
        foreach (Reservation::FINAL_STATUSES as $status) {
            $reservation->update(['status' => $status]);
            $this->assertSame(20, $this->available([10]));
        }
        $reservation->update(['status' => Reservation::STATUS_VERIFIED]);
        $reservation->equipmentItems()->update(['is_active' => false]);
        $this->assertSame(20, $this->available([10]));
        $this->assertSame(20, $this->equipment->fresh()->total_quantity);
    }

    public function test_old_schedule_slots_are_excluded_and_add_on_quantities_are_combined(): void
    {
        $reservation = $this->booking([10, 11], 5);
        $reservation->slots()->where('start_hour', 10)->update(['is_current' => false]);
        $reservation->equipmentItems()->create(['rental_equipment_id' => $this->equipment->id, 'name' => 'Ball', 'quantity' => 3, 'unit_amount' => 30, 'kind' => 'ADD_ON', 'is_active' => true]);
        $this->assertSame(20, $this->available([10]));
        $this->assertSame(12, $this->available([11]));
    }

    public function test_exhausted_and_inactive_stock_report_zero(): void
    {
        $this->booking([10], 20);
        $this->assertSame(0, $this->available([10]));
        $this->equipment->update(['is_active' => false]);
        $this->assertSame(0, $this->available([12]));
    }
}

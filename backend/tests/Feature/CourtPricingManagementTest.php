<?php

namespace Tests\Feature;

use App\Models\RentalEquipment;
use App\Models\Reservation;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourtPricingManagementTest extends TestCase
{
    use RefreshDatabase;

    private function configurationPayload(): array
    {
        return [
            'opening_hour' => 7,
            'closing_hour' => 24,
            'included_players_per_court' => 4,
            'additional_player_price' => 100,
            'advance_booking_days' => 30,
            'weekday_rates' => [
                ['start_hour' => 7, 'end_hour' => 17, 'price' => 500],
                ['start_hour' => 17, 'end_hour' => 24, 'price' => 600],
            ],
            'weekend_rates' => [
                ['start_hour' => 7, 'end_hour' => 24, 'price' => 700],
            ],
        ];
    }

    public function test_an_authenticated_user_can_configure_global_court_rules(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson('/api/v1/management/court-configuration', $this->configurationPayload())
            ->assertOk()
            ->assertJsonPath('data.opening_hour', 7)
            ->assertJsonPath('data.closing_hour', 24)
            ->assertJsonPath('data.included_players_per_court', 4)
            ->assertJsonPath('data.advance_booking_days', 30)
            ->assertJsonPath('data.weekday_rates.1.price', 600)
            ->assertJsonPath('data.weekend_rates.0.price', 700);

        $this->assertDatabaseCount('court_configurations', 1);
        $this->assertDatabaseCount('court_rate_periods', 3);
    }

    public function test_rate_periods_must_cover_operating_hours_without_gaps_or_overlaps(): void
    {
        $user = User::factory()->create();
        $payload = $this->configurationPayload();
        $payload['weekday_rates'][1]['start_hour'] = 16;

        $this->actingAs($user)
            ->putJson('/api/v1/management/court-configuration', $payload)
            ->assertUnprocessable()
            ->assertJsonPath('code', 'VALIDATION_FAILED')
            ->assertJsonValidationErrors(['weekday_rates.1.start_hour']);

        $this->assertDatabaseEmpty('court_configurations');
    }

    public function test_advance_booking_days_must_be_within_the_supported_window(): void
    {
        $payload = $this->configurationPayload();
        $payload['advance_booking_days'] = 366;

        $this->actingAs(User::factory()->create())
            ->putJson('/api/v1/management/court-configuration', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['advance_booking_days']);

        $payload['advance_booking_days'] = 0;
        $this->actingAs(User::factory()->create())
            ->putJson('/api/v1/management/court-configuration', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['advance_booking_days']);
    }

    public function test_the_lowest_inactive_court_is_reactivated_before_a_new_number_is_assigned(): void
    {
        $user = User::factory()->create();
        $courts = [];

        foreach (range(1, 6) as $courtNumber) {
            $courts[$courtNumber] = $this->actingAs($user)
                ->postJson('/api/v1/management/courts')
                ->assertCreated()
                ->assertJsonPath('data.name', "Court {$courtNumber}")
                ->json('data');
        }

        $this->actingAs($user)->deleteJson("/api/v1/management/courts/{$courts[3]['id']}")
            ->assertOk();
        $this->actingAs($user)->deleteJson("/api/v1/management/courts/{$courts[5]['id']}")
            ->assertOk();

        $this->actingAs($user)->getJson('/api/v1/management/courts')
            ->assertOk()
            ->assertJsonCount(4, 'data.courts')
            ->assertJsonPath('data.next_court_number', 3)
            ->assertJsonPath('data.next_court_is_reactivation', true);

        $this->actingAs($user)->postJson('/api/v1/management/courts')
            ->assertOk()
            ->assertJsonPath('message', 'Court reactivated.')
            ->assertJsonPath('data.id', $courts[3]['id'])
            ->assertJsonPath('data.name', 'Court 3');

        $this->assertDatabaseCount('courts', 6);
        $this->assertDatabaseHas('courts', [
            'id' => $courts[3]['id'],
            'court_number' => 3,
            'is_active' => true,
        ]);

        $this->actingAs($user)->getJson('/api/v1/management/courts')
            ->assertOk()
            ->assertJsonCount(5, 'data.courts')
            ->assertJsonPath('data.next_court_number', 5)
            ->assertJsonPath('data.next_court_is_reactivation', true);

        $this->actingAs($user)->postJson('/api/v1/management/courts')
            ->assertOk()
            ->assertJsonPath('data.id', $courts[5]['id'])
            ->assertJsonPath('data.name', 'Court 5');

        $this->actingAs($user)->getJson('/api/v1/management/courts')
            ->assertOk()
            ->assertJsonCount(6, 'data.courts')
            ->assertJsonPath('data.next_court_number', 7)
            ->assertJsonPath('data.next_court_is_reactivation', false);

        $this->actingAs($user)->postJson('/api/v1/management/courts')
            ->assertCreated()
            ->assertJsonPath('data.name', 'Court 7');

        $this->assertDatabaseCount('courts', 7);
    }

    public function test_rental_equipment_can_be_created_updated_and_soft_deleted_without_removing_reservation_snapshots(): void
    {
        $user = User::factory()->create();

        $equipment = $this->actingAs($user)->postJson('/api/v1/management/rental-equipment', [
            'name' => '  Training Paddle ',
            'price' => 125,
            'total_quantity' => 8,
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Training Paddle')
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('data.available_quantity', 8)
            ->json('data');

        $this->actingAs($user)->patchJson("/api/v1/management/rental-equipment/{$equipment['id']}", [
            'name' => 'Training Paddle',
            'price' => 150,
            'total_quantity' => 10,
            'is_active' => false,
        ])->assertOk()
            ->assertJsonPath('data.price', 150)
            ->assertJsonPath('data.is_active', false);

        $this->actingAs($user)->getJson('/api/v1/management/rental-equipment')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.is_active', false);

        $this->actingAs($user)->patchJson("/api/v1/management/rental-equipment/{$equipment['id']}", [
            'name' => 'Training Paddle',
            'price' => 150,
            'total_quantity' => 10,
            'is_active' => true,
        ])->assertOk()->assertJsonPath('data.is_active', true);

        $reservation = Reservation::query()->create([
            'reference_number' => 'EQUIPMENT-SNAPSHOT-1',
            'booking_date' => '2030-09-12',
            'customer_name' => 'Equipment History',
            'customer_email' => 'history@example.com',
            'customer_contact_number' => '09171234567',
            'status' => Reservation::STATUS_COMPLETED,
            'original_amount' => 150,
            'final_amount' => 150,
            'amount_paid' => 150,
        ]);
        $reservation->equipmentItems()->create([
            'rental_equipment_id' => $equipment['id'],
            'name' => 'Training Paddle',
            'quantity' => 1,
            'unit_amount' => 150,
            'kind' => 'ORIGINAL',
        ]);

        $this->actingAs($user)->deleteJson("/api/v1/management/rental-equipment/{$equipment['id']}")
            ->assertOk()
            ->assertJsonPath('message', 'Rental equipment deleted. Historical reservation records remain available.');

        $this->assertSoftDeleted('rental_equipment', ['id' => $equipment['id']]);

        $this->actingAs($user)->getJson('/api/v1/management/rental-equipment')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->assertDatabaseHas('reservation_equipment_items', [
            'reservation_id' => $reservation->id,
            'rental_equipment_id' => $equipment['id'],
            'name' => 'Training Paddle',
            'unit_amount' => 150,
        ]);
        $this->assertNotNull(RentalEquipment::withTrashed()->find($equipment['id'])?->deleted_at);
    }

    public function test_inactive_equipment_is_visible_to_management_but_hidden_from_reservation_options(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->putJson('/api/v1/management/court-configuration', $this->configurationPayload())->assertOk();
        $this->actingAs($user)->postJson('/api/v1/management/courts')->assertCreated();

        $equipment = $this->actingAs($user)->postJson('/api/v1/management/rental-equipment', [
            'name' => 'Inactive Paddle',
            'price' => 125,
            'total_quantity' => 8,
            'is_active' => false,
        ])->assertCreated()
            ->assertJsonPath('data.is_active', false)
            ->json('data');

        $this->actingAs($user)->getJson('/api/v1/management/rental-equipment')
            ->assertOk()
            ->assertJsonPath('data.0.id', $equipment['id'])
            ->assertJsonPath('data.0.is_active', false);

        $date = now('Asia/Manila')->addDay()->toDateString();

        $this->getJson("/api/v1/public/reservation-options?date={$date}")
            ->assertOk()
            ->assertJsonCount(0, 'data.equipment');
    }

    public function test_public_reservation_options_use_the_applicable_global_rate(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->putJson('/api/v1/management/court-configuration', $this->configurationPayload())->assertOk();
        $this->actingAs($user)->postJson('/api/v1/management/courts')->assertCreated();
        $this->actingAs($user)->postJson('/api/v1/management/rental-equipment', [
            'name' => 'Paddle',
            'price' => 100,
            'total_quantity' => 12,
        ])->assertCreated();

        $date = $this->nextDateForDayOfWeek(5);

        $this->getJson("/api/v1/public/reservation-options?date={$date}")
            ->assertOk()
            ->assertJsonPath('data.courts.0.name', 'Court 1')
            ->assertJsonPath('data.slots.0.price', 700)
            ->assertJsonPath('data.slots.16.end_hour', 24)
            ->assertJsonPath('data.equipment.0.available_quantity', 12)
            ->assertJsonPath('data.equipment_confirmation', 'Equipment is held when your reservation is successfully submitted, including while awaiting verification.');
    }

    public function test_dynamic_pricing_uses_monday_through_thursday_as_weekdays_and_friday_through_sunday_as_weekends(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->putJson('/api/v1/management/court-configuration', $this->configurationPayload())->assertOk();
        $this->actingAs($user)->postJson('/api/v1/management/courts')->assertCreated();

        foreach ([1 => 500, 4 => 500, 5 => 700, 7 => 700] as $dayOfWeek => $price) {
            $date = $this->nextDateForDayOfWeek($dayOfWeek);
            $this->getJson("/api/v1/public/reservation-options?date={$date}")
                ->assertOk()
                ->assertJsonPath('data.slots.0.price', $price);
        }
    }

    public function test_public_options_do_not_offer_slots_after_the_advance_booking_window(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->putJson('/api/v1/management/court-configuration', $this->configurationPayload())->assertOk();
        $this->actingAs($user)->postJson('/api/v1/management/courts')->assertCreated();
        $date = now('Asia/Manila')->addDays(31)->toDateString();

        $this->getJson("/api/v1/public/reservation-options?date={$date}")
            ->assertOk()
            ->assertJsonPath('data.is_outside_booking_window', true)
            ->assertJsonPath('data.booking_window_end', now('Asia/Manila')->addDays(30)->toDateString())
            ->assertJsonCount(0, 'data.slots');
    }

    private function nextDateForDayOfWeek(int $dayOfWeek): string
    {
        $today = CarbonImmutable::now('Asia/Manila')->startOfDay();
        $daysUntil = ($dayOfWeek - $today->dayOfWeekIso + 7) % 7;

        return $today->addDays($daysUntil)->toDateString();
    }

    public function test_management_court_pricing_routes_require_authentication(): void
    {
        $this->getJson('/api/v1/management/court-configuration')->assertUnauthorized();
        $this->postJson('/api/v1/management/courts')->assertUnauthorized();
        $this->postJson('/api/v1/management/rental-equipment', [])->assertUnauthorized();
    }
}

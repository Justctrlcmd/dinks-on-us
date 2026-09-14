<?php

namespace Tests\Feature;

use App\Models\User;
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

    public function test_rental_equipment_can_be_created_updated_and_removed(): void
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

        $this->actingAs($user)->deleteJson("/api/v1/management/rental-equipment/{$equipment['id']}")
            ->assertOk();

        $this->actingAs($user)->getJson('/api/v1/management/rental-equipment')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.is_active', false);
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

        $this->getJson('/api/v1/public/reservation-options?date=2030-09-12')
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

        $this->getJson('/api/v1/public/reservation-options?date=2026-08-29')
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

        foreach ([
            ['date' => '2030-09-02', 'price' => 500], // Monday
            ['date' => '2030-09-05', 'price' => 500], // Thursday
            ['date' => '2030-09-06', 'price' => 700], // Friday
            ['date' => '2030-09-08', 'price' => 700], // Sunday
        ] as $case) {
            $this->getJson("/api/v1/public/reservation-options?date={$case['date']}")
                ->assertOk()
                ->assertJsonPath('data.slots.0.price', $case['price']);
        }
    }

    public function test_management_court_pricing_routes_require_authentication(): void
    {
        $this->getJson('/api/v1/management/court-configuration')->assertUnauthorized();
        $this->postJson('/api/v1/management/courts')->assertUnauthorized();
        $this->postJson('/api/v1/management/rental-equipment', [])->assertUnauthorized();
    }
}

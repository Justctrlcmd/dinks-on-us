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

    public function test_court_numbers_increment_and_are_not_reused_after_removal(): void
    {
        $user = User::factory()->create();

        $first = $this->actingAs($user)->postJson('/api/v1/management/courts')
            ->assertCreated()
            ->assertJsonPath('data.name', 'Court 1')
            ->json('data');

        $this->actingAs($user)->deleteJson("/api/v1/management/courts/{$first['id']}")
            ->assertOk();

        $this->actingAs($user)->postJson('/api/v1/management/courts')
            ->assertCreated()
            ->assertJsonPath('data.name', 'Court 2');

        $this->actingAs($user)->getJson('/api/v1/management/courts')
            ->assertOk()
            ->assertJsonCount(1, 'data.courts')
            ->assertJsonPath('data.next_court_number', 3);
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
            ->assertJsonPath('data.available_quantity', 8)
            ->json('data');

        $this->actingAs($user)->patchJson("/api/v1/management/rental-equipment/{$equipment['id']}", [
            'name' => 'Training Paddle',
            'price' => 150,
            'total_quantity' => 10,
        ])->assertOk()->assertJsonPath('data.price', 150);

        $this->actingAs($user)->deleteJson("/api/v1/management/rental-equipment/{$equipment['id']}")
            ->assertOk();

        $this->actingAs($user)->getJson('/api/v1/management/rental-equipment')
            ->assertOk()->assertJsonCount(0, 'data');
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
            ->assertJsonPath('data.equipment_confirmation', 'Equipment availability is confirmed when your reservation is verified.');
    }

    public function test_management_court_pricing_routes_require_authentication(): void
    {
        $this->getJson('/api/v1/management/court-configuration')->assertUnauthorized();
        $this->postJson('/api/v1/management/courts')->assertUnauthorized();
        $this->postJson('/api/v1/management/rental-equipment', [])->assertUnauthorized();
    }
}

<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AvailabilityClosuresManagementTest extends TestCase
{
    use RefreshDatabase;

    private function configureCourts(User $user): int
    {
        $this->actingAs($user)->putJson('/api/v1/management/court-configuration', [
            'opening_hour' => 7,
            'closing_hour' => 24,
            'included_players_per_court' => 4,
            'additional_player_price' => 100,
            'weekday_rates' => [['start_hour' => 7, 'end_hour' => 24, 'price' => 500]],
            'weekend_rates' => [['start_hour' => 7, 'end_hour' => 24, 'price' => 600]],
        ])->assertOk();

        return $this->actingAs($user)->postJson('/api/v1/management/courts')
            ->assertCreated()
            ->json('data.id');
    }

    public function test_an_authenticated_user_can_close_and_reopen_the_entire_operation(): void
    {
        $user = User::factory()->create(['name' => 'Operations Manager']);
        $this->configureCourts($user);

        $closure = $this->actingAs($user)->postJson('/api/v1/management/closed-dates', [
            'date' => '2026-09-01',
            'reason' => 'Private tournament setup',
        ])->assertCreated()
            ->assertJsonPath('data.type', 'entire_operation')
            ->assertJsonPath('data.reason', 'Private tournament setup')
            ->json('data');

        $this->getJson('/api/v1/public/reservation-options?date=2026-09-01')
            ->assertOk()
            ->assertJsonPath('data.is_date_closed', true)
            ->assertJsonCount(17, 'data.unavailable_slots');

        $this->getJson('/api/v1/public/closed-dates')
            ->assertOk()
            ->assertJsonPath('data.closed_dates.0', '2026-09-01');

        $this->actingAs($user)->deleteJson("/api/v1/management/closed-dates/{$closure['id']}", [
            'reason' => 'The tournament ended early; reopening for regular play.',
        ])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->getJson('/api/v1/public/reservation-options?date=2026-09-01')
            ->assertOk()
            ->assertJsonPath('data.is_date_closed', false)
            ->assertJsonCount(0, 'data.unavailable_slots');

        $this->getJson('/api/v1/public/closed-dates')
            ->assertOk()
            ->assertJsonCount(0, 'data.closed_dates');

        $this->actingAs($user)->getJson('/api/v1/management/availability-activity')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.action', 'DATE_REOPENED')
            ->assertJsonPath('data.0.actor_name', 'Operations Manager')
            ->assertJsonPath('data.0.details.reason', 'The tournament ended early; reopening for regular play.');
    }

    public function test_a_grouped_court_time_closure_blocks_only_its_selected_ranges(): void
    {
        $user = User::factory()->create();
        $courtId = $this->configureCourts($user);

        $closure = $this->actingAs($user)->postJson('/api/v1/management/availability-blocks', [
            'date' => '2026-09-02',
            'court_id' => $courtId,
            'periods' => [
                ['start_hour' => 9, 'end_hour' => 11],
                ['start_hour' => 14, 'end_hour' => 16],
            ],
            'reason' => 'Court surface maintenance',
        ])->assertCreated()
            ->assertJsonPath('data.type', 'court_time')
            ->assertJsonCount(2, 'data.periods')
            ->json('data');

        $this->getJson('/api/v1/public/reservation-options?date=2026-09-02')
            ->assertOk()
            ->assertJsonPath('data.is_date_closed', false)
            ->assertJsonCount(4, 'data.unavailable_slots')
            ->assertJsonPath('data.unavailable_slots.0.start_hour', 9)
            ->assertJsonPath('data.unavailable_slots.3.start_hour', 15);

        $this->getJson('/api/v1/public/closed-dates')
            ->assertOk()
            ->assertJsonCount(0, 'data.closed_dates');

        $this->actingAs($user)->postJson('/api/v1/management/availability-blocks', [
            'date' => '2026-09-02',
            'court_id' => $courtId,
            'periods' => [['start_hour' => 10, 'end_hour' => 12]],
            'reason' => 'Overlapping maintenance',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['periods.0.start_hour']);

        $this->actingAs($user)->deleteJson("/api/v1/management/availability-blocks/{$closure['id']}", [
            'reason' => 'Maintenance completed ahead of schedule.',
        ])
            ->assertOk();

        $this->getJson('/api/v1/public/reservation-options?date=2026-09-02')
            ->assertOk()
            ->assertJsonCount(0, 'data.unavailable_slots');
    }

    public function test_active_closures_and_activity_are_paginated_in_groups_of_five(): void
    {
        $user = User::factory()->create();

        foreach (range(1, 6) as $day) {
            $this->actingAs($user)->postJson('/api/v1/management/closed-dates', [
                'date' => sprintf('2026-10-%02d', $day),
                'reason' => "Closure {$day}",
            ])->assertCreated();
        }

        $this->actingAs($user)->getJson('/api/v1/management/availability-closures')
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('data.0.date', '2026-10-06')
            ->assertJsonPath('meta.per_page', 5)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('meta.total', 6);

        $this->actingAs($user)->getJson('/api/v1/management/availability-activity')
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('meta.per_page', 5)
            ->assertJsonPath('meta.last_page', 2);
    }

    public function test_closure_reasons_are_required_and_management_routes_require_authentication(): void
    {
        $this->postJson('/api/v1/management/closed-dates', [])->assertUnauthorized();
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/v1/management/closed-dates', [
            'date' => '2026-09-03',
            'reason' => '   ',
        ])->assertUnprocessable()->assertJsonValidationErrors(['reason']);

        $this->actingAs($user)->postJson('/api/v1/management/closed-dates', [
            'date' => '2026-08-24',
            'reason' => 'Past closure',
        ])->assertUnprocessable()->assertJsonValidationErrors(['date']);
    }

    public function test_reopening_requires_a_description(): void
    {
        $user = User::factory()->create();
        $closure = $this->actingAs($user)->postJson('/api/v1/management/closed-dates', [
            'date' => '2026-09-04',
            'reason' => 'Private event',
        ])->assertCreated()->json('data');

        $this->actingAs($user)
            ->deleteJson("/api/v1/management/closed-dates/{$closure['id']}", ['reason' => '   '])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['reason']);

        $this->assertDatabaseHas('availability_closures', [
            'id' => $closure['id'],
            'is_active' => true,
        ]);
    }
}

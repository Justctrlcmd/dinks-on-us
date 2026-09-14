<?php

namespace Tests\Feature;

use App\Models\Court;
use App\Models\CourtConfiguration;
use App\Models\RentalEquipment;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_production_seeding_is_blocked_without_the_explicit_flag(): void
    {
        $this->app['env'] = 'production';
        config()->set('seeding.allow_production_seed', false);

        $this->runSeeder();

        $this->assertDatabaseCount('roles', 0);
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('court_configurations', 0);
        $this->assertDatabaseCount('courts', 0);
        $this->assertDatabaseCount('rental_equipment', 0);
    }

    public function test_production_seeding_creates_current_defaults_when_explicitly_enabled(): void
    {
        $this->app['env'] = 'production';
        config()->set('seeding.allow_production_seed', true);

        $this->runSeeder();

        $this->assertCurrentDefaultsWereSeeded();
    }

    public function test_local_seeding_creates_current_defaults_without_the_production_flag(): void
    {
        $this->app['env'] = 'local';
        config()->set('seeding.allow_production_seed', false);

        $this->runSeeder();

        $this->assertCurrentDefaultsWereSeeded();
    }

    public function test_repeated_seeding_does_not_duplicate_current_defaults(): void
    {
        $this->app['env'] = 'production';
        config()->set('seeding.allow_production_seed', true);

        $this->runSeeder();
        $this->runSeeder();

        $this->assertDatabaseCount('roles', 1);
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('court_configurations', 1);
        $this->assertDatabaseCount('court_rate_periods', 4);
        $this->assertDatabaseCount('courts', 3);
        $this->assertDatabaseCount('rental_equipment', 3);
    }

    private function assertCurrentDefaultsWereSeeded(): void
    {
        $manager = User::query()->with('role')->sole();
        $configuration = CourtConfiguration::query()->sole();

        $this->assertSame(config('manager.default.name'), $manager->name);
        $this->assertSame(config('manager.default.email'), $manager->email);
        $this->assertTrue(Hash::check(config('manager.default.password'), $manager->password));
        $this->assertSame('manager', $manager->role?->slug);
        $this->assertTrue($manager->role?->is_protected);
        $this->assertTrue($manager->role?->is_full_access);
        $this->assertSame(7, $configuration->opening_hour);
        $this->assertSame(24, $configuration->closing_hour);
        $this->assertSame(4, $configuration->included_players_per_court);
        $this->assertSame('100.00', $configuration->additional_player_price);
        foreach ([
            ['day_type' => 'weekday', 'start_hour' => 7, 'end_hour' => 17, 'price' => 500, 'display_order' => 1],
            ['day_type' => 'weekday', 'start_hour' => 17, 'end_hour' => 24, 'price' => 600, 'display_order' => 2],
            ['day_type' => 'weekend', 'start_hour' => 7, 'end_hour' => 17, 'price' => 500, 'display_order' => 1],
            ['day_type' => 'weekend', 'start_hour' => 17, 'end_hour' => 24, 'price' => 600, 'display_order' => 2],
        ] as $period) {
            $this->assertDatabaseHas('court_rate_periods', [
                'court_configuration_id' => $configuration->id,
                ...$period,
            ]);
        }

        $this->assertSame([1, 2, 3], Court::query()->orderBy('court_number')->pluck('court_number')->all());
        foreach (range(1, 3) as $courtNumber) {
            $this->assertDatabaseHas('courts', ['court_number' => $courtNumber, 'is_active' => true]);
        }

        $this->assertSame(['Ball', 'Paddle', 'Titan Machine'], RentalEquipment::query()->orderBy('name')->pluck('name')->all());
        foreach ([
            ['name' => 'Paddle', 'price' => 100, 'total_quantity' => 12],
            ['name' => 'Ball', 'price' => 30, 'total_quantity' => 20],
            ['name' => 'Titan Machine', 'price' => 500, 'total_quantity' => 1],
        ] as $equipment) {
            $this->assertDatabaseHas('rental_equipment', [...$equipment, 'is_active' => true]);
        }

        $this->assertSame(1, Role::query()->count());
    }

    private function runSeeder(): void
    {
        $this->app->make(DatabaseSeeder::class)->run();
    }
}

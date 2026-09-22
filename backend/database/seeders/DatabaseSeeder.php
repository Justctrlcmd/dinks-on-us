<?php

namespace Database\Seeders;

use App\Models\Court;
use App\Models\CourtConfiguration;
use App\Models\RentalEquipment;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        if (app()->environment('production') && ! config('seeding.allow_production_seed')) {
            return;
        }

        if (! app()->environment(['local', 'testing', 'production'])) {
            return;
        }

        $managerRole = Role::query()->updateOrCreate(
            ['slug' => 'manager'],
            [
                'name' => 'Manager',
                'description' => 'Full access to all management modules.',
                'is_protected' => true,
                'is_full_access' => true,
            ],
        );

        $manager = User::query()->firstOrNew([
            'email' => config('manager.default.email'),
        ]);

        if (! $manager->exists) {
            $manager->fill([
                'name' => config('manager.default.name'),
                'password' => config('manager.default.password'),
            ]);
            $manager->email_verified_at = now();
        }

        $manager->role()->associate($managerRole);
        $manager->is_active = true;
        $manager->save();

        $configuration = CourtConfiguration::query()->find(1);

        if (! $configuration) {
            $configuration = new CourtConfiguration;
            $configuration->id = 1;
            $configuration->fill([
                'opening_hour' => 7,
                'closing_hour' => 24,
                'included_players_per_court' => 4,
                'additional_player_price' => 100,
                'updated_by_user_id' => $manager->id,
            ])->save();
        }

        if ($configuration->ratePeriods()->doesntExist()) {
            foreach (['weekday', 'weekend'] as $dayType) {
                $configuration->ratePeriods()->createMany([
                    ['day_type' => $dayType, 'start_hour' => 7, 'end_hour' => 17, 'price' => 500, 'display_order' => 1],
                    ['day_type' => $dayType, 'start_hour' => 17, 'end_hour' => 24, 'price' => 600, 'display_order' => 2],
                ]);
            }
        }

        foreach (range(1, 3) as $courtNumber) {
            Court::query()->firstOrCreate(['court_number' => $courtNumber], ['is_active' => true]);
        }

        foreach ([
            ['name' => 'Paddle', 'price' => 100, 'total_quantity' => 12],
            ['name' => 'Ball', 'price' => 30, 'total_quantity' => 20],
            ['name' => 'Titan Machine', 'price' => 500, 'total_quantity' => 1],
        ] as $item) {
            RentalEquipment::withTrashed()->firstOrCreate(['name' => $item['name']], [...$item, 'is_active' => true]);
        }
    }
}

<?php

namespace Database\Seeders;

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
        if (! app()->environment(['local', 'testing'])) {
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
        $manager->save();
    }
}

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();
        foreach ([
            ['slug' => 'court-rules', 'name' => 'Court Rules & Policy', 'sort_order' => 1],
            ['slug' => 'reservation-rules', 'name' => 'Reservation Rules & Policy', 'sort_order' => 2],
            ['slug' => 'reschedule-policy', 'name' => 'Reschedule Policy', 'sort_order' => 3],
            ['slug' => 'cancellation-policy', 'name' => 'Cancellation Policy', 'sort_order' => 4],
        ] as $section) {
            if (! DB::table('policy_sections')->where('slug', $section['slug'])->exists()) {
                DB::table('policy_sections')->insert([...$section, 'created_at' => $now, 'updated_at' => $now]);
            }
        }
    }

    public function down(): void
    {
        // Restored sections may now contain edited policies. Keep their content on rollback.
    }
};

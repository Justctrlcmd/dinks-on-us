<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const CHANGES = [
        'A confirmed court reservation may be rescheduled once.' => 'A confirmed court reservation may be rescheduled more than once when each change is approved by Dinks On Us management.',
        'Once a rescheduled reservation has been approved and confirmed, it becomes final and cannot be rescheduled again.' => 'Every approved reschedule replaces the active schedule and remains preserved in the reservation history.',
    ];

    public function up(): void
    {
        foreach (self::CHANGES as $old => $new) {
            DB::table('policy_rules')->where('content', $old)->update(['content' => $new, 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        foreach (self::CHANGES as $old => $new) {
            DB::table('policy_rules')->where('content', $new)->update(['content' => $old, 'updated_at' => now()]);
        }
    }
};

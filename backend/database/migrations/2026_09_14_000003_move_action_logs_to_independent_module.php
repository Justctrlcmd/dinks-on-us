<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('role_modules')
            ->where('module', 'MANAGEMENT_ACTION_LOGS')
            ->update(['module' => 'ACTION_LOGS']);
    }

    public function down(): void
    {
        DB::table('role_modules')
            ->where('module', 'ACTION_LOGS')
            ->update(['module' => 'MANAGEMENT_ACTION_LOGS']);
    }
};

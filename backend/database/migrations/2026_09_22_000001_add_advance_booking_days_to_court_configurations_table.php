<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('court_configurations', function (Blueprint $table): void {
            $table->unsignedSmallInteger('advance_booking_days')->default(30)->after('additional_player_price');
        });
    }

    public function down(): void
    {
        Schema::table('court_configurations', function (Blueprint $table): void {
            $table->dropColumn('advance_booking_days');
        });
    }
};

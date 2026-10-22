<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservation_schedule_histories', function (Blueprint $table): void {
            $table->decimal('refund_amount', 12, 2)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('reservation_schedule_histories', function (Blueprint $table): void {
            $table->dropColumn('refund_amount');
        });
    }
};

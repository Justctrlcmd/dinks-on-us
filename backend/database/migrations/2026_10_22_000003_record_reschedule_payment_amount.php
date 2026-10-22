<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservation_schedule_histories', function (Blueprint $table): void {
            // Unknown for historical operations; never infer from the latest payment.
            $table->decimal('payment_amount', 12, 2)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('reservation_schedule_histories', function (Blueprint $table): void {
            $table->dropColumn('payment_amount');
        });
    }
};

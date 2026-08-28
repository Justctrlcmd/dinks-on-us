<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table): void {
            $table->index(['status', 'completed_at'], 'reservations_status_completed_at_index');
            $table->index(['status', 'no_show_at'], 'reservations_status_no_show_at_index');
            $table->index(['status', 'cancelled_at'], 'reservations_status_cancelled_at_index');
            $table->index(['status', 'rejected_at'], 'reservations_status_rejected_at_index');
            $table->index(['source', 'submitted_at'], 'reservations_source_submitted_at_index');
            $table->index(['source', 'verified_at'], 'reservations_source_verified_at_index');
        });

        Schema::table('reservation_slots', function (Blueprint $table): void {
            $table->index(['date', 'is_current', 'court_id'], 'reservation_slots_reporting_index');
        });

        Schema::table('reservation_payments', function (Blueprint $table): void {
            $table->index(['status', 'verified_at'], 'reservation_payments_status_verified_at_index');
        });

        Schema::table('reservation_schedule_histories', function (Blueprint $table): void {
            $table->index('created_at', 'reservation_schedule_histories_created_at_index');
        });
    }

    public function down(): void
    {
        Schema::table('reservation_schedule_histories', function (Blueprint $table): void {
            $table->dropIndex('reservation_schedule_histories_created_at_index');
        });
        Schema::table('reservation_payments', function (Blueprint $table): void {
            $table->dropIndex('reservation_payments_status_verified_at_index');
        });
        Schema::table('reservation_slots', function (Blueprint $table): void {
            $table->dropIndex('reservation_slots_reporting_index');
        });
        Schema::table('reservations', function (Blueprint $table): void {
            $table->dropIndex('reservations_status_completed_at_index');
            $table->dropIndex('reservations_status_no_show_at_index');
            $table->dropIndex('reservations_status_cancelled_at_index');
            $table->dropIndex('reservations_status_rejected_at_index');
            $table->dropIndex('reservations_source_submitted_at_index');
            $table->dropIndex('reservations_source_verified_at_index');
        });
    }
};

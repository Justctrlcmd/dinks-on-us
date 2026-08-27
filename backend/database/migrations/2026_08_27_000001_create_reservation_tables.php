<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reservations', function (Blueprint $table): void {
            $table->id();
            $table->string('reference_number', 32)->nullable()->unique();
            $table->string('source', 20)->default('ONLINE');
            $table->date('booking_date')->index();
            $table->string('customer_name', 180);
            $table->string('customer_email', 180)->index();
            $table->string('customer_contact_number', 30)->index();
            $table->string('status', 30)->default('PENDING')->index();
            $table->boolean('is_rescheduled')->default(false)->index();
            $table->unsignedInteger('reschedule_count')->default(0);
            $table->unsignedInteger('original_additional_players')->default(0);
            $table->decimal('additional_player_unit_amount', 10, 2)->default(0);
            $table->decimal('original_amount', 12, 2);
            $table->decimal('adjustment_amount', 12, 2)->default(0);
            $table->decimal('final_amount', 12, 2);
            $table->decimal('amount_paid', 12, 2)->default(0);
            $table->decimal('refundable_credit', 12, 2)->default(0);
            $table->text('rejection_concern')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->json('policy_snapshot')->nullable();
            $table->timestamp('policy_accepted_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('no_show_at')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('verified_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('started_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('completed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('cancelled_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('rejected_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('no_show_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'booking_date']);
            $table->index(['is_rescheduled', 'status']);
        });

        Schema::create('reservation_slots', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('reservation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('court_id')->constrained()->restrictOnDelete();
            $table->date('date');
            $table->unsignedTinyInteger('start_hour');
            $table->unsignedTinyInteger('end_hour');
            $table->decimal('unit_amount', 10, 2);
            $table->string('kind', 20)->default('ORIGINAL');
            $table->boolean('is_current')->default(true);
            $table->foreignId('added_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['court_id', 'date', 'start_hour', 'is_current'], 'reservation_slots_availability_index');
            $table->index(['reservation_id', 'is_current']);
        });

        Schema::create('reservation_slot_locks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('reservation_slot_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('court_id')->constrained()->restrictOnDelete();
            $table->date('date');
            $table->unsignedTinyInteger('start_hour');
            $table->timestamps();

            $table->unique(['court_id', 'date', 'start_hour'], 'reservation_slot_lock_unique');
        });

        Schema::create('reservation_payments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('reservation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payment_method_id')->nullable()->constrained()->nullOnDelete();
            $table->string('payment_method_name', 120)->nullable();
            $table->string('channel', 20);
            $table->string('kind', 20)->default('INITIAL');
            $table->string('status', 20)->default('PENDING');
            $table->decimal('amount', 12, 2);
            $table->string('reference_number', 180)->nullable()->index();
            $table->string('proof_path')->nullable();
            $table->foreignId('recorded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('verified_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->index(['reservation_id', 'status']);
        });

        Schema::create('reservation_equipment_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('reservation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('rental_equipment_id')->nullable()->constrained('rental_equipment')->nullOnDelete();
            $table->string('name', 120);
            $table->unsignedInteger('quantity');
            $table->decimal('unit_amount', 10, 2);
            $table->string('kind', 20)->default('ORIGINAL');
            $table->boolean('is_active')->default(true);
            $table->foreignId('added_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['reservation_id', 'is_active']);
        });

        Schema::create('reservation_adjustments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('reservation_id')->constrained()->cascadeOnDelete();
            $table->string('type', 40);
            $table->string('description', 255);
            $table->unsignedInteger('quantity')->default(1);
            $table->decimal('unit_amount', 12, 2);
            $table->decimal('total_amount', 12, 2);
            $table->json('metadata')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['reservation_id', 'type']);
        });

        Schema::create('reservation_status_histories', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('reservation_id')->constrained()->cascadeOnDelete();
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30);
            $table->text('reason')->nullable();
            $table->foreignId('changed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['reservation_id', 'created_at']);
        });

        Schema::create('reservation_schedule_histories', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('reservation_id')->constrained()->cascadeOnDelete();
            $table->date('old_booking_date');
            $table->date('new_booking_date');
            $table->json('old_slots');
            $table->json('new_slots');
            $table->decimal('old_slot_amount', 12, 2);
            $table->decimal('new_slot_amount', 12, 2);
            $table->decimal('difference_amount', 12, 2);
            $table->foreignId('performed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('reservation_refunds', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('reservation_id')->constrained()->cascadeOnDelete();
            $table->string('type', 30);
            $table->string('status', 20)->default('DUE');
            $table->decimal('amount', 12, 2);
            $table->text('reason')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservation_refunds');
        Schema::dropIfExists('reservation_schedule_histories');
        Schema::dropIfExists('reservation_status_histories');
        Schema::dropIfExists('reservation_adjustments');
        Schema::dropIfExists('reservation_equipment_items');
        Schema::dropIfExists('reservation_payments');
        Schema::dropIfExists('reservation_slot_locks');
        Schema::dropIfExists('reservation_slots');
        Schema::dropIfExists('reservations');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('availability_closures')) {
            Schema::create('availability_closures', function (Blueprint $table): void {
                $table->id();
                $table->string('type', 20)->index();
                $table->date('date')->index();
                $table->foreignId('court_id')->nullable()->constrained()->restrictOnDelete();
                $table->text('reason');
                $table->boolean('is_active')->default(true)->index();
                $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('reopened_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('reopened_at')->nullable();
                $table->timestamps();

                $table->index(['date', 'type', 'is_active'], 'availability_closure_date_type_active_index');
                $table->index(['court_id', 'date', 'is_active'], 'availability_closure_court_date_active_index');
            });
        }

        if (! Schema::hasTable('availability_closure_periods')) {
            Schema::create('availability_closure_periods', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('availability_closure_id')->constrained()->cascadeOnDelete();
                $table->unsignedTinyInteger('start_hour');
                $table->unsignedTinyInteger('end_hour');
                $table->timestamps();

                $table->unique(['availability_closure_id', 'start_hour'], 'availability_closure_period_start_unique');
            });
        }

        if (! Schema::hasTable('audit_logs')) {
            Schema::create('audit_logs', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('action')->index();
                $table->string('target_type')->nullable();
                $table->string('target_id')->nullable();
                $table->json('before')->nullable();
                $table->json('after')->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->string('user_agent')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        // audit_logs is shared with other management modules and may predate this migration.
        Schema::dropIfExists('availability_closure_periods');
        Schema::dropIfExists('availability_closures');
    }
};

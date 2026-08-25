<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('court_configurations', function (Blueprint $table): void {
            $table->id();
            $table->unsignedTinyInteger('opening_hour');
            $table->unsignedTinyInteger('closing_hour');
            $table->unsignedSmallInteger('included_players_per_court');
            $table->decimal('additional_player_price', 10, 2);
            $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('court_rate_periods', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('court_configuration_id')->constrained()->cascadeOnDelete();
            $table->string('day_type', 10);
            $table->unsignedTinyInteger('start_hour');
            $table->unsignedTinyInteger('end_hour');
            $table->decimal('price', 10, 2);
            $table->unsignedSmallInteger('display_order');
            $table->timestamps();

            $table->unique(['court_configuration_id', 'day_type', 'display_order'], 'court_rate_period_order_unique');
            $table->index(['day_type', 'start_hour', 'end_hour']);
        });

        Schema::create('courts', function (Blueprint $table): void {
            $table->id();
            $table->unsignedInteger('court_number')->unique();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('rental_equipment', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 120);
            $table->decimal('price', 10, 2);
            $table->unsignedInteger('total_quantity');
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rental_equipment');
        Schema::dropIfExists('courts');
        Schema::dropIfExists('court_rate_periods');
        Schema::dropIfExists('court_configurations');
    }
};

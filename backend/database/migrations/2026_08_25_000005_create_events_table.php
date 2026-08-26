<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table): void {
            $table->id();
            $table->string('header', 200);
            $table->string('slug')->unique();
            $table->text('description');
            $table->string('image_path');
            $table->date('event_date');
            $table->string('status', 20)->default('PUBLISHED');
            $table->timestamp('published_at')->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index(['status', 'event_date', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};

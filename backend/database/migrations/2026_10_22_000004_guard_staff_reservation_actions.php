<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table): void {
            $table->unsignedBigInteger('revision')->default(0);
        });
        Schema::create('reservation_action_receipts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->char('key_hash', 64);
            $table->char('request_hash', 64);
            $table->string('action', 32);
            $table->foreignId('reservation_id')->nullable()->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'key_hash']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservation_action_receipts');
        Schema::table('reservations', function (Blueprint $table): void {
            $table->dropColumn('revision');
        });
    }
};

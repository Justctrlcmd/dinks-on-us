<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reservation_email_verifications', function (Blueprint $table): void {
            $table->id();
            $table->char('checkout_key_hash', 64)->unique();
            $table->string('email', 180);
            $table->char('code_hash', 64)->nullable();
            $table->timestamp('code_expires_at')->nullable();
            $table->timestamp('resend_available_at')->nullable();
            $table->unsignedTinyInteger('failed_attempts')->default(0);
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('verification_expires_at')->nullable()->index();
            $table->foreignId('reservation_id')->nullable()->constrained()->restrictOnDelete();
            $table->timestamps();
        });

        Schema::table('reservations', function (Blueprint $table): void {
            $table->timestamp('customer_email_verified_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservation_email_verifications');
        Schema::table('reservations', fn (Blueprint $table) => $table->dropColumn('customer_email_verified_at'));
    }
};

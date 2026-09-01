<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservation_payments', function (Blueprint $table): void {
            $table->timestamp('proof_deleted_at')->nullable()->after('proof_path');
            $table->foreignId('proof_deleted_by_user_id')
                ->nullable()
                ->after('proof_deleted_at')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('reservation_payments', function (Blueprint $table): void {
            $table->dropForeign(['proof_deleted_by_user_id']);
            $table->dropColumn(['proof_deleted_at', 'proof_deleted_by_user_id']);
        });
    }
};

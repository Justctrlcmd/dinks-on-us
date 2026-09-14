<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table): void {
            $table->string('actor_name', 180)->nullable()->after('actor_id');
            $table->string('module', 80)->nullable()->after('action');
            $table->string('target_label', 255)->nullable()->after('target_id');
            $table->index(['module', 'created_at']);
            $table->index(['actor_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table): void {
            $table->dropIndex(['module', 'created_at']);
            $table->dropIndex(['actor_id', 'created_at']);
            $table->dropColumn(['actor_name', 'module', 'target_label']);
        });
    }
};

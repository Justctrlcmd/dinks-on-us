<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table): void {
            $table->unique('name');
        });

        Schema::create('role_modules', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->string('module', 80);
            $table->unique(['role_id', 'module']);
            $table->index('module');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->string('contact_number', 11)->nullable()->after('email');
            $table->timestamp('last_login_at')->nullable()->after('remember_token');
            $table->index(['is_active', 'role_id']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropIndex(['is_active', 'role_id']);
            $table->dropColumn(['contact_number', 'last_login_at']);
        });

        Schema::dropIfExists('role_modules');

        Schema::table('roles', function (Blueprint $table): void {
            $table->dropUnique(['name']);
        });
    }
};

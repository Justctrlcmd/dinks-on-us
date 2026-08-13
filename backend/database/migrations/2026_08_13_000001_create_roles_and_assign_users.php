<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('roles')) {
            Schema::create('roles', function (Blueprint $table): void {
                $table->id();
                $table->string('name');
                $table->string('slug')->unique();
                $table->string('description')->nullable();
                $table->boolean('is_protected')->default(false);
                $table->boolean('is_full_access')->default(false);
                $table->timestamps();
            });
        }

        if (! Schema::hasColumn('users', 'role_id')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->foreignId('role_id')
                    ->nullable()
                    ->after('id')
                    ->constrained()
                    ->nullOnDelete();
            });
        }

        if (! Schema::hasColumn('users', 'is_active')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->boolean('is_active')->default(true)->after('role_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'role_id')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('role_id');
            });
        }

        if (Schema::hasColumn('users', 'is_active')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->dropColumn('is_active');
            });
        }

        Schema::dropIfExists('roles');
    }
};

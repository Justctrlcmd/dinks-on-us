<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gallery_tabs', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 100)->unique();
            $table->unsignedInteger('display_order');
            $table->timestamps();

            $table->index(['display_order', 'id']);
        });

        Schema::create('gallery_images', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('gallery_tab_id')->constrained('gallery_tabs')->cascadeOnDelete();
            $table->string('image_path');
            $table->string('alt_text', 500);
            $table->unsignedInteger('display_order');
            $table->foreignId('uploaded_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index(['gallery_tab_id', 'display_order', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gallery_images');
        Schema::dropIfExists('gallery_tabs');
    }
};

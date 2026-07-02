<?php

// In database/migrations/YYYY_MM_DD_HHMMSS_create_bundle_product_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // This is the pivot table for the many-to-many relationship
        Schema::create('bundle_product', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bundle_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bundle_product');
    }
};


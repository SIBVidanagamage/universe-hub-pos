<?php

// In database/migrations/YYYY_MM_DD_HHMMSS_create_products_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('category');
            $table->string('sku')->unique();
            $table->string('barcode')->unique()->nullable();
            $table->unsignedInteger('quantity')->default(0);
            $table->unsignedInteger('min_stock_level')->default(10);
            $table->decimal('cost_price', 8, 2);
            $table->decimal('selling_price', 8, 2);
            $table->string('supplier')->nullable();
            $table->unsignedInteger('warranty_period_months')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};

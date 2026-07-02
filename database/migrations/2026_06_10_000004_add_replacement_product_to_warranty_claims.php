<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('warranty_claims', function (Blueprint $table) {
            $table->foreignId('replacement_product_id')
                ->nullable()
                ->after('claimed_item_code')
                ->constrained('products')
                ->nullOnDelete();
            $table->unsignedInteger('replacement_quantity')->default(1)->after('replacement_product_id');
            $table->timestamp('returned_stock_added_at')->nullable()->after('replacement_stock_deducted_at');
        });
    }

    public function down(): void
    {
        Schema::table('warranty_claims', function (Blueprint $table) {
            $table->dropForeign(['replacement_product_id']);
            $table->dropColumn([
                'replacement_product_id',
                'replacement_quantity',
                'returned_stock_added_at',
            ]);
        });
    }
};

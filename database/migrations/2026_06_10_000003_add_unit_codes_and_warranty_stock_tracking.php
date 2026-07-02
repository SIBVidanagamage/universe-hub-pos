<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->json('sold_item_codes')->nullable()->after('warranty_expires_at');
        });

        Schema::table('warranty_claims', function (Blueprint $table) {
            $table->string('claimed_item_code')->nullable()->after('claim_number');
            $table->timestamp('replacement_stock_deducted_at')->nullable()->after('resolved_at');
        });
    }

    public function down(): void
    {
        Schema::table('warranty_claims', function (Blueprint $table) {
            $table->dropColumn(['claimed_item_code', 'replacement_stock_deducted_at']);
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropColumn('sold_item_codes');
        });
    }
};

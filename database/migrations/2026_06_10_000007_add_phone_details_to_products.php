<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('product_type')->default('general')->after('category');
            $table->string('phone_brand')->nullable()->after('product_type');
            $table->string('phone_model')->nullable()->after('phone_brand');
            $table->string('phone_color')->nullable()->after('phone_model');
            $table->string('phone_imei')->nullable()->after('phone_color');
            $table->string('phone_storage')->nullable()->after('phone_imei');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'product_type',
                'phone_brand',
                'phone_model',
                'phone_color',
                'phone_imei',
                'phone_storage',
            ]);
        });
    }
};

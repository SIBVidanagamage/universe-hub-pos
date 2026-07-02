<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->decimal('exchange_value', 10, 2)->default(0)->after('discount');
            $table->string('exchange_phone_brand')->nullable()->after('exchange_value');
            $table->string('exchange_phone_model')->nullable()->after('exchange_phone_brand');
            $table->string('exchange_phone_color')->nullable()->after('exchange_phone_model');
            $table->string('exchange_phone_imei')->nullable()->after('exchange_phone_color');
            $table->string('exchange_phone_storage')->nullable()->after('exchange_phone_imei');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn([
                'exchange_value',
                'exchange_phone_brand',
                'exchange_phone_model',
                'exchange_phone_color',
                'exchange_phone_imei',
                'exchange_phone_storage',
            ]);
        });
    }
};

<?php

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
        Schema::table('sales', function (Blueprint $table) {
            $table->string('payment_method')->nullable()->change();
            $table->decimal('payment_cash', 10, 2)->default(0)->after('payment_method');
            $table->decimal('payment_card', 10, 2)->default(0)->after('payment_cash');
            $table->decimal('payment_transfer', 10, 2)->default(0)->after('payment_card');
            $table->decimal('payment_koko', 10, 2)->default(0)->after('payment_transfer');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn(['payment_cash', 'payment_card', 'payment_transfer', 'payment_koko']);
            $table->string('payment_method')->nullable(false)->change();
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cash_transactions', function (Blueprint $table) {
            $table->foreignId('sale_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            $table->string('source')->default('manual')->after('type');
            $table->decimal('profit', 12, 2)->nullable()->after('amount');
            $table->json('item_summary')->nullable()->after('profit');
        });
    }

    public function down(): void
    {
        Schema::table('cash_transactions', function (Blueprint $table) {
            $table->dropForeign(['sale_id']);
            $table->dropColumn(['sale_id', 'source', 'profit', 'item_summary']);
        });
    }
};

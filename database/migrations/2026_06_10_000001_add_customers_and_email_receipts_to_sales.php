<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->timestamps();
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->foreignId('customer_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            $table->string('customer_email')->nullable()->after('customer_name');
            $table->string('customer_phone')->nullable()->after('customer_email');
            $table->timestamp('receipt_emailed_at')->nullable()->after('profit');
            $table->text('receipt_email_error')->nullable()->after('receipt_emailed_at');
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->unsignedInteger('warranty_months')->default(0)->after('discount');
            $table->date('warranty_expires_at')->nullable()->after('warranty_months');
        });
    }

    public function down(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropColumn(['warranty_months', 'warranty_expires_at']);
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->dropConstrainedForeignId('customer_id');
            $table->dropColumn([
                'customer_email',
                'customer_phone',
                'receipt_emailed_at',
                'receipt_email_error',
            ]);
        });

        Schema::dropIfExists('customers');
    }
};

<?php


use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->onDelete('cascade');

            // This is a polymorphic relationship to handle both Products and Bundles
            $table->morphs('saleable');

            $table->integer('quantity');
            $table->decimal('price_at_sale', 8, 2); // Price of the item/bundle when sold
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_items');
    }
};

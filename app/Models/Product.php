<?php

// In app/Models/Product.php (Add this new method to your existing Product model)

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;
    protected $guarded = [];

    /**
     * The bundles that contain the product.
     */
    public function bundles()
    {
        return $this->belongsToMany(Bundle::class);
    }
}


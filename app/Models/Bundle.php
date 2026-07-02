<?php

// In app/Models/Bundle.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Bundle extends Model
{
    use HasFactory;
    protected $guarded = [];

    /**
     * The products that belong to the bundle.
     */
    public function products()
    {
        return $this->belongsToMany(Product::class);
    }
}

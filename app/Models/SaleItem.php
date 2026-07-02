<?php



namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SaleItem extends Model
{
    use HasFactory;
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'sold_item_codes' => 'array',
            'warranty_expires_at' => 'date',
        ];
    }

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    /**
     * Get the parent saleable model (Product or Bundle).
     */
    public function saleable()
    {
        return $this->morphTo();
    }

    public function warrantyClaims()
    {
        return $this->hasMany(WarrantyClaim::class);
    }
}

<?php

// In app/Http/Controllers/Api/V1/ProductController.php

namespace App\Http\Controllers\Api\V1;

use App\Models\Product;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Product::all();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:255',
            'product_type' => ['nullable', Rule::in(['general', 'phone'])],
            'phone_brand' => 'nullable|string|max:255',
            'phone_model' => 'nullable|string|max:255',
            'phone_color' => 'nullable|string|max:255',
            'phone_imei' => 'nullable|string|max:255',
            'phone_storage' => 'nullable|string|max:255',
            'sku' => 'required|string|max:255|unique:products',
            'quantity' => 'required|integer|min:0',
            'min_stock_level' => 'required|integer|min:0',
            'cost_price' => 'required|numeric|min:0',
            'selling_price' => 'required|numeric|min:0',
            'supplier' => 'nullable|string|max:255',
            'serial_number' => 'nullable|string|max:255',
            'warranty_period_months' => 'required|integer|min:0',
        ]);

        $validated = $this->normalizePhoneDetails($validated);

        // Generate a barcode based on SKU
        $validated['barcode'] = $validated['sku'];

        $product = Product::create($validated);

        return response()->json($product, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Product $product)
    {
        return $product;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:255',
            'product_type' => ['nullable', Rule::in(['general', 'phone'])],
            'phone_brand' => 'nullable|string|max:255',
            'phone_model' => 'nullable|string|max:255',
            'phone_color' => 'nullable|string|max:255',
            'phone_imei' => 'nullable|string|max:255',
            'phone_storage' => 'nullable|string|max:255',
            'sku' => ['required', 'string', 'max:255', Rule::unique('products')->ignore($product->id)],
            'quantity' => 'required|integer|min:0',
            'min_stock_level' => 'required|integer|min:0',
            'cost_price' => 'required|numeric|min:0',
            'selling_price' => 'required|numeric|min:0',
            'supplier' => 'nullable|string|max:255',
            'serial_number' => 'nullable|string|max:255',
            'warranty_period_months' => 'required|integer|min:0',
        ]);

        $validated = $this->normalizePhoneDetails($validated);

        $product->update($validated);

        return response()->json($product);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Product $product)
    {
        $product->delete();
        return response()->json(null, 204);
    }

    private function normalizePhoneDetails(array $validated): array
    {
        $validated['product_type'] = $validated['product_type'] ?? 'general';

        if ($validated['product_type'] !== 'phone') {
            $validated['phone_brand'] = null;
            $validated['phone_model'] = null;
            $validated['phone_color'] = null;
            $validated['phone_imei'] = null;
            $validated['phone_storage'] = null;
        }

        return $validated;
    }
}

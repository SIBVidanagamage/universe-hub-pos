<?php

// Create this new controller file at app/Http/Controllers/Api/V1/BundleController.php
// Command: php artisan make:controller Api/V1/BundleController --api

namespace App\Http\Controllers\Api\V1;

use App\Models\Bundle;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class BundleController extends Controller
{
    public function index()
    {
        // Eager load the products with each bundle
        return Bundle::with('products')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:bundles',
            'price' => 'required|numeric|min:0',
            'product_ids' => 'required|array',
            'product_ids.*' => 'exists:products,id', // Ensure all provided IDs exist
        ]);

        $bundle = Bundle::create([
            'name' => $validated['name'],
            'price' => $validated['price'],
        ]);

        // Attach the products to the bundle using the pivot table
        $bundle->products()->attach($validated['product_ids']);

        return response()->json($bundle->load('products'), 201);
    }

    public function show(Bundle $bundle)
    {
        return $bundle->load('products');
    }

    public function update(Request $request, Bundle $bundle)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', \Illuminate\Validation\Rule::unique('bundles')->ignore($bundle->id)],
            'price' => 'required|numeric|min:0',
            'product_ids' => 'required|array',
            'product_ids.*' => 'exists:products,id',
        ]);

        $bundle->update([
            'name' => $validated['name'],
            'price' => $validated['price'],
        ]);

        // Sync ensures the pivot table matches the provided list of IDs
        $bundle->products()->sync($validated['product_ids']);

        return response()->json($bundle->load('products'));
    }

    public function destroy(Bundle $bundle)
    {
        // Detach all products before deleting the bundle
        $bundle->products()->detach();
        $bundle->delete();

        return response()->json(null, 204);
    }
}

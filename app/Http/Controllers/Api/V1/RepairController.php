<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Repair;
use Illuminate\Http\Request;

class RepairController extends Controller
{
    public function index()
    {
        return response()->json(Repair::latest()->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_name' => 'required|string|max:255',
            'customer_phone' => 'required|string|max:255',
            'device' => 'required|string|max:255',
            'imei' => 'nullable|string|max:255',
            'issue' => 'required|string',
            'cost' => 'nullable|numeric|min:0',
            'status' => 'nullable|string|in:Pending,Diagnosing,Repaired,Delivered'
        ]);

        $repair = Repair::create($validated);
        return response()->json($repair, 201);
    }

    public function show(Repair $repair)
    {
        return response()->json($repair);
    }

    public function update(Request $request, Repair $repair)
    {
        $validated = $request->validate([
            'customer_name' => 'required|string|max:255',
            'customer_phone' => 'required|string|max:255',
            'device' => 'required|string|max:255',
            'imei' => 'nullable|string|max:255',
            'issue' => 'required|string',
            'cost' => 'nullable|numeric|min:0',
            'status' => 'required|string|in:Pending,Diagnosing,Repaired,Delivered'
        ]);

        $repair->update($validated);
        return response()->json($repair);
    }

    public function destroy(Repair $repair)
    {
        $repair->delete();
        return response()->noContent();
    }
}

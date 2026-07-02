<?php

// In app/Http/Controllers/Api/V1/StaffController.php

namespace App\Http\Controllers\Api\V1;

use App\Models\User;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class StaffController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        Log::info('StaffController@index was executed.');
        $staff = User::where('id', '!=', Auth::id())->get();
        return response()->json($staff);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        Log::info('StaffController@store was executed.');
        $validated = $request->validate([
            'fullName' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => ['required', 'string', Rule::in(['admin', 'manager', 'cashier', 'viewer'])],
            'phone' => 'nullable|string|max:20',
        ]);

        $user = User::create([
            'name' => $validated['fullName'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'phone' => $validated['phone'],
        ]);

        return response()->json($user, 201);
    }

    /**
     * Display the specified resource.
     * The variable name $staff now matches the route parameter {staff}
     */
    public function show(User $staff)
    {
        Log::info('StaffController@show was executed for user ID: ' . $staff->id);
        return response()->json($staff);
    }

    /**
     * Update the specified resource in storage.
     * The variable name $staff now matches the route parameter {staff}
     */
    public function update(Request $request, User $staff)
    {


        $validated = $request->validate([
            'fullName' => 'required|string|max:255',
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($staff->id)],
            'role' => ['required', 'string', Rule::in(['admin', 'manager', 'cashier', 'viewer'])],
            'phone' => 'nullable|string|max:20',
            'password' => 'nullable|string|min:8',
        ]);

        $staff->update([
            'name' => $validated['fullName'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'phone' => $validated['phone'],
        ]);

        if (!empty($validated['password'])) {
            $staff->update(['password' => Hash::make($validated['password'])]);
        }

        return response()->json($staff);
    }

    /**
     * Remove the specified resource from storage.
     * The variable name $staff now matches the route parameter {staff}
     */
    public function destroy(User $staff)
    {
        Log::info('StaffController@destroy was executed for user ID: ' . $staff->id);
        if ($staff->id === Auth::id()) {
            return response()->json(['message' => 'You cannot delete your own account.'], 403);
        }

        $staff->delete();

        return response()->json(null, 204);
    }
}

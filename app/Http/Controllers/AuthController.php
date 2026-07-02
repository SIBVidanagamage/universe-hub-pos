<?php
namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    // Login Function
    public function login(Request $request)
    {
        // Validate incoming request
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        // Attempt to log the user in
        $user = User::where('email', $request->email)->first();

        if ($user && Hash::check($request->password, $user->password)) {
            // Issue a token for the authenticated user
            $token = $user->createToken('phone-shop-token')->plainTextToken;

            return response()->json([
                'message' => 'Login successful',
                'token'   => $token,
            ]);
        }

        return response()->json(['message' => 'Invalid credentials'], 401);
    }

    // Register Function
    public function register(Request $request)
    {
        // Validate incoming request
        $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        // Create the user
        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password), // Hashing the password
        ]);

        // Issue a token for the new user
        $token = $user->createToken('phone-shop-token')->plainTextToken;

        return response()->json([
            'message' => 'Registration successful',
            'token'   => $token,
        ], 201);
    }

    // Logout Function
    public function logout(Request $request)
    {
        // Check if the user is authenticated
        $user = $request->user();

        if ($user) {
            // Revoke the user's token
            $user->tokens->each(function ($token) {
                $token->delete();
            });

            return response()->json(['message' => 'Logged out successfully']);
        }

        // If the user is not authenticated
        return response()->json(['message' => 'Unauthorized'], 401);
    }

}

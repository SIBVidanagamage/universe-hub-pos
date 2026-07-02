<?php
// app/Http/Controllers/DashboardController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        // Return dashboard data
        return response()->json([
            'user' => $request->user(), // Example: User info
            'someData' => 'Some data for dashboard',
        ]);
    }
}

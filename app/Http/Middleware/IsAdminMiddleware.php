<?php

// Step 1: Create the Middleware File (No Change)
// Run this command in your terminal:
// php artisan make:middleware IsAdminMiddleware
// This will create the file at app/Http/Middleware/IsAdminMiddleware.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class IsAdminMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Check if the user is authenticated and if their role is 'admin'
        if (Auth::check() && Auth::user()->role === 'admin') {
            // If they are an admin, allow the request to proceed to the controller
            return $next($request);
        }

        // If not an admin, abort the request with a 403 Forbidden error
        abort(403, 'Unauthorized action.');
    }
}

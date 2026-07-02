<?php

// Step 5 (Optional but Recommended): Clean up your AuthServiceProvider.php (No Change)

namespace App\Providers;

use Illuminate\Support\ServiceProvider; // Correct base class for L11

class AuthServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // You can now remove the Gate definition as it's no longer used
        // REMOVED: Gate::define('is-admin', ...);
    }
}

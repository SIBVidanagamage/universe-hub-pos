<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Customer;
use App\Mail\PromotionMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class PromotionController extends Controller
{
    public function getSettings()
    {
        return response()->json([
            'MAIL_USERNAME' => env('MAIL_USERNAME', ''),
            'MAIL_PASSWORD' => env('MAIL_PASSWORD') ? '********' : '',
        ]);
    }

    public function updateSettings(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $envPath = base_path('.env');
        
        if (File::exists($envPath)) {
            $env = File::get($envPath);
            
            // We specifically want to update Gmail settings
            $env = preg_replace('/MAIL_MAILER=(.*)/', 'MAIL_MAILER=smtp', $env);
            $env = preg_replace('/MAIL_HOST=(.*)/', 'MAIL_HOST=smtp.gmail.com', $env);
            $env = preg_replace('/MAIL_PORT=(.*)/', 'MAIL_PORT=465', $env);
            $env = preg_replace('/MAIL_USERNAME=(.*)/', 'MAIL_USERNAME=' . $request->email, $env);
            
            // Only update password if a new one is provided (not stars)
            if ($request->password !== '********') {
                $password = str_contains($request->password, ' ') ? '"'.$request->password.'"' : $request->password;
                $env = preg_replace('/MAIL_PASSWORD=(.*)/', 'MAIL_PASSWORD=' . $password, $env);
            }
            
            $env = preg_replace('/MAIL_ENCRYPTION=(.*)/', 'MAIL_ENCRYPTION=ssl', $env);
            $env = preg_replace('/MAIL_FROM_ADDRESS=(.*)/', 'MAIL_FROM_ADDRESS="' . $request->email . '"', $env);
            $env = preg_replace('/MAIL_FROM_NAME=(.*)/', 'MAIL_FROM_NAME="Universe Hub"', $env);

            File::put($envPath, $env);
            
            return response()->json(['message' => 'Email settings updated successfully.']);
        }
        
        return response()->json(['message' => '.env file not found.'], 500);
    }

    public function sendPromotion(Request $request)
    {
        $request->validate([
            'subject' => 'required|string|max:255',
            'message' => 'required|string',
            'image' => 'nullable|image|max:5120', // max 5MB
        ]);

        if (!env('MAIL_USERNAME') || !env('MAIL_PASSWORD')) {
            return response()->json(['message' => 'Please configure your email settings first.'], 400);
        }

        $subject = $request->input('subject');
        $messageBody = $request->input('message');

        $imagePath = null;
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('promotions', 'public');
            $imagePath = storage_path('app/public/' . $path);
        }

        $customers = Customer::whereNotNull('email')->where('email', '!=', '')->get()->unique('email');

        $sentCount = 0;

        foreach ($customers as $customer) {
            try {
                Mail::to($customer->email)->send(new PromotionMail($subject, $messageBody, $imagePath));
                $sentCount++;
            } catch (\Exception $e) {
                Log::error("Failed to send promotion to {$customer->email}: " . $e->getMessage());
            }
        }

        return response()->json([
            'message' => "Promotions sent successfully to {$sentCount} customers."
        ]);
    }
}

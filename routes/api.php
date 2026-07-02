<?php

// routes/api.php

use App\Http\Controllers\Api\V1\BundleController;
use App\Http\Controllers\Api\V1\CashTransactionController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\SaleController;
use App\Http\Controllers\Api\V1\StaffController;
use App\Http\Controllers\Api\V1\WarrantyClaimController;
use App\Http\Controllers\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('login', [AuthController::class, 'login']);
Route::post('register', [AuthController::class, 'register']); // Register Route
// Route::post('logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');

// Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
//     return $request->user();
// });

Route::middleware('auth:sanctum')->group(function () {
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Apply the 'is.admin' middleware to the staff resource routes
    Route::apiResource('v1/staff', StaffController::class)->middleware('is.admin');
    Route::get('v1/cash-transactions', [CashTransactionController::class, 'index'])->middleware('is.admin');
    Route::post('v1/cash-transactions', [CashTransactionController::class, 'store']);
    // Add Inventory (Product) Management Routes
    Route::apiResource('v1/products', ProductController::class);
    // Add Bundle Management Routes
    Route::apiResource('v1/bundles', BundleController::class);
    Route::apiResource('v1/sales', SaleController::class)->only(['index', 'store', 'destroy']);
    Route::post('v1/warranty-claims/{warranty_claim}/return-stock', [WarrantyClaimController::class, 'returnStock'])->middleware('is.admin');
    Route::apiResource('v1/warranty-claims', WarrantyClaimController::class)->only(['index', 'store', 'update']);
    Route::get('/sales/stats', [SaleController::class, 'stats']);

    // Premium POS Routes
    Route::apiResource('v1/repairs', \App\Http\Controllers\Api\V1\RepairController::class);
    Route::get('v1/customers/search', [\App\Http\Controllers\Api\V1\CustomerController::class, 'search']);
    Route::apiResource('v1/customers', \App\Http\Controllers\Api\V1\CustomerController::class);
    Route::apiResource('v1/suppliers', \App\Http\Controllers\Api\V1\SupplierController::class)->middleware('is.admin');

    // Promotions and Email Settings
    Route::get('v1/settings/email', [\App\Http\Controllers\Api\V1\PromotionController::class, 'getSettings'])->middleware('is.admin');
    Route::post('v1/settings/email', [\App\Http\Controllers\Api\V1\PromotionController::class, 'updateSettings'])->middleware('is.admin');
    Route::post('v1/promotions/send', [\App\Http\Controllers\Api\V1\PromotionController::class, 'sendPromotion'])->middleware('is.admin');
});

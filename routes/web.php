<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});


// Add this catch-all route at the end
Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '.*');

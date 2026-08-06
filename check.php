<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$tables = ['sales', 'sale_items', 'customers'];
foreach($tables as $table) {
    echo "--- $table ---\n";
    $columns = DB::select("SELECT column_name FROM information_schema.columns WHERE table_name = '$table'");
    foreach($columns as $col) {
        echo $col->column_name . "\n";
    }
}

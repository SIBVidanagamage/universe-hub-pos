<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

DB::statement("SELECT setval(pg_get_serial_sequence('migrations', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM migrations;");
echo "Migrations sequence fixed\n";

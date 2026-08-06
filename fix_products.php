<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$statements = [
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type VARCHAR(255) DEFAULT 'general';",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS phone_brand VARCHAR(255) NULL;",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS phone_model VARCHAR(255) NULL;",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS phone_color VARCHAR(255) NULL;",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS phone_imei VARCHAR(255) NULL;",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS phone_storage VARCHAR(255) NULL;",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS serial_number VARCHAR(255) NULL;"
];

foreach ($statements as $sql) {
    try {
        DB::statement($sql);
        echo "Executed: $sql\n";
    } catch (Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
    }
}

// Reload schema cache
try {
    DB::statement("NOTIFY pgrst, 'reload schema';");
    echo "Reloaded PostgREST schema cache.\n";
} catch (Exception $e) {
    echo "Error reloading schema: " . $e->getMessage() . "\n";
}

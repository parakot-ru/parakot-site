<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/src/bootstrap.php';

$connection = Database::connection();

try {
    $connection->exec('ALTER TABLE site_settings ADD COLUMN logo_url VARCHAR(255) DEFAULT NULL AFTER site_title');
} catch (Throwable $exception) {
    if (strpos($exception->getMessage(), 'Duplicate column') === false) {
        throw $exception;
    }
}

$statement = $connection->prepare(
    'UPDATE site_settings
     SET logo_url = :logo_url
     WHERE id = 1 AND (logo_url IS NULL OR logo_url = "")'
);
$statement->execute([
    ':logo_url' => '/assets/parakot-logo.webp',
]);

echo "Site logo migration applied.\n";

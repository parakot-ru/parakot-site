<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/src/bootstrap.php';

try {
    $pdo = Database::connection();
    $version = $pdo->query('SELECT VERSION() AS version')->fetch();

    echo "DB connection successful\n";
    echo 'Server version: ' . ($version['version'] ?? 'unknown') . "\n";
} catch (Throwable $exception) {
    fwrite(STDERR, 'DB connection failed: ' . $exception->getMessage() . "\n");
    exit(1);
}

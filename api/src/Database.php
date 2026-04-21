<?php

declare(strict_types=1);

final class Database
{
    /** @var ?PDO */
    private static $connection = null;

    public static function connection(): PDO
    {
        if (self::$connection instanceof PDO) {
            return self::$connection;
        }

        $host = Env::get('DB_HOST', '127.0.0.1');
        $port = Env::get('DB_PORT', '3306');
        $dbName = Env::get('DB_NAME');
        $username = Env::get('DB_USER');
        $password = Env::get('DB_PASSWORD');
        $charset = Env::get('DB_CHARSET', 'utf8mb4');

        if ($dbName === null || $username === null || $password === null) {
            throw new RuntimeException('Database credentials are incomplete.');
        }

        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            $host,
            $port,
            $dbName,
            $charset
        );

        self::$connection = new PDO($dsn, $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);

        return self::$connection;
    }
}

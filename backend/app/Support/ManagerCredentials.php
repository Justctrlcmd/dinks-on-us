<?php

namespace App\Support;

use RuntimeException;

class ManagerCredentials
{
    /** @return array{name: string, email: string, password: string} */
    public static function configured(bool $production = false): array
    {
        $name = trim((string) config('manager.default.name'));
        $email = trim((string) config('manager.default.email'));
        $password = (string) config('manager.default.password');

        if ($name === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8 || strlen($password) > 255
            || ($production && ($password === 'DinksManager2026!' || str_ends_with(strtolower($email), '.test')))) {
            throw new RuntimeException('Configure Manager credentials with a real email and a private password of at least eight characters before production seeding or reset.');
        }

        return compact('name', 'email', 'password');
    }
}

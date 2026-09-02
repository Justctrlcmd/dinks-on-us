<?php

namespace App\Support\Security;

use Illuminate\Validation\Rules\Password;

final class PasswordRules
{
    public const MIN_LENGTH = 8;

    public const MAX_LENGTH = 255;

    /** @return list<mixed> */
    public static function create(bool $confirmed = true): array
    {
        return array_values(array_filter([
            'required',
            'string',
            Password::min(self::MIN_LENGTH),
            'max:'.self::MAX_LENGTH,
            $confirmed ? 'confirmed' : null,
        ]));
    }
}

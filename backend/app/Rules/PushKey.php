<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class PushKey implements ValidationRule
{
    public function __construct(private readonly int $bytes) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $decoded = is_string($value) && preg_match('/^[A-Za-z0-9_-]+={0,2}$/D', $value)
            ? base64_decode(strtr($value, '-_', '+/'), true) : false;
        if ($decoded === false || strlen($decoded) !== $this->bytes
            || ($this->bytes === 65 && $decoded[0] !== "\x04")) {
            $fail('The browser notification key is invalid. Please enable notifications again.');
        }
    }
}

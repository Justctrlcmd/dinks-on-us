<?php

namespace App\Http\Requests\Concerns;

trait NormalizesInput
{
    protected function normalizedText(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }

        return preg_replace('/\s+/u', ' ', trim($value));
    }

    protected function normalizedEmail(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }

        return mb_strtolower(trim($value));
    }

    protected function normalizedMultilineText(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }

        return trim(str_replace(["\r\n", "\r"], "\n", $value));
    }
}

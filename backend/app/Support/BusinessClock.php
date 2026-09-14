<?php

namespace App\Support;

use Carbon\CarbonImmutable;

final class BusinessClock
{
    public static function timezone(): string
    {
        return (string) config('business.timezone', 'Asia/Manila');
    }

    public static function now(): CarbonImmutable
    {
        return CarbonImmutable::now(self::timezone());
    }

    public static function today(): string
    {
        return self::now()->toDateString();
    }

    public static function todayOrLaterRule(): string
    {
        return 'after_or_equal:'.self::today();
    }
}

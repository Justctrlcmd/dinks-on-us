<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class PushEndpoint implements ValidationRule
{
    public static function allowed(string $endpoint): bool
    {
        $url = parse_url($endpoint);
        if (! is_array($url) || ($url['scheme'] ?? '') !== 'https'
            || isset($url['user']) || isset($url['pass']) || isset($url['fragment'])
            || (isset($url['port']) && $url['port'] !== 443)
            || empty($url['path']) || $url['path'] === '/') {
            return false;
        }

        $host = strtolower($url['host'] ?? '');

        return in_array($host, ['fcm.googleapis.com', 'updates.push.services.mozilla.com'], true)
            || preg_match('/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:push\.apple\.com|notify\.windows\.com)$/D', $host) === 1;
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! self::allowed($value)) {
            $fail('This browser notification service is not supported.');
        }
    }
}

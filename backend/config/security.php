<?php

$csv = static fn (string $value): array => array_values(array_filter(array_map(
    static fn (string $item): string => trim($item),
    explode(',', $value),
)));

return [
    'trusted_proxies' => $csv((string) env('TRUSTED_PROXIES', '')),
    'trusted_hosts' => $csv((string) env('TRUSTED_HOSTS', '')),
    'hsts_enabled' => (bool) env('SECURITY_HSTS_ENABLED', false),
    'rate_limits' => [
        'api_per_minute' => (int) env('RATE_LIMIT_API_PER_MINUTE', 180),
        'authenticated_per_minute' => (int) env('RATE_LIMIT_AUTHENTICATED_PER_MINUTE', 120),
        'management_per_minute' => (int) env('RATE_LIMIT_MANAGEMENT_PER_MINUTE', 90),
        'public_read_per_minute' => (int) env('RATE_LIMIT_PUBLIC_READ_PER_MINUTE', 90),
        'reservation_options_per_minute' => (int) env('RATE_LIMIT_RESERVATION_OPTIONS_PER_MINUTE', 45),
        'reservation_submit_per_minute' => (int) env('RATE_LIMIT_RESERVATION_SUBMIT_PER_MINUTE', 10),
        'reservation_submit_per_hour' => (int) env('RATE_LIMIT_RESERVATION_SUBMIT_PER_HOUR', 30),
        'reservation_identity_per_hour' => (int) env('RATE_LIMIT_RESERVATION_IDENTITY_PER_HOUR', 10),
        'login_account_per_minute' => (int) env('RATE_LIMIT_LOGIN_ACCOUNT_PER_MINUTE', 5),
        'login_ip_per_minute' => (int) env('RATE_LIMIT_LOGIN_IP_PER_MINUTE', 20),
        'reports_per_minute' => (int) env('RATE_LIMIT_REPORTS_PER_MINUTE', 30),
        'uploads_per_minute' => (int) env('RATE_LIMIT_UPLOADS_PER_MINUTE', 20),
        'proof_downloads_per_minute' => (int) env('RATE_LIMIT_PROOF_DOWNLOADS_PER_MINUTE', 60),
        'destructive_per_minute' => (int) env('RATE_LIMIT_DESTRUCTIVE_PER_MINUTE', 10),
        'proof_cleanup_per_minute' => (int) env('RATE_LIMIT_PROOF_CLEANUP_PER_MINUTE', 2),
    ],
];

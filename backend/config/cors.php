<?php

$usesLocalOrigins = in_array(env('APP_ENV', 'production'), ['local', 'testing'], true);

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_origins' => array_values(array_unique(array_filter([
        env('FRONTEND_URL', 'http://localhost:3000'),
        ...($usesLocalOrigins ? ['http://127.0.0.1:3000'] : []),
    ]))),
    'allowed_origins_patterns' => $usesLocalOrigins
        ? ['#^https?://(?:localhost|127\.0\.0\.1)(?::\d+)?$#']
        : [],
    'allowed_headers' => [
        'Accept',
        'Content-Type',
        'Idempotency-Key',
        'Origin',
        'X-Requested-With',
        'X-XSRF-TOKEN',
    ],
    'exposed_headers' => [],
    'max_age' => 600,
    'supports_credentials' => true,
];

<?php

return [
    'mail_queue_connection' => env('RESERVATION_MAIL_QUEUE_CONNECTION', 'database'),
    'emails_enabled' => (bool) env('RESERVATION_EMAILS_ENABLED', false),
    'email_verification' => [
        'code_minutes' => 10,
        'resend_seconds' => 60,
        'max_attempts' => 5,
        'checkout_minutes' => 30,
    ],
];

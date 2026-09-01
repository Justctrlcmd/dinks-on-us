<?php

return [
    'enabled' => (bool) env('PUSH_NOTIFICATIONS_ENABLED', false),
    'subject' => env('PUSH_VAPID_SUBJECT', 'mailto:hello@dinksonus.test'),
    'public_key' => env('PUSH_VAPID_PUBLIC_KEY'),
    'private_key' => env('PUSH_VAPID_PRIVATE_KEY'),
];

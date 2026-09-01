<?php

namespace App\Services;

use App\Models\PushSubscription;
use App\Models\User;

class PushSubscriptionService
{
    /** @param array<string, mixed> $input */
    public function store(User $user, array $input): PushSubscription
    {
        $endpoint = (string) $input['endpoint'];
        $subscription = PushSubscription::query()->updateOrCreate(
            ['endpoint_hash' => hash('sha256', $endpoint)],
            [
                'user_id' => $user->id,
                'endpoint' => $endpoint,
                'public_key' => $input['keys']['p256dh'],
                'auth_token' => $input['keys']['auth'],
                'content_encoding' => $input['content_encoding'] ?? 'aes128gcm',
                'expiration_time' => $input['expiration_time'] ?? null,
                'failed_at' => null,
            ],
        );

        return $subscription;
    }

    public function delete(User $user, string $endpoint): void
    {
        PushSubscription::query()
            ->where('user_id', $user->id)
            ->where('endpoint_hash', hash('sha256', $endpoint))
            ->delete();
    }
}

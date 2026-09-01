<?php

namespace App\Services;

use App\Models\PushSubscription;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;
use Throwable;

class PushNotificationService
{
    public function notifyNewReservation(Reservation $reservation): void
    {
        if (! config('push.enabled') || blank(config('push.public_key')) || blank(config('push.private_key'))) {
            return;
        }

        $users = User::query()
            ->where('is_active', true)
            ->where(function ($query): void {
                $query->whereHas('role', fn ($role) => $role->where('is_full_access', true))
                    ->orWhereHas('role.modules', fn ($modules) => $modules->where('module', 'RESERVATION'));
            })
            ->whereHas('pushSubscriptions', fn ($subscriptions) => $subscriptions->whereNull('failed_at'))
            ->with(['pushSubscriptions' => fn ($subscriptions) => $subscriptions->whereNull('failed_at')])
            ->get();

        if ($users->isEmpty()) {
            return;
        }

        $webPush = new WebPush([
            'VAPID' => [
                'subject' => config('push.subject'),
                'publicKey' => config('push.public_key'),
                'privateKey' => config('push.private_key'),
            ],
        ], ['TTL' => 300, 'urgency' => 'high', 'topic' => 'new-reservation']);

        $payload = json_encode([
            'title' => 'New reservation received',
            'body' => 'A reservation is waiting for payment review.',
            'url' => '/portal/reservations',
            'tag' => 'new-reservation',
            'reservation_id' => $reservation->id,
        ], JSON_THROW_ON_ERROR);

        foreach ($users as $user) {
            foreach ($user->pushSubscriptions as $subscription) {
                $this->send($webPush, $subscription, $payload);
            }
        }
    }

    private function send(WebPush $webPush, PushSubscription $subscription, string $payload): void
    {
        try {
            $report = $webPush->sendOneNotification(Subscription::create([
                'endpoint' => $subscription->endpoint,
                'keys' => ['p256dh' => $subscription->public_key, 'auth' => $subscription->auth_token],
                'contentEncoding' => $subscription->content_encoding,
            ]), $payload);

            if ($report->isSubscriptionExpired()) {
                $subscription->delete();

                return;
            }

            if ($report->isSuccess()) {
                $subscription->forceFill(['last_used_at' => now(), 'failed_at' => null])->save();
            } else {
                $subscription->forceFill(['failed_at' => now()])->save();
                Log::warning('Push notification delivery failed.', ['push_subscription_id' => $subscription->id, 'reason' => $report->getReason()]);
            }
        } catch (Throwable $exception) {
            Log::warning('Push notification delivery raised an exception.', ['push_subscription_id' => $subscription->id, 'exception' => $exception::class]);
            $subscription->forceFill(['failed_at' => now()])->save();
        }
    }
}

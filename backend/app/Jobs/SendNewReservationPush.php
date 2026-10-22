<?php

namespace App\Jobs;

use App\Models\Reservation;
use App\Services\PushNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendNewReservationPush implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 30;

    public function __construct(public readonly int $reservationId, public readonly ?int $subscriptionId = null)
    {
        $this->onConnection(config('push.queue_connection', 'database'));
        $this->onQueue('push');
    }

    public function backoff(): array
    {
        return [30, 120];
    }

    public function handle(PushNotificationService $service): void
    {
        $reservation = Reservation::query()->find($this->reservationId);
        if (! $reservation || $reservation->status !== Reservation::STATUS_PENDING) {
            return;
        }

        $service->notifyNewReservation($reservation, $this->subscriptionId);
    }
}

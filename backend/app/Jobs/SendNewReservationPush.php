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

    public function __construct(public readonly int $reservationId) {}

    public function handle(PushNotificationService $service): void
    {
        $reservation = Reservation::query()->find($this->reservationId);
        if (! $reservation || $reservation->status !== Reservation::STATUS_PENDING) {
            return;
        }

        $service->notifyNewReservation($reservation);
    }
}

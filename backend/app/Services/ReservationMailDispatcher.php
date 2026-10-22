<?php

namespace App\Services;

use App\Jobs\SendReservationStatusMail;
use App\Models\Reservation;
use Illuminate\Support\Facades\Log;
use Throwable;

class ReservationMailDispatcher
{
    public function dispatch(Reservation $reservation, string $event): void
    {
        if ($reservation->actionWasReplayed || ! in_array($event, ['verified', 'rejected', 'rescheduled', 'completed', 'cancelled', 'no_show'], true)
            || ! config('reservations.emails_enabled')) {
            return;
        }

        try {
            $snapshot = $reservation->loadMissing('currentSlots.court', 'equipmentItems', 'adjustments', 'payments', 'refunds', 'scheduleHistories');
            if (config('reservations.mail_queue_connection') === 'sync') {
                SendReservationStatusMail::dispatchSync($snapshot, $event);
            } else {
                SendReservationStatusMail::dispatch($snapshot, $event)->afterCommit();
            }
        } catch (Throwable $exception) {
            Log::error('Reservation email dispatch failed.', [
                'reservation_id' => $reservation->id, 'event' => $event,
                'exception' => $exception::class,
            ]);
        }
    }
}

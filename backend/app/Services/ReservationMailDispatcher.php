<?php

namespace App\Services;

use App\Mail\ReservationStatusMail;
use App\Models\Reservation;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class ReservationMailDispatcher
{
    public function dispatch(Reservation $reservation, string $event): void
    {
        if (! in_array($event, ['verified', 'rejected', 'rescheduled'], true)
            || ! config('reservations.emails_enabled')) {
            return;
        }

        try {
            Mail::to($reservation->customer_email)->send(new ReservationStatusMail($reservation->loadMissing('currentSlots.court', 'equipmentItems', 'adjustments', 'payments'), $event));
        } catch (Throwable $exception) {
            Log::error('Reservation email delivery failed.', [
                'reservation_id' => $reservation->id, 'event' => $event,
                'exception' => $exception::class,
            ]);
        }
    }
}

<?php

namespace App\Jobs;

use App\Mail\ReservationStatusMail;
use App\Models\Reservation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Mail;
use RuntimeException;
use Throwable;

class SendReservationStatusMail implements ShouldBeEncrypted, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    // Intentionally retain the event-time model and its loaded relations.
    // SerializesModels would reload a later schedule/status during a retry.
    public int $tries = 3;

    public int $timeout = 30;

    public function __construct(public readonly Reservation $reservation, public readonly string $event)
    {
        $this->onConnection(config('reservations.mail_queue_connection', 'database'));
        $this->onQueue('mail');
    }

    public function backoff(): array
    {
        return [30, 120];
    }

    public function handle(): void
    {
        if (! config('reservations.emails_enabled')) {
            return;
        }

        try {
            Mail::to($this->reservation->customer_email)->send(new ReservationStatusMail($this->reservation, $this->event));
        } catch (Throwable) {
            // Failed-job storage must not contain provider secrets or mail content.
            throw new RuntimeException('Reservation status email delivery failed.');
        }
    }
}

<?php

namespace App\Mail;

use App\Models\Reservation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReservationStatusMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Reservation $reservation, public string $event) {}

    public function envelope(): Envelope
    {
        $subjects = [
            'verified' => 'Reservation Verified',
            'rejected' => 'Reservation Not Approved',
            'rescheduled' => 'Reservation Rescheduled',
            'completed' => 'Reservation Completed',
            'cancelled' => 'Reservation Cancelled',
            'no_show' => 'Reservation No-show',
        ];

        return new Envelope(subject: ($subjects[$this->event] ?? 'Reservation Update')." — {$this->reservation->reference_number}");
    }

    public function content(): Content
    {
        return new Content(view: 'mail.reservation-status');
    }
}

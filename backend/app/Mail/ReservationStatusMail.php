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
            'submitted' => 'Reservation Received', 'verified' => 'Verification Message',
            'rejected' => 'Reservation Rejection Message', 'rescheduled' => 'Reservation Rescheduled',
            'cancelled' => 'Reservation Cancelled',
        ];

        return new Envelope(subject: ($subjects[$this->event] ?? 'Reservation Update')." — {$this->reservation->reference_number}");
    }

    public function content(): Content
    {
        return new Content(view: 'mail.reservation-status');
    }
}

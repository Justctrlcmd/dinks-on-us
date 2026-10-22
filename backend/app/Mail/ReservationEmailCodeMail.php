<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class ReservationEmailCodeMail extends Mailable
{
    public function __construct(public string $code, public int $expiresInMinutes) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Verify your reservation email — Dinks on Us');
    }

    public function content(): Content
    {
        return new Content(view: 'mail.reservation-email-code');
    }
}

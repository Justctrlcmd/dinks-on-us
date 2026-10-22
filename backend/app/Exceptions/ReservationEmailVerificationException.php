<?php

namespace App\Exceptions;

use RuntimeException;

class ReservationEmailVerificationException extends RuntimeException
{
    public function __construct(string $message, public string $apiCode, public int $status = 422, public ?int $retryAfter = null)
    {
        parent::__construct($message);
    }
}

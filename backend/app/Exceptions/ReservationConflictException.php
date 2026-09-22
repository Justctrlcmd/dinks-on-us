<?php

namespace App\Exceptions;

use RuntimeException;
use Throwable;

class ReservationConflictException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $apiCode = 'RESERVATION_CONFLICT',
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }
}

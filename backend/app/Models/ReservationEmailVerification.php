<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['checkout_key_hash', 'email', 'code_hash', 'code_expires_at', 'resend_available_at', 'failed_attempts', 'verified_at', 'verification_expires_at', 'reservation_id'])]
class ReservationEmailVerification extends Model
{
    protected $hidden = ['checkout_key_hash', 'code_hash'];

    protected function casts(): array
    {
        return [
            'code_expires_at' => 'datetime', 'resend_available_at' => 'datetime',
            'verified_at' => 'datetime', 'verification_expires_at' => 'datetime',
            'failed_attempts' => 'integer', 'reservation_id' => 'integer',
        ];
    }
}

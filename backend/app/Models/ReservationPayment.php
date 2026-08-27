<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['reservation_id', 'payment_method_id', 'payment_method_name', 'channel', 'kind', 'status', 'amount', 'reference_number', 'proof_path', 'recorded_by_user_id', 'verified_by_user_id', 'verified_at'])]
class ReservationPayment extends Model
{
    public function paymentMethod(): BelongsTo { return $this->belongsTo(PaymentMethod::class); }
    protected function casts(): array { return ['amount' => 'decimal:2', 'verified_at' => 'datetime']; }
}

<?php

namespace App\Services;

use App\Exceptions\ReservationConflictException;
use App\Models\Reservation;
use App\Models\ReservationActionReceipt;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class ReservationActionGuard
{
    /** Called inside the same transaction as the reservation writes. */
    public function begin(User $user, string $action, ?int $reservationId, array $input, ?UploadedFile $proof = null): ?ReservationActionReceipt
    {
        $key = $input['idempotency_key'] ?? null;
        if (! $key) {
            return null; // Existing clients remain compatible during rollout.
        }
        $businessInput = array_diff_key($input, array_flip([
            'idempotency_key', 'expected_revision', 'quoted_amount', 'quoted_payment_amount', 'quoted_refund_amount', 'refund_settled', 'payment_proof',
        ]));
        $requestHash = hash('sha256', json_encode($this->canonical([
            'action' => $action, 'reservation_id' => $reservationId, 'input' => $businessInput,
            'proof' => $proof ? hash_file('sha256', $proof->getRealPath()) : null,
        ]), JSON_THROW_ON_ERROR));
        $keyHash = hash('sha256', $key);
        // The unique index serializes simultaneous attempts even for a new walk-in.
        // The locking read sees a completed receipt after waiting under MySQL RR.
        DB::table('reservation_action_receipts')->insertOrIgnore([
            'user_id' => $user->id, 'key_hash' => $keyHash, 'request_hash' => $requestHash,
            'action' => $action, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $receipt = ReservationActionReceipt::query()->where('user_id', $user->id)->where('key_hash', $keyHash)->lockForUpdate()->firstOrFail();
        if (! hash_equals($receipt->request_hash, $requestHash)) {
            throw new ReservationConflictException('This request was already recorded with different details. Review the booking before making another change.', 'RESERVATION_REQUEST_KEY_REUSED');
        }

        return $receipt;
    }

    public function assertRevision(Reservation $reservation, array $input): void
    {
        if (isset($input['expected_revision']) && (int) $input['expected_revision'] !== (int) $reservation->revision) {
            throw new ReservationConflictException('This reservation changed after you opened it. Review its current schedule and payments before continuing.', 'RESERVATION_REVIEW_CHANGED');
        }
    }

    private function canonical(mixed $value): mixed
    {
        if (! is_array($value)) {
            return is_int($value) || is_float($value) ? (string) $value : $value;
        }
        if (! array_is_list($value)) {
            ksort($value);
        }

        return array_map(fn (mixed $item): mixed => $this->canonical($item), $value);
    }
}

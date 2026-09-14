<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Throwable;

class PaymentProofRetentionService
{
    private const CHUNK_SIZE = 100;

    public function __construct(private readonly PaymentProofStorageService $storage) {}

    /** @return array<string, mixed> */
    public function preview(string $from, string $to): array
    {
        $payments = $this->eligiblePayments($from, $to)
            ->with('reservation:id,status')
            ->get(['id', 'reservation_id', 'proof_path']);

        $reclaimableBytes = 0;
        $availablePayments = $payments->filter(function (ReservationPayment $payment) use (&$reclaimableBytes): bool {
            $path = (string) $payment->proof_path;
            if (! $this->storage->isManagedPath($path)) {
                return false;
            }

            try {
                if (! $this->storage->exists($path)) {
                    return false;
                }
            } catch (Throwable $exception) {
                report($exception);

                return false;
            }

            try {
                $reclaimableBytes += $this->storage->size($path);
            } catch (Throwable $exception) {
                report($exception);
            }

            return true;
        })->values();

        $statusCounts = $availablePayments
            ->groupBy(fn (ReservationPayment $payment): string => (string) $payment->reservation?->status)
            ->map(fn ($group): int => $group->count())
            ->all();

        $result = [
            'from' => $from,
            'to' => $to,
            'reservations_affected' => $availablePayments->pluck('reservation_id')->unique()->count(),
            'proof_count' => $availablePayments->count(),
            'reclaimable_bytes' => $reclaimableBytes,
            'status_counts' => $statusCounts,
        ];

        return $result;
    }

    /** @return array<string, mixed> */
    public function delete(string $from, string $to, User $user): array
    {
        $summary = [
            'from' => $from,
            'to' => $to,
            'reservations_affected' => 0,
            'proofs_deleted' => 0,
            'missing_files' => 0,
            'failed_files' => 0,
            'reclaimed_bytes' => 0,
            'result' => 'COMPLETED',
        ];
        $affectedReservationIds = [];

        $this->eligiblePayments($from, $to)
            ->select('reservation_payments.id')
            ->orderBy('reservation_payments.id')
            ->chunkById(self::CHUNK_SIZE, function ($payments) use ($from, $to, $user, &$summary, &$affectedReservationIds): void {
                foreach ($payments as $candidate) {
                    try {
                        $outcome = $this->deletePaymentProof((int) $candidate->id, $from, $to, $user);
                    } catch (Throwable $exception) {
                        report($exception);
                        $outcome = ['state' => 'failed', 'reservation_id' => null, 'bytes' => 0];
                    }

                    if ($outcome['state'] === 'deleted') {
                        $summary['proofs_deleted']++;
                    } elseif ($outcome['state'] === 'missing') {
                        $summary['missing_files']++;
                    } elseif ($outcome['state'] === 'failed') {
                        $summary['failed_files']++;
                    }

                    if (in_array($outcome['state'], ['deleted', 'missing'], true) && $outcome['reservation_id']) {
                        $affectedReservationIds[(int) $outcome['reservation_id']] = true;
                    }

                    $summary['reclaimed_bytes'] += $outcome['bytes'];
                }
            }, 'reservation_payments.id', 'id');

        $summary['reservations_affected'] = count($affectedReservationIds);
        $summary['result'] = $summary['failed_files'] > 0 ? 'PARTIAL' : 'COMPLETED';

        if ($summary['proofs_deleted'] > 0) {
            app(SecurityAuditService::class)->recordFromContext(
                AuditLog::PAYMENT_PROOFS_DELETED,
                $user,
                ReservationPayment::class,
                $summary,
                'MANAGEMENT_STORAGE_RETENTION',
                'Payment proof cleanup',
            );
        }

        return $summary;
    }

    public function activity(): LengthAwarePaginator
    {
        return AuditLog::query()
            ->where('action', AuditLog::PAYMENT_PROOFS_DELETED)
            ->with('user')
            ->latest('id')
            ->paginate(5);
    }

    /** @return array{state: string, reservation_id: int|null, bytes: int} */
    private function deletePaymentProof(int $paymentId, string $from, string $to, User $user): array
    {
        return DB::transaction(function () use ($paymentId, $from, $to, $user): array {
            $payment = ReservationPayment::query()
                ->with('reservation:id,booking_date,status')
                ->lockForUpdate()
                ->find($paymentId);

            if (! $payment || ! $payment->proof_path || ! $this->eligibleReservation($payment->reservation, $from, $to)) {
                return ['state' => 'skipped', 'reservation_id' => null, 'bytes' => 0];
            }

            $path = (string) $payment->proof_path;
            if (! $this->storage->isManagedPath($path)) {
                report(new \RuntimeException('A payment proof path is outside the managed storage directory.'));

                return ['state' => 'failed', 'reservation_id' => null, 'bytes' => 0];
            }

            if (! $this->storage->exists($path)) {
                $payment->update([
                    'proof_path' => null,
                    'proof_deleted_at' => now(),
                    'proof_deleted_by_user_id' => $user->id,
                ]);

                return ['state' => 'missing', 'reservation_id' => $payment->reservation_id, 'bytes' => 0];
            }

            try {
                $bytes = $this->storage->size($path);
                if (! $this->storage->delete($path)) {
                    return ['state' => 'failed', 'reservation_id' => null, 'bytes' => 0];
                }
            } catch (Throwable $exception) {
                report($exception);

                return ['state' => 'failed', 'reservation_id' => null, 'bytes' => 0];
            }

            $payment->update([
                'proof_path' => null,
                'proof_deleted_at' => now(),
                'proof_deleted_by_user_id' => $user->id,
            ]);

            return ['state' => 'deleted', 'reservation_id' => $payment->reservation_id, 'bytes' => $bytes];
        });
    }

    /** @return Builder<ReservationPayment> */
    private function eligiblePayments(string $from, string $to): Builder
    {
        return ReservationPayment::query()
            ->whereNull('proof_deleted_at')
            ->whereNotNull('proof_path')
            ->whereHas('reservation', function (Builder $query) use ($from, $to): void {
                $query
                    ->whereBetween('booking_date', [$from, $to])
                    ->whereIn('status', Reservation::FINAL_STATUSES);
            });
    }

    private function eligibleReservation(?Reservation $reservation, string $from, string $to): bool
    {
        if (! $reservation || ! in_array($reservation->status, Reservation::FINAL_STATUSES, true)) {
            return false;
        }

        $bookingDate = $reservation->booking_date?->toDateString();

        return is_string($bookingDate) && $bookingDate >= $from && $bookingDate <= $to;
    }
}

<?php

namespace App\Http\Controllers\Api\V1\Management;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DashboardPaymentProofController extends Controller
{
    public function __invoke(ReservationPayment $payment): BinaryFileResponse|Response
    {
        abort_unless(
            Reservation::query()->whereKey($payment->reservation_id)->whereIn('status', [
                Reservation::STATUS_PENDING,
                Reservation::STATUS_VERIFIED,
                Reservation::STATUS_ONGOING,
                Reservation::STATUS_COMPLETED,
            ])->exists(),
            404,
        );
        abort_unless($payment->proof_path && Storage::disk('local')->exists($payment->proof_path), 404);

        return response()->file(Storage::disk('local')->path($payment->proof_path), [
            'Cache-Control' => 'private, no-store, max-age=0',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}

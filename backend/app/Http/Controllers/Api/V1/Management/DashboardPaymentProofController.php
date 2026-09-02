<?php

namespace App\Http\Controllers\Api\V1\Management;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Services\PaymentProofResponseService;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DashboardPaymentProofController extends Controller
{
    public function __invoke(ReservationPayment $payment, PaymentProofResponseService $proofs): BinaryFileResponse|Response
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

        return $proofs->display($payment->proof_path);
    }
}

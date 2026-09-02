<?php

namespace App\Http\Controllers\Api\V1\Management;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Services\PaymentProofResponseService;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ReservationPaymentProofController extends Controller
{
    public function __invoke(ReservationPayment $payment, PaymentProofResponseService $proofs): BinaryFileResponse|Response
    {
        abort_unless(
            Reservation::query()
                ->whereKey($payment->reservation_id)
                ->whereIn('status', Reservation::OPERATIONAL_STATUSES)
                ->exists(),
            404,
        );

        return $proofs->display($payment->proof_path);
    }
}

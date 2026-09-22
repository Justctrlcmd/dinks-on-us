<?php

namespace App\Http\Controllers\Api\V1\Management;

use App\Http\Controllers\Controller;
use App\Http\Requests\Management\AddReservationAddOnsRequest;
use App\Http\Requests\Management\CancelReservationRequest;
use App\Http\Requests\Management\CompleteReservationRequest;
use App\Http\Requests\Management\ListReservationsRequest;
use App\Http\Requests\Management\RejectReservationRequest;
use App\Http\Requests\Management\RescheduleReservationRequest;
use App\Http\Requests\Management\StoreWalkInReservationRequest;
use App\Http\Resources\ReservationResource;
use App\Models\Reservation;
use App\Services\ReservationMailDispatcher;
use App\Services\ReservationService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReservationController extends Controller
{
    use ApiResponse;

    public function index(ListReservationsRequest $request, ReservationService $service): JsonResponse
    {
        $result = $service->operationalList($request->validated());
        $paginator = $result['paginator'];

        return $this->respondSuccess([
            'reservations' => ReservationResource::collection($paginator->items())->resolve($request),
            'kpis' => $result['kpis'],
        ], 'Reservations retrieved.', meta: [
            'current_page' => $paginator->currentPage(), 'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(), 'total' => $paginator->total(),
        ]);
    }

    public function pendingSummary(ReservationService $service): JsonResponse
    {
        return $this->respondSuccess($service->pendingSummary(), 'Pending reservation summary retrieved.');
    }

    public function show(Request $request, Reservation $reservation, ReservationService $service): JsonResponse
    {
        return $this->respondSuccess(ReservationResource::make($service->detail($reservation))->resolve($request), 'Reservation details retrieved.');
    }

    public function storeWalkIn(StoreWalkInReservationRequest $request, ReservationService $service, ReservationMailDispatcher $mail): JsonResponse
    {
        $reservation = $service->createWalkIn(
            $request->safe()->except('payment_proof'),
            $request->user(),
            $request->file('payment_proof'),
        );
        $mail->dispatch($reservation, 'verified');

        return $this->respondSuccess(
            ReservationResource::make($reservation)->resolve($request),
            'Walk-in reservation created and payment recorded.',
            201,
        );
    }

    public function verify(Request $request, Reservation $reservation, ReservationService $service, ReservationMailDispatcher $mail): JsonResponse
    {
        $updated = $service->verify($reservation, $request->user());
        $mail->dispatch($updated, 'verified');

        return $this->actionResponse($request, $updated, 'Reservation verified.');
    }

    public function reject(RejectReservationRequest $request, Reservation $reservation, ReservationService $service, ReservationMailDispatcher $mail): JsonResponse
    {
        $updated = $service->reject($reservation, $request->user(), $request->validated('concern'), $request->validated('reason'));
        $mail->dispatch($updated, 'rejected');

        return $this->actionResponse($request, $updated, 'Reservation rejected and its court times released.');
    }

    public function start(Request $request, Reservation $reservation, ReservationService $service): JsonResponse
    {
        return $this->actionResponse($request, $service->start($reservation, $request->user()), 'Reservation marked as ongoing.');
    }

    public function reschedule(RescheduleReservationRequest $request, Reservation $reservation, ReservationService $service, ReservationMailDispatcher $mail): JsonResponse
    {
        $updated = $service->reschedule($reservation, $request->user(), $request->safe()->except('payment_proof'), $request->file('payment_proof'));
        $mail->dispatch($updated, 'rescheduled');

        return $this->actionResponse($request, $updated, 'Reservation rescheduled.');
    }

    public function addOns(AddReservationAddOnsRequest $request, Reservation $reservation, ReservationService $service): JsonResponse
    {
        return $this->actionResponse($request, $service->addOns($reservation, $request->user(), $request->validated(), $request->file('payment_proof')), 'Reservation add-ons recorded.');
    }

    public function complete(CompleteReservationRequest $request, Reservation $reservation, ReservationService $service, ReservationMailDispatcher $mail): JsonResponse
    {
        $updated = $service->complete(
            $reservation, $request->user(), $request->validated('payment_channel'),
            $request->validated('payment_reference_number'), $request->file('payment_proof'),
        );
        $mail->dispatch($updated, 'completed');

        return $this->actionResponse($request, $updated, 'Reservation completed and payment recorded.');
    }

    public function noShow(Request $request, Reservation $reservation, ReservationService $service, ReservationMailDispatcher $mail): JsonResponse
    {
        $updated = $service->noShow($reservation, $request->user());
        $mail->dispatch($updated, 'no_show');

        return $this->actionResponse($request, $updated, 'Reservation marked as no-show.');
    }

    public function cancel(CancelReservationRequest $request, Reservation $reservation, ReservationService $service, ReservationMailDispatcher $mail): JsonResponse
    {
        $updated = $service->cancel(
            $reservation, $request->user(), $request->validated('reason'), $request->validated('refund_type'),
            $request->validated('refund_amount') === null ? null : (float) $request->validated('refund_amount'),
        );
        $mail->dispatch($updated, 'cancelled');

        return $this->actionResponse($request, $updated, 'Reservation cancelled and refund recorded.');
    }

    private function actionResponse(Request $request, Reservation $reservation, string $message): JsonResponse
    {
        return $this->respondSuccess(ReservationResource::make($reservation)->resolve($request), $message);
    }
}

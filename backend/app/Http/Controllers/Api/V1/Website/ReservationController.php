<?php

namespace App\Http\Controllers\Api\V1\Website;

use App\Http\Controllers\Controller;
use App\Http\Requests\Website\StoreReservationRequest;
use App\Http\Resources\ReservationResource;
use App\Services\ReservationService;
use App\Services\ReservationMailDispatcher;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class ReservationController extends Controller
{
    use ApiResponse;

    public function store(StoreReservationRequest $request, ReservationService $service, ReservationMailDispatcher $mail): JsonResponse
    {
        $reservation = $service->submit($request->safe()->except('payment_proof'), $request->file('payment_proof'));
        $mail->dispatch($reservation, 'submitted');

        return $this->respondSuccess(
            ReservationResource::make($reservation)->resolve($request),
            'Reservation submitted. Your selected court times are held while payment is reviewed.',
            201,
        );
    }
}

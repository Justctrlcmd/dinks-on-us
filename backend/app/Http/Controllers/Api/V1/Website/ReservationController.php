<?php

namespace App\Http\Controllers\Api\V1\Website;

use App\Http\Controllers\Controller;
use App\Http\Requests\Website\StoreReservationRequest;
use App\Http\Resources\ReservationResource;
use App\Jobs\SendNewReservationPush;
use App\Models\Reservation;
use App\Services\ReservationService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class ReservationController extends Controller
{
    use ApiResponse;

    public function store(StoreReservationRequest $request, ReservationService $service): JsonResponse
    {
        $idempotencyKey = $request->validated('idempotency_key');
        $existing = $idempotencyKey
            ? Reservation::query()->where('idempotency_key', $idempotencyKey)->first()
            : null;
        if ($existing) {
            return $this->respondSuccess(
                ReservationResource::make($service->detail($existing))->resolve($request),
                'This reservation was already submitted.',
            );
        }

        $reservation = $service->submit($request->safe()->except('payment_proof'), $request->file('payment_proof'), $idempotencyKey);
        SendNewReservationPush::dispatch($reservation->id)->afterResponse();

        return $this->respondSuccess(
            ReservationResource::make($reservation)->resolve($request),
            'Reservation submitted. Your selected court times are held while payment is reviewed.',
            201,
        );
    }
}

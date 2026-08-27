<?php

namespace App\Http\Controllers\Api\V1\Management;

use App\Http\Controllers\Controller;
use App\Http\Requests\Management\ShowDashboardRequest;
use App\Http\Resources\ReservationResource;
use App\Models\Reservation;
use App\Services\DashboardService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    use ApiResponse;

    public function index(ShowDashboardRequest $request, DashboardService $service): JsonResponse
    {
        return $this->respondSuccess(
            $service->overview($request->validated('week_start'), $request->validated('date')),
            'Dashboard retrieved.',
        );
    }

    public function showReservation(Request $request, Reservation $reservation, DashboardService $service): JsonResponse
    {
        return $this->respondSuccess(
            ReservationResource::make($service->reservationDetail($reservation))->resolve($request),
            'Reservation details retrieved.',
        );
    }
}

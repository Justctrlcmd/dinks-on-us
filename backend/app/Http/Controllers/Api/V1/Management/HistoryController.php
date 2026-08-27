<?php

namespace App\Http\Controllers\Api\V1\Management;

use App\Http\Controllers\Controller;
use App\Http\Requests\Management\ListHistoryRequest;
use App\Http\Resources\ReservationResource;
use App\Models\Reservation;
use App\Services\ReservationService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HistoryController extends Controller
{
    use ApiResponse;

    public function index(ListHistoryRequest $request, ReservationService $service): JsonResponse
    {
        $result = $service->historyList($request->validated());
        $paginator = $result['paginator'];

        return $this->respondSuccess([
            'reservations' => ReservationResource::collection($paginator->items())->resolve($request),
            'kpis' => $result['kpis'],
        ], 'Reservation history retrieved.', meta: [
            'current_page' => $paginator->currentPage(), 'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(), 'total' => $paginator->total(),
        ]);
    }

    public function show(Request $request, Reservation $reservation, ReservationService $service): JsonResponse
    {
        return $this->respondSuccess(
            ReservationResource::make($service->historyDetail($reservation))->resolve($request),
            'Reservation history details retrieved.',
        );
    }
}

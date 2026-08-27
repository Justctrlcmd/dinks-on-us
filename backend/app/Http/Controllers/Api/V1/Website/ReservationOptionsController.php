<?php

namespace App\Http\Controllers\Api\V1\Website;

use App\Http\Controllers\Controller;
use App\Http\Resources\CourtConfigurationResource;
use App\Http\Resources\CourtResource;
use App\Http\Resources\RentalEquipmentResource;
use App\Models\AvailabilityClosure;
use App\Models\RentalEquipment;
use App\Services\CourtAvailabilityService;
use App\Traits\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReservationOptionsController extends Controller
{
    use ApiResponse;

    public function closedDates(): JsonResponse
    {
        $dates = AvailabilityClosure::query()
            ->active()
            ->where('type', AvailabilityClosure::TYPE_ENTIRE_OPERATION)
            ->whereDate('date', '>=', now()->toDateString())
            ->orderBy('date')
            ->pluck('date')
            ->map(fn ($date): string => CarbonImmutable::parse($date)->toDateString())
            ->values()
            ->all();

        return $this->respondSuccess(
            ['closed_dates' => $dates],
            'Closed dates retrieved.',
        );
    }

    public function __invoke(Request $request, CourtAvailabilityService $availability): JsonResponse
    {
        $validated = $request->validate(['date' => ['required', 'date_format:Y-m-d']]);
        $snapshot = $availability->forDate($validated['date']);
        $equipment = RentalEquipment::query()->active()->orderBy('name')->orderBy('id')->get();

        return $this->respondSuccess([
            'date' => $validated['date'],
            'configuration' => $snapshot['configuration'] ? CourtConfigurationResource::make($snapshot['configuration'])->resolve($request) : null,
            'courts' => CourtResource::collection($snapshot['courts'])->resolve($request),
            'slots' => $snapshot['slots'],
            'is_date_closed' => $snapshot['is_date_closed'],
            'unavailable_slots' => $snapshot['unavailable_slots'],
            'reserved_slots' => $snapshot['reserved_slots'],
            'past_slots' => $snapshot['past_slots'],
            'equipment' => RentalEquipmentResource::collection($equipment)->resolve($request),
            'equipment_confirmation' => 'Equipment availability is confirmed when your reservation is verified.',
        ], 'Reservation options retrieved.');
    }
}

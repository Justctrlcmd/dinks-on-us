<?php

namespace App\Http\Controllers\Api\V1\Website;

use App\Http\Controllers\Controller;
use App\Http\Resources\CourtConfigurationResource;
use App\Http\Resources\CourtResource;
use App\Http\Resources\RentalEquipmentResource;
use App\Models\AvailabilityClosure;
use App\Models\RentalEquipment;
use App\Services\CourtAvailabilityService;
use App\Services\EquipmentAvailabilityService;
use App\Support\BusinessClock;
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
            ->whereDate('date', '>=', BusinessClock::today())
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

    public function __invoke(Request $request, CourtAvailabilityService $availability, EquipmentAvailabilityService $equipmentAvailability): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'hours' => ['sometimes', 'array', 'max:24'],
            'hours.*' => ['required', 'integer', 'between:0,23', 'distinct'],
        ]);
        $snapshot = $availability->forDate($validated['date']);
        $equipment = RentalEquipment::query()->active()->orderBy('name')->orderBy('id')->get();

        $equipmentSlots = array_map(fn (array $slot): array => [...$slot, 'date' => $validated['date']], $snapshot['slots']);
        $stock = $equipmentAvailability->forSlots($equipment, $equipmentSlots);
        $selectedHours = $validated['hours'] ?? null;

        return $this->respondSuccess([
            'date' => $validated['date'],
            'configuration' => $snapshot['configuration'] ? CourtConfigurationResource::make($snapshot['configuration'])->resolve($request) : null,
            'courts' => CourtResource::collection($snapshot['courts'])->resolve($request),
            'slots' => $snapshot['slots'],
            'is_date_closed' => $snapshot['is_date_closed'],
            'unavailable_slots' => $snapshot['unavailable_slots'],
            'reserved_slots' => $snapshot['reserved_slots'],
            'past_slots' => $snapshot['past_slots'],
            'equipment' => $equipment->map(function (RentalEquipment $item) use ($request, $stock, $selectedHours): array {
                $hourly = collect($stock[$item->id]['slots'])->keyBy('start_hour');
                $maximum = $selectedHours === null ? $stock[$item->id]['available_quantity']
                    : collect($selectedHours)->map(fn ($hour): int => $hourly->get($hour)['available_quantity'] ?? 0)->min();

                return [
                    ...RentalEquipmentResource::make($item)->resolve($request),
                    'available_quantity' => $maximum ?? 0,
                    'slot_availability' => $stock[$item->id]['slots'],
                ];
            })->all(),
            'equipment_confirmation' => 'Equipment is held when your reservation is successfully submitted, including while awaiting verification.',
        ], 'Reservation options retrieved.');
    }
}

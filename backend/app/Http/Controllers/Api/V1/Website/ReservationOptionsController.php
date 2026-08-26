<?php

namespace App\Http\Controllers\Api\V1\Website;

use App\Http\Controllers\Controller;
use App\Http\Resources\CourtConfigurationResource;
use App\Http\Resources\CourtResource;
use App\Http\Resources\RentalEquipmentResource;
use App\Models\AvailabilityClosure;
use App\Models\Court;
use App\Models\CourtConfiguration;
use App\Models\RentalEquipment;
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

    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate(['date' => ['required', 'date_format:Y-m-d']]);
        $date = CarbonImmutable::createFromFormat('Y-m-d', $validated['date']);
        $configuration = CourtConfiguration::query()->with('ratePeriods')->find(1);
        $courts = Court::query()->active()->orderBy('court_number')->get();
        $equipment = RentalEquipment::query()->active()->orderBy('name')->orderBy('id')->get();
        $closures = AvailabilityClosure::query()
            ->active()
            ->whereDate('date', $validated['date'])
            ->with('periods')
            ->get();

        $slots = [];
        if ($configuration) {
            $dayType = $date->isWeekend() ? 'weekend' : 'weekday';
            $rates = $configuration->ratePeriods->where('day_type', $dayType);

            for ($hour = $configuration->opening_hour; $hour < $configuration->closing_hour; $hour++) {
                $rate = $rates->first(fn ($period) => $period->start_hour <= $hour && $period->end_hour > $hour);
                if ($rate) {
                    $slots[] = [
                        'start_hour' => $hour,
                        'end_hour' => $hour + 1,
                        'price' => (float) $rate->price,
                    ];
                }
            }
        }

        $isDateClosed = $closures->contains(
            fn (AvailabilityClosure $closure): bool => $closure->type === AvailabilityClosure::TYPE_ENTIRE_OPERATION,
        );
        $unavailableSlots = [];

        if ($isDateClosed) {
            foreach ($courts as $court) {
                foreach ($slots as $slot) {
                    $unavailableSlots[] = [
                        'court_id' => $court->id,
                        'start_hour' => $slot['start_hour'],
                    ];
                }
            }
        } else {
            $closures
                ->where('type', AvailabilityClosure::TYPE_COURT_TIME)
                ->each(function (AvailabilityClosure $closure) use (&$unavailableSlots, $slots): void {
                    foreach ($closure->periods as $period) {
                        foreach ($slots as $slot) {
                            if ($slot['start_hour'] >= $period->start_hour && $slot['end_hour'] <= $period->end_hour) {
                                $unavailableSlots[] = [
                                    'court_id' => $closure->court_id,
                                    'start_hour' => $slot['start_hour'],
                                ];
                            }
                        }
                    }
                });
        }

        return $this->respondSuccess([
            'date' => $validated['date'],
            'configuration' => $configuration ? CourtConfigurationResource::make($configuration)->resolve($request) : null,
            'courts' => CourtResource::collection($courts)->resolve($request),
            'slots' => $slots,
            'is_date_closed' => $isDateClosed,
            'unavailable_slots' => $unavailableSlots,
            'equipment' => RentalEquipmentResource::collection($equipment)->resolve($request),
            'equipment_confirmation' => 'Equipment availability is confirmed when your reservation is verified.',
        ], 'Reservation options retrieved.');
    }
}

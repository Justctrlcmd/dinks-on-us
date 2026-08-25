<?php

namespace App\Http\Controllers\Api\V1\Website;

use App\Http\Controllers\Controller;
use App\Http\Resources\CourtConfigurationResource;
use App\Http\Resources\CourtResource;
use App\Http\Resources\RentalEquipmentResource;
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

    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate(['date' => ['required', 'date_format:Y-m-d']]);
        $date = CarbonImmutable::createFromFormat('Y-m-d', $validated['date']);
        $configuration = CourtConfiguration::query()->with('ratePeriods')->find(1);
        $courts = Court::query()->active()->orderBy('court_number')->get();
        $equipment = RentalEquipment::query()->active()->orderBy('name')->orderBy('id')->get();

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

        return $this->respondSuccess([
            'date' => $validated['date'],
            'configuration' => $configuration ? CourtConfigurationResource::make($configuration)->resolve($request) : null,
            'courts' => CourtResource::collection($courts)->resolve($request),
            'slots' => $slots,
            'equipment' => RentalEquipmentResource::collection($equipment)->resolve($request),
            'equipment_confirmation' => 'Equipment availability is confirmed when your reservation is verified.',
        ], 'Reservation options retrieved.');
    }
}

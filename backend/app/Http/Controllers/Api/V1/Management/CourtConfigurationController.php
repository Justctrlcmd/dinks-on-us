<?php

namespace App\Http\Controllers\Api\V1\Management;

use App\Http\Controllers\Controller;
use App\Http\Requests\Management\UpdateCourtConfigurationRequest;
use App\Http\Resources\CourtConfigurationResource;
use App\Models\CourtConfiguration;
use App\Services\SecurityAuditService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class CourtConfigurationController extends Controller
{
    use ApiResponse;

    public function show(): JsonResponse
    {
        $configuration = CourtConfiguration::query()->with('ratePeriods')->find(1);

        return $this->respondSuccess(
            $configuration ? CourtConfigurationResource::make($configuration)->resolve() : null,
            'Court configuration retrieved.',
        );
    }

    public function update(UpdateCourtConfigurationRequest $request, SecurityAuditService $audit): JsonResponse
    {
        $configuration = DB::transaction(function () use ($request): CourtConfiguration {
            $configuration = CourtConfiguration::query()->lockForUpdate()->find(1) ?? new CourtConfiguration;
            $configuration->id = 1;
            $configuration->fill([
                ...$request->safe()->only([
                    'opening_hour',
                    'closing_hour',
                    'included_players_per_court',
                    'additional_player_price',
                    'advance_booking_days',
                ]),
                'updated_by_user_id' => $request->user()?->id,
            ])->save();

            $configuration->ratePeriods()->delete();

            foreach (['weekday', 'weekend'] as $dayType) {
                foreach ($request->validated("{$dayType}_rates") as $index => $period) {
                    $configuration->ratePeriods()->create([
                        ...$period,
                        'day_type' => $dayType,
                        'display_order' => $index + 1,
                    ]);
                }
            }

            return $configuration->load('ratePeriods');
        });
        $audit->record('COURT_CONFIGURATION_UPDATED', $request, $request->user(), $configuration, module: 'MANAGEMENT_COURT_PRICING', targetLabel: 'Court configuration');

        return $this->respondSuccess(
            CourtConfigurationResource::make($configuration)->resolve($request),
            'Court configuration saved.',
        );
    }
}

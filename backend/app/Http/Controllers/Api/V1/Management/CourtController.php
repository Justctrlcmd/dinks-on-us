<?php

namespace App\Http\Controllers\Api\V1\Management;

use App\Http\Controllers\Controller;
use App\Http\Resources\CourtResource;
use App\Models\Court;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class CourtController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $courts = Court::query()->active()->orderBy('court_number')->get();
        $nextNumber = ((int) Court::query()->max('court_number')) + 1;

        return $this->respondSuccess(
            [
                'courts' => CourtResource::collection($courts)->resolve(),
                'next_court_number' => $nextNumber,
            ],
            'Courts retrieved.',
        );
    }

    public function store(): JsonResponse
    {
        $court = DB::transaction(function (): Court {
            $lastCourt = Court::query()->orderByDesc('court_number')->lockForUpdate()->first();

            return Court::query()->create([
                'court_number' => ($lastCourt?->court_number ?? 0) + 1,
                'is_active' => true,
            ]);
        });

        return $this->respondSuccess(CourtResource::make($court)->resolve(), 'Court created.', 201);
    }

    public function destroy(Court $court): JsonResponse
    {
        $court->update(['is_active' => false]);

        return $this->respondSuccess(null, 'Court removed.');
    }
}

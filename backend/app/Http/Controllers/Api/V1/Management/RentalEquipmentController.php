<?php

namespace App\Http\Controllers\Api\V1\Management;

use App\Http\Controllers\Controller;
use App\Http\Requests\Management\StoreRentalEquipmentRequest;
use App\Http\Requests\Management\UpdateRentalEquipmentRequest;
use App\Http\Resources\RentalEquipmentResource;
use App\Models\RentalEquipment;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class RentalEquipmentController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $equipment = RentalEquipment::query()->active()->orderBy('name')->orderBy('id')->get();

        return $this->respondSuccess(RentalEquipmentResource::collection($equipment)->resolve(), 'Rental equipment retrieved.');
    }

    public function store(StoreRentalEquipmentRequest $request): JsonResponse
    {
        $equipment = RentalEquipment::query()->create([...$request->validated(), 'is_active' => true]);

        return $this->respondSuccess(RentalEquipmentResource::make($equipment)->resolve($request), 'Rental equipment created.', 201);
    }

    public function update(UpdateRentalEquipmentRequest $request, RentalEquipment $rentalEquipment): JsonResponse
    {
        $rentalEquipment->update($request->validated());

        return $this->respondSuccess(RentalEquipmentResource::make($rentalEquipment->fresh())->resolve($request), 'Rental equipment updated.');
    }

    public function destroy(RentalEquipment $rentalEquipment): JsonResponse
    {
        $rentalEquipment->update(['is_active' => false]);

        return $this->respondSuccess(null, 'Rental equipment removed.');
    }
}

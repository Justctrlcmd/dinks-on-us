<?php

namespace App\Http\Controllers\Api\V1\Management;

use App\Http\Controllers\Controller;
use App\Http\Requests\Management\StoreRentalEquipmentRequest;
use App\Http\Requests\Management\UpdateRentalEquipmentRequest;
use App\Http\Resources\RentalEquipmentResource;
use App\Models\RentalEquipment;
use App\Services\SecurityAuditService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RentalEquipmentController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $equipment = RentalEquipment::query()->orderByDesc('is_active')->orderBy('name')->orderBy('id')->get();

        return $this->respondSuccess(RentalEquipmentResource::collection($equipment)->resolve(), 'Rental equipment retrieved.');
    }

    public function store(StoreRentalEquipmentRequest $request, SecurityAuditService $audit): JsonResponse
    {
        $validated = $request->validated();
        $equipment = RentalEquipment::query()->create([...$validated, 'is_active' => $validated['is_active'] ?? true]);
        $audit->record('RENTAL_EQUIPMENT_CREATED', $request, $request->user(), $equipment, module: 'MANAGEMENT_COURT_PRICING', targetLabel: $equipment->name);

        return $this->respondSuccess(RentalEquipmentResource::make($equipment)->resolve($request), 'Rental equipment created.', 201);
    }

    public function update(UpdateRentalEquipmentRequest $request, RentalEquipment $rentalEquipment, SecurityAuditService $audit): JsonResponse
    {
        $rentalEquipment->update($request->validated());
        $audit->record('RENTAL_EQUIPMENT_UPDATED', $request, $request->user(), $rentalEquipment, module: 'MANAGEMENT_COURT_PRICING', targetLabel: $rentalEquipment->name);

        return $this->respondSuccess(RentalEquipmentResource::make($rentalEquipment->fresh())->resolve($request), 'Rental equipment updated.');
    }

    public function destroy(Request $request, RentalEquipment $rentalEquipment, SecurityAuditService $audit): JsonResponse
    {
        $rentalEquipment->delete();
        $audit->record('RENTAL_EQUIPMENT_REMOVED', $request, $request->user(), $rentalEquipment, module: 'MANAGEMENT_COURT_PRICING', targetLabel: $rentalEquipment->name);

        return $this->respondSuccess(null, 'Rental equipment deleted. Historical reservation records remain available.');
    }
}

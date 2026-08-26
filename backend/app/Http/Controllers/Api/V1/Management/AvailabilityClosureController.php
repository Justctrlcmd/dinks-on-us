<?php

namespace App\Http\Controllers\Api\V1\Management;

use App\Http\Controllers\Controller;
use App\Http\Requests\Management\StoreAvailabilityBlockRequest;
use App\Http\Requests\Management\StoreClosedDateRequest;
use App\Http\Resources\AvailabilityActivityResource;
use App\Http\Resources\AvailabilityClosureResource;
use App\Models\AuditLog;
use App\Models\AvailabilityClosure;
use App\Services\AvailabilityClosureService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AvailabilityClosureController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $closures = AvailabilityClosure::query()
            ->active()
            ->with(['court', 'periods'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(5);

        return $this->respondSuccess(
            AvailabilityClosureResource::collection($closures->items())->resolve($request),
            'Active closures retrieved.',
            meta: $this->paginationMeta($closures),
        );
    }

    public function storeClosedDate(StoreClosedDateRequest $request, AvailabilityClosureService $service): JsonResponse
    {
        $closure = $service->closeEntireOperation(
            $request->user(),
            $request->validated('date'),
            $request->validated('reason'),
        );

        return $this->respondSuccess(
            AvailabilityClosureResource::make($closure)->resolve($request),
            'The entire operation has been closed for the selected date.',
            201,
        );
    }

    public function storeAvailabilityBlock(StoreAvailabilityBlockRequest $request, AvailabilityClosureService $service): JsonResponse
    {
        $closure = $service->blockCourtTimes(
            $request->user(),
            (int) $request->validated('court_id'),
            $request->validated('date'),
            $request->validated('periods'),
            $request->validated('reason'),
        );

        return $this->respondSuccess(
            AvailabilityClosureResource::make($closure)->resolve($request),
            'The selected court time ranges have been closed.',
            201,
        );
    }

    public function destroyClosedDate(Request $request, AvailabilityClosure $closedDate, AvailabilityClosureService $service): JsonResponse
    {
        if ($closedDate->type !== AvailabilityClosure::TYPE_ENTIRE_OPERATION) {
            return $this->respondFailure('The requested closure could not be found.', 'NOT_FOUND', 404);
        }

        $closure = $service->reopen($request->user(), $closedDate);

        return $this->respondSuccess(
            AvailabilityClosureResource::make($closure)->resolve($request),
            'The entire operation has been reopened.',
        );
    }

    public function destroyAvailabilityBlock(Request $request, AvailabilityClosure $block, AvailabilityClosureService $service): JsonResponse
    {
        if ($block->type !== AvailabilityClosure::TYPE_COURT_TIME) {
            return $this->respondFailure('The requested closure could not be found.', 'NOT_FOUND', 404);
        }

        $closure = $service->reopen($request->user(), $block);

        return $this->respondSuccess(
            AvailabilityClosureResource::make($closure)->resolve($request),
            'The selected court time ranges have been reopened.',
        );
    }

    public function activity(Request $request): JsonResponse
    {
        $activity = AuditLog::query()
            ->whereIn('action', [
                AuditLog::DATE_CLOSED,
                AuditLog::COURT_SLOT_BLOCKED,
                AuditLog::DATE_REOPENED,
                AuditLog::COURT_SLOT_REOPENED,
            ])
            ->with('user')
            ->latest('id')
            ->paginate(5);

        return $this->respondSuccess(
            AvailabilityActivityResource::collection($activity->items())->resolve($request),
            'Availability activity retrieved.',
            meta: $this->paginationMeta($activity),
        );
    }

    /** @return array<string, int> */
    private function paginationMeta($paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ];
    }
}

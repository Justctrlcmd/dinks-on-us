<?php

namespace App\Http\Controllers\Api\V1\Management;

use App\Http\Controllers\Controller;
use App\Http\Requests\Management\DeletePaymentProofCleanupRequest;
use App\Http\Requests\Management\PreviewPaymentProofCleanupRequest;
use App\Http\Resources\PaymentProofRetentionActivityResource;
use App\Services\PaymentProofRetentionService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentProofRetentionController extends Controller
{
    use ApiResponse;

    public function preview(PreviewPaymentProofCleanupRequest $request, PaymentProofRetentionService $service): JsonResponse
    {
        return $this->respondSuccess(
            $service->preview($request->validated('from'), $request->validated('to')),
            'Payment proof cleanup preview generated.',
        );
    }

    public function delete(DeletePaymentProofCleanupRequest $request, PaymentProofRetentionService $service): JsonResponse
    {
        $summary = $service->delete($request->validated('from'), $request->validated('to'), $request->user());
        $message = $summary['failed_files'] > 0
            ? 'Payment proof cleanup completed with some files needing retry.'
            : 'Payment proof images deleted.';

        return $this->respondSuccess($summary, $message);
    }

    public function activity(Request $request, PaymentProofRetentionService $service): JsonResponse
    {
        $activity = $service->activity();

        return $this->respondSuccess(
            PaymentProofRetentionActivityResource::collection($activity->items())->resolve($request),
            'Payment proof cleanup activity retrieved.',
            meta: [
                'current_page' => $activity->currentPage(),
                'last_page' => $activity->lastPage(),
                'per_page' => $activity->perPage(),
                'total' => $activity->total(),
            ],
        );
    }
}

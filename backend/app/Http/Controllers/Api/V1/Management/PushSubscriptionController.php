<?php

namespace App\Http\Controllers\Api\V1\Management;

use App\Http\Controllers\Controller;
use App\Http\Requests\Management\DeletePushSubscriptionRequest;
use App\Http\Requests\Management\StorePushSubscriptionRequest;
use App\Services\PushSubscriptionService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class PushSubscriptionController extends Controller
{
    use ApiResponse;

    public function store(StorePushSubscriptionRequest $request, PushSubscriptionService $service): JsonResponse
    {
        $service->store($request->user(), $request->validated());

        return $this->respondSuccess(null, 'Device notifications enabled.', 201);
    }

    public function destroy(DeletePushSubscriptionRequest $request, PushSubscriptionService $service): JsonResponse
    {
        $service->delete($request->user(), $request->validated('endpoint'));

        return $this->respondSuccess(null, 'Device notifications disabled.');
    }
}

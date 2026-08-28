<?php

namespace App\Http\Controllers\Api\V1\Management;

use App\Http\Controllers\Controller;
use App\Http\Requests\Management\ReportFilterRequest;
use App\Services\ReportService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class ReportController extends Controller
{
    use ApiResponse;

    public function overview(ReportFilterRequest $request, ReportService $service): JsonResponse
    {
        return $this->report($service->overview($request->validated()), 'Reports overview retrieved.');
    }

    public function revenue(ReportFilterRequest $request, ReportService $service): JsonResponse
    {
        return $this->report($service->revenue($request->validated()), 'Revenue report retrieved.');
    }

    public function reservations(ReportFilterRequest $request, ReportService $service): JsonResponse
    {
        return $this->report($service->reservations($request->validated()), 'Reservation report retrieved.');
    }

    public function courtUtilization(ReportFilterRequest $request, ReportService $service): JsonResponse
    {
        return $this->report($service->courtUtilization($request->validated()), 'Court utilization report retrieved.');
    }

    public function popularTimes(ReportFilterRequest $request, ReportService $service): JsonResponse
    {
        return $this->report($service->popularTimes($request->validated()), 'Popular-time report retrieved.');
    }

    public function payments(ReportFilterRequest $request, ReportService $service): JsonResponse
    {
        return $this->report($service->payments($request->validated()), 'Payment report retrieved.');
    }

    public function operations(ReportFilterRequest $request, ReportService $service): JsonResponse
    {
        return $this->report($service->operations($request->validated()), 'Operations report retrieved.');
    }

    /** @param array<string, mixed> $data */
    private function report(array $data, string $message): JsonResponse
    {
        return $this->respondSuccess($data, $message);
    }
}

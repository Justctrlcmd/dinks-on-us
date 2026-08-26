<?php

namespace App\Http\Controllers\Api\V1\Website;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicPaymentMethodResource;
use App\Models\PaymentMethod;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentMethodController extends Controller
{
    use ApiResponse;

    public function __invoke(Request $request): JsonResponse
    {
        $paymentMethods = PaymentMethod::query()
            ->active()
            ->orderBy('name')
            ->orderBy('id')
            ->get();

        return $this->respondSuccess(
            PublicPaymentMethodResource::collection($paymentMethods)->resolve($request),
            'Payment methods retrieved.',
        );
    }
}

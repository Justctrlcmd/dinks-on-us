<?php

namespace App\Http\Controllers\Api\V1\Management;

use App\Http\Controllers\Controller;
use App\Http\Requests\Management\StorePaymentMethodRequest;
use App\Http\Requests\Management\UpdatePaymentMethodRequest;
use App\Http\Resources\PaymentMethodResource;
use App\Models\PaymentMethod;
use App\Services\SecurityAuditService;
use App\Services\OptimizedImageStorageService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Throwable;

class PaymentMethodController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly OptimizedImageStorageService $images) {}

    public function index(): JsonResponse
    {
        $paymentMethods = PaymentMethod::query()->active()->orderBy('name')->orderBy('id')->get();

        return $this->respondSuccess(
            PaymentMethodResource::collection($paymentMethods)->resolve(),
            'Payment methods retrieved.',
        );
    }

    public function store(StorePaymentMethodRequest $request, SecurityAuditService $audit): JsonResponse
    {
        $imagePath = $this->images->store($request->file('qr_image'), 'public', 'payment-methods');

        try {
            $paymentMethod = PaymentMethod::query()->create([
                ...$request->safe()->except('qr_image'),
                'qr_image_path' => $imagePath,
                'is_active' => true,
            ]);
        } catch (Throwable $exception) {
            Storage::disk('public')->delete($imagePath);

            throw $exception;
        }
        $audit->record('PAYMENT_METHOD_CREATED', $request, $request->user(), $paymentMethod, module: 'MANAGEMENT_PAYMENT_METHODS', targetLabel: $paymentMethod->name);

        return $this->respondSuccess(
            PaymentMethodResource::make($paymentMethod)->resolve($request),
            'Payment method added.',
            201,
        );
    }

    public function update(UpdatePaymentMethodRequest $request, PaymentMethod $paymentMethod, SecurityAuditService $audit): JsonResponse
    {
        $newImagePath = $request->hasFile('qr_image')
            ? $this->images->store($request->file('qr_image'), 'public', 'payment-methods')
            : null;
        $oldImagePath = $paymentMethod->qr_image_path;

        try {
            $paymentMethod->update([
                ...$request->safe()->except('qr_image'),
                ...($newImagePath ? ['qr_image_path' => $newImagePath] : []),
            ]);
        } catch (Throwable $exception) {
            if ($newImagePath) {
                Storage::disk('public')->delete($newImagePath);
            }

            throw $exception;
        }

        if ($newImagePath) {
            Storage::disk('public')->delete($oldImagePath);
        }
        $audit->record('PAYMENT_METHOD_UPDATED', $request, $request->user(), $paymentMethod, module: 'MANAGEMENT_PAYMENT_METHODS', targetLabel: $paymentMethod->name);

        return $this->respondSuccess(
            PaymentMethodResource::make($paymentMethod->fresh())->resolve($request),
            'Payment method updated.',
        );
    }

    public function destroy(Request $request, PaymentMethod $paymentMethod, SecurityAuditService $audit): JsonResponse
    {
        $paymentMethod->update(['is_active' => false]);
        $audit->record('PAYMENT_METHOD_REMOVED', $request, $request->user(), $paymentMethod, module: 'MANAGEMENT_PAYMENT_METHODS', targetLabel: $paymentMethod->name);

        return $this->respondSuccess(null, 'Payment method removed.');
    }
}

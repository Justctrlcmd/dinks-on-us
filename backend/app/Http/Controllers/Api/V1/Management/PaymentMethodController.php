<?php

namespace App\Http\Controllers\Api\V1\Management;

use App\Http\Controllers\Controller;
use App\Http\Requests\Management\StorePaymentMethodRequest;
use App\Http\Requests\Management\UpdatePaymentMethodRequest;
use App\Http\Resources\PaymentMethodResource;
use App\Models\PaymentMethod;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class PaymentMethodController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $paymentMethods = PaymentMethod::query()->active()->orderBy('name')->orderBy('id')->get();

        return $this->respondSuccess(
            PaymentMethodResource::collection($paymentMethods)->resolve(),
            'Payment methods retrieved.',
        );
    }

    public function store(StorePaymentMethodRequest $request): JsonResponse
    {
        $imagePath = $request->file('qr_image')->store('payment-methods', 'public');
        if (! is_string($imagePath)) {
            throw new RuntimeException('The QR image could not be stored.');
        }

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

        return $this->respondSuccess(
            PaymentMethodResource::make($paymentMethod)->resolve($request),
            'Payment method added.',
            201,
        );
    }

    public function update(UpdatePaymentMethodRequest $request, PaymentMethod $paymentMethod): JsonResponse
    {
        $newImagePath = $request->hasFile('qr_image')
            ? $request->file('qr_image')->store('payment-methods', 'public')
            : null;
        if ($newImagePath === false) {
            throw new RuntimeException('The QR image could not be stored.');
        }
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

        return $this->respondSuccess(
            PaymentMethodResource::make($paymentMethod->fresh())->resolve($request),
            'Payment method updated.',
        );
    }

    public function destroy(PaymentMethod $paymentMethod): JsonResponse
    {
        $paymentMethod->update(['is_active' => false]);

        return $this->respondSuccess(null, 'Payment method removed.');
    }
}

<?php

namespace App\Http\Controllers\Api\V1\Website;

use App\Http\Controllers\Controller;
use App\Http\Requests\Website\SendReservationEmailCodeRequest;
use App\Http\Requests\Website\VerifyReservationEmailCodeRequest;
use App\Services\ReservationEmailVerificationService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class ReservationEmailVerificationController extends Controller
{
    use ApiResponse;

    public function send(SendReservationEmailCodeRequest $request, ReservationEmailVerificationService $service): JsonResponse
    {
        $verification = $service->send($request->validated('checkout_key'), $request->validated('customer_email'));

        return $this->respondSuccess([
            'email' => $verification->email,
            'code_expires_at' => $verification->code_expires_at->toISOString(),
            'resend_available_at' => $verification->resend_available_at->toISOString(),
        ], 'A verification code has been sent. Please check your inbox or spam folder.');
    }

    public function verify(VerifyReservationEmailCodeRequest $request, ReservationEmailVerificationService $service): JsonResponse
    {
        $verification = $service->verify($request->validated('checkout_key'), $request->validated('customer_email'), $request->validated('code'));

        return $this->respondSuccess([
            'email' => $verification->email,
            'verified_at' => $verification->verified_at->toISOString(),
            'verification_expires_at' => $verification->verification_expires_at->toISOString(),
        ], 'Your email is verified. Review availability and pricing before paying.');
    }
}

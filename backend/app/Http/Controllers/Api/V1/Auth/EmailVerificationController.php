<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EmailVerificationController extends Controller
{
    use ApiResponse;

    public function verify(Request $request, int $id, string $hash): JsonResponse|RedirectResponse
    {
        $user = User::query()->findOrFail($id);

        abort_unless(
            hash_equals($hash, sha1($user->getEmailForVerification())),
            403,
        );

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new Verified($user));
        }

        if (! $request->expectsJson()) {
            return redirect(rtrim((string) config('app.frontend_url'), '/').'/verify-email?verified=1');
        }

        return $this->respondSuccess(message: 'Your email address has been verified.');
    }

    public function resend(Request $request): JsonResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return $this->respondSuccess(message: 'Your email address is already verified.');
        }

        $request->user()->sendEmailVerificationNotification();

        return $this->respondSuccess(message: 'A new verification link has been sent.');
    }
}

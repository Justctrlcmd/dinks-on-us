<?php

namespace App\Http\Controllers\Api\V1\Account;

use App\Http\Controllers\Controller;
use App\Http\Requests\Account\UpdatePasswordRequest;
use App\Models\AuditLog;
use App\Services\SecurityAuditService;
use App\Services\SessionSecurityService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class PasswordController extends Controller
{
    use ApiResponse;

    public function update(
        UpdatePasswordRequest $request,
        SessionSecurityService $sessions,
        SecurityAuditService $audit,
    ): JsonResponse {
        $user = $request->user();
        $user->update([
            'password' => $request->validated('password'),
        ]);
        $sessions->invalidate($user, $request->hasSession() ? $request->session()->getId() : null);
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }
        $audit->record(AuditLog::PASSWORD_CHANGED, $request, $user, $user, module: 'ACCOUNT', targetLabel: 'Account password');

        return $this->respondSuccess(message: 'Your password has been changed.');
    }
}

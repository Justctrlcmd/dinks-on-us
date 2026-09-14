<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Services\SecurityAuditService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LogoutController extends Controller
{
    use ApiResponse;

    public function __invoke(Request $request, SecurityAuditService $audit): JsonResponse
    {
        $user = $request->user();
        $audit->record(AuditLog::LOGOUT_COMPLETED, $request, $user, $user, module: 'SECURITY', targetLabel: 'Account session');

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return $this->respondSuccess(message: 'You have been signed out.');
    }
}

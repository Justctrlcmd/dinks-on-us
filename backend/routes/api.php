<?php

use App\Http\Controllers\Api\V1\Account\PasswordController;
use App\Http\Controllers\Api\V1\Account\ProfileController;
use App\Http\Controllers\Api\V1\Auth\CurrentUserController;
use App\Http\Controllers\Api\V1\Auth\EmailVerificationController;
use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\Management\CourtConfigurationController;
use App\Http\Controllers\Api\V1\Management\CourtController;
use App\Http\Controllers\Api\V1\Management\FaqController as ManagementFaqController;
use App\Http\Controllers\Api\V1\Management\PolicyController as ManagementPolicyController;
use App\Http\Controllers\Api\V1\Management\RentalEquipmentController;
use App\Http\Controllers\Api\V1\Website\FaqController as PublicFaqController;
use App\Http\Controllers\Api\V1\Website\PolicyController as PublicPolicyController;
use App\Http\Controllers\Api\V1\Website\ReservationOptionsController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', HealthController::class)->name('health');
    Route::get('/public/faqs', PublicFaqController::class)->name('public.faqs.index');
    Route::get('/public/policies', PublicPolicyController::class)->name('public.policies.index');
    Route::get('/public/reservation-options', ReservationOptionsController::class)->name('public.reservation-options.show');

    Route::middleware('guest')->group(function (): void {
        Route::post('/login', LoginController::class)->middleware('throttle:login')->name('login');
    });

    Route::get('/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('/logout', LogoutController::class)->name('logout');
        Route::get('/user', CurrentUserController::class)->name('user.show');

        Route::get('/profile', [ProfileController::class, 'show'])->name('profile.show');
        Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
        Route::put('/password', [PasswordController::class, 'update'])->name('password.change');

        Route::prefix('management')->name('management.')->group(function (): void {
            Route::get('/court-configuration', [CourtConfigurationController::class, 'show'])->name('court-configuration.show');
            Route::put('/court-configuration', [CourtConfigurationController::class, 'update'])->name('court-configuration.update');
            Route::apiResource('courts', CourtController::class)->only(['index', 'store', 'destroy']);
            Route::apiResource('rental-equipment', RentalEquipmentController::class)->only(['index', 'store', 'update', 'destroy']);

            Route::patch('/faqs/display-order', [ManagementFaqController::class, 'updateDisplayOrder'])
                ->name('faqs.display-order.update');
            Route::apiResource('faqs', ManagementFaqController::class)->except('show');

            Route::get('/policy-sections', [ManagementPolicyController::class, 'index'])->name('policy-sections.index');
            Route::post('/policy-sections/{section}/subheaders', [ManagementPolicyController::class, 'storeSubheader'])->name('policy-subheaders.store');
            Route::patch('/policy-sections/{section}/subheader-order', [ManagementPolicyController::class, 'updateSubheaderOrder'])->name('policy-subheaders.order.update');
            Route::patch('/policy-subheaders/{subheader}', [ManagementPolicyController::class, 'updateSubheader'])->name('policy-subheaders.update');
            Route::delete('/policy-subheaders/{subheader}', [ManagementPolicyController::class, 'destroySubheader'])->name('policy-subheaders.destroy');
            Route::post('/policy-sections/{section}/rules', [ManagementPolicyController::class, 'storeRule'])->name('policy-rules.store');
            Route::patch('/policy-subheaders/{subheader}/rule-order', [ManagementPolicyController::class, 'updateRuleOrder'])->name('policy-rules.order.update');
            Route::patch('/policy-rules/{rule}', [ManagementPolicyController::class, 'updateRule'])->name('policy-rules.update');
            Route::delete('/policy-rules/{rule}', [ManagementPolicyController::class, 'destroyRule'])->name('policy-rules.destroy');
        });

        Route::post('/email/verification-notification', [EmailVerificationController::class, 'resend'])
            ->middleware('throttle:6,1')
            ->name('verification.send');
    });
});

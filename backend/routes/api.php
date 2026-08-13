<?php

use App\Http\Controllers\Api\V1\Account\PasswordController;
use App\Http\Controllers\Api\V1\Account\ProfileController;
use App\Http\Controllers\Api\V1\Auth\CurrentUserController;
use App\Http\Controllers\Api\V1\Auth\EmailVerificationController;
use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\HealthController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', HealthController::class)->name('health');

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

        Route::post('/email/verification-notification', [EmailVerificationController::class, 'resend'])
            ->middleware('throttle:6,1')
            ->name('verification.send');
    });
});

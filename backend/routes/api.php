<?php

use App\Http\Controllers\Api\V1\Account\PasswordController;
use App\Http\Controllers\Api\V1\Account\ProfileController;
use App\Http\Controllers\Api\V1\Auth\CurrentUserController;
use App\Http\Controllers\Api\V1\Auth\EmailVerificationController;
use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\Management\AvailabilityClosureController;
use App\Http\Controllers\Api\V1\Management\CourtConfigurationController;
use App\Http\Controllers\Api\V1\Management\CourtController;
use App\Http\Controllers\Api\V1\Management\EventController as ManagementEventController;
use App\Http\Controllers\Api\V1\Management\FaqController as ManagementFaqController;
use App\Http\Controllers\Api\V1\Management\GalleryImageController;
use App\Http\Controllers\Api\V1\Management\GalleryTabController;
use App\Http\Controllers\Api\V1\Management\PaymentMethodController;
use App\Http\Controllers\Api\V1\Management\PolicyController as ManagementPolicyController;
use App\Http\Controllers\Api\V1\Management\RentalEquipmentController;
use App\Http\Controllers\Api\V1\Management\RoleController;
use App\Http\Controllers\Api\V1\Management\StaffController;
use App\Http\Controllers\Api\V1\Website\EventController as PublicEventController;
use App\Http\Controllers\Api\V1\Website\FaqController as PublicFaqController;
use App\Http\Controllers\Api\V1\Website\GalleryController as PublicGalleryController;
use App\Http\Controllers\Api\V1\Website\PaymentMethodController as PublicPaymentMethodController;
use App\Http\Controllers\Api\V1\Website\PolicyController as PublicPolicyController;
use App\Http\Controllers\Api\V1\Website\ReservationOptionsController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', HealthController::class)->name('health');
    Route::get('/public/faqs', PublicFaqController::class)->name('public.faqs.index');
    Route::get('/public/gallery', PublicGalleryController::class)->name('public.gallery.index');
    Route::get('/public/events', [PublicEventController::class, 'index'])->name('public.events.index');
    Route::get('/public/events/{slug}', [PublicEventController::class, 'show'])->name('public.events.show');
    Route::get('/public/policies', PublicPolicyController::class)->name('public.policies.index');
    Route::get('/public/payment-methods', PublicPaymentMethodController::class)->name('public.payment-methods.index');
    Route::get('/public/closed-dates', [ReservationOptionsController::class, 'closedDates'])->name('public.closed-dates.index');
    Route::get('/public/reservation-options', ReservationOptionsController::class)->name('public.reservation-options.show');

    Route::middleware('guest')->group(function (): void {
        Route::post('/login', LoginController::class)->middleware('throttle:login')->name('login');
    });

    Route::get('/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');

    Route::middleware(['auth:sanctum', 'active'])->group(function (): void {
        Route::post('/logout', LogoutController::class)->name('logout');
        Route::get('/user', CurrentUserController::class)->name('user.show');

        Route::get('/profile', [ProfileController::class, 'show'])->name('profile.show');
        Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
        Route::put('/password', [PasswordController::class, 'update'])->name('password.change');

        Route::prefix('management')->name('management.')->group(function (): void {
            Route::middleware('module:MANAGEMENT_COURT_PRICING')->group(function (): void {
                Route::get('/court-configuration', [CourtConfigurationController::class, 'show'])->name('court-configuration.show');
                Route::put('/court-configuration', [CourtConfigurationController::class, 'update'])->name('court-configuration.update');
                Route::apiResource('courts', CourtController::class)->only(['index', 'store', 'destroy']);
                Route::apiResource('rental-equipment', RentalEquipmentController::class)->only(['index', 'store', 'update', 'destroy']);
            });

            Route::middleware('module:MANAGEMENT_PAYMENT_METHODS')->group(function (): void {
                Route::apiResource('payment-methods', PaymentMethodController::class)->only(['index', 'store', 'update', 'destroy']);
            });

            Route::middleware('module:MANAGEMENT_AVAILABILITY_CLOSURES')->group(function (): void {
                Route::get('/availability-closures', [AvailabilityClosureController::class, 'index'])->name('availability-closures.index');
                Route::post('/closed-dates', [AvailabilityClosureController::class, 'storeClosedDate'])->name('closed-dates.store');
                Route::delete('/closed-dates/{closedDate}', [AvailabilityClosureController::class, 'destroyClosedDate'])->name('closed-dates.destroy');
                Route::post('/availability-blocks', [AvailabilityClosureController::class, 'storeAvailabilityBlock'])->name('availability-blocks.store');
                Route::delete('/availability-blocks/{block}', [AvailabilityClosureController::class, 'destroyAvailabilityBlock'])->name('availability-blocks.destroy');
                Route::get('/availability-activity', [AvailabilityClosureController::class, 'activity'])->name('availability-activity.index');
            });

            Route::middleware('module:MANAGEMENT_FAQS')->group(function (): void {
                Route::patch('/faqs/display-order', [ManagementFaqController::class, 'updateDisplayOrder'])
                    ->name('faqs.display-order.update');
                Route::apiResource('faqs', ManagementFaqController::class)->except('show');
            });

            Route::middleware('module:MANAGEMENT_EVENTS')->group(function (): void {
                Route::apiResource('events', ManagementEventController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
            });

            Route::middleware('module:MANAGEMENT_GALLERY')->group(function (): void {
                Route::patch('/gallery-tabs/display-order', [GalleryTabController::class, 'updateDisplayOrder'])
                    ->name('gallery-tabs.display-order.update');
                Route::apiResource('gallery-tabs', GalleryTabController::class)
                    ->parameters(['gallery-tabs' => 'galleryTab'])
                    ->only(['index', 'store', 'update', 'destroy']);
                Route::patch('/gallery-tabs/{galleryTab}/image-order', [GalleryImageController::class, 'updateDisplayOrder'])
                    ->name('gallery-images.display-order.update');
                Route::apiResource('gallery', GalleryImageController::class)
                    ->parameters(['gallery' => 'galleryImage'])
                    ->only(['index', 'store', 'update', 'destroy']);
            });

            Route::middleware('module:MANAGEMENT_RULES_POLICIES')->group(function (): void {
                Route::get('/policy-sections', [ManagementPolicyController::class, 'index'])->name('policy-sections.index');
                Route::post('/policy-sections/{section}/subheaders', [ManagementPolicyController::class, 'storeSubheader'])->name('policy-subheaders.store');
                Route::patch('/policy-sections/{section}/subheader-order', [ManagementPolicyController::class, 'updateSubheaderOrder'])->name('policy-subheaders.order.update');
                Route::patch('/policy-subheaders/{subheader}', [ManagementPolicyController::class, 'updateSubheader'])->name('policy-subheaders.update');
                Route::delete('/policy-subheaders/{subheader}', [ManagementPolicyController::class, 'destroySubheader'])->name('policy-subheaders.destroy');
                Route::post('/policy-sections/{section}/rules', [ManagementPolicyController::class, 'storeRule'])->name('policy-rules.store');
                Route::patch('/policy-subheaders/{subheader}/rule-order', [ManagementPolicyController::class, 'updateRuleOrder'])->name('policy-subheaders.order.update');
                Route::patch('/policy-rules/{rule}', [ManagementPolicyController::class, 'updateRule'])->name('policy-rules.update');
                Route::delete('/policy-rules/{rule}', [ManagementPolicyController::class, 'destroyRule'])->name('policy-rules.destroy');
            });

            Route::middleware('module:MANAGEMENT_TEAM_ACCESS')->group(function (): void {
                Route::apiResource('roles', RoleController::class)->only(['index', 'store', 'update', 'destroy']);
                Route::apiResource('staff', StaffController::class)->only(['index', 'store', 'update']);
                Route::post('/staff/{staff}/activate', [StaffController::class, 'activate'])->name('staff.activate');
                Route::post('/staff/{staff}/deactivate', [StaffController::class, 'deactivate'])->name('staff.deactivate');
                Route::put('/staff/{staff}/password', [StaffController::class, 'resetPassword'])->name('staff.password.reset');
            });
        });

        Route::post('/email/verification-notification', [EmailVerificationController::class, 'resend'])
            ->middleware('throttle:6,1')
            ->name('verification.send');
    });
});

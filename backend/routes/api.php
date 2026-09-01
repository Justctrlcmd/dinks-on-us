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
use App\Http\Controllers\Api\V1\Management\DashboardController;
use App\Http\Controllers\Api\V1\Management\DashboardPaymentProofController;
use App\Http\Controllers\Api\V1\Management\EventController as ManagementEventController;
use App\Http\Controllers\Api\V1\Management\FaqController as ManagementFaqController;
use App\Http\Controllers\Api\V1\Management\GalleryImageController;
use App\Http\Controllers\Api\V1\Management\GalleryTabController;
use App\Http\Controllers\Api\V1\Management\HistoryController;
use App\Http\Controllers\Api\V1\Management\HistoryPaymentProofController;
use App\Http\Controllers\Api\V1\Management\PaymentMethodController;
use App\Http\Controllers\Api\V1\Management\PaymentProofRetentionController;
use App\Http\Controllers\Api\V1\Management\PolicyController as ManagementPolicyController;
use App\Http\Controllers\Api\V1\Management\PushSubscriptionController;
use App\Http\Controllers\Api\V1\Management\RentalEquipmentController;
use App\Http\Controllers\Api\V1\Management\ReportController;
use App\Http\Controllers\Api\V1\Management\ReservationController as ManagementReservationController;
use App\Http\Controllers\Api\V1\Management\ReservationPaymentProofController;
use App\Http\Controllers\Api\V1\Management\RoleController;
use App\Http\Controllers\Api\V1\Management\StaffController;
use App\Http\Controllers\Api\V1\Website\EventController as PublicEventController;
use App\Http\Controllers\Api\V1\Website\FaqController as PublicFaqController;
use App\Http\Controllers\Api\V1\Website\GalleryController as PublicGalleryController;
use App\Http\Controllers\Api\V1\Website\PaymentMethodController as PublicPaymentMethodController;
use App\Http\Controllers\Api\V1\Website\PolicyController as PublicPolicyController;
use App\Http\Controllers\Api\V1\Website\ReservationController as PublicReservationController;
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
    Route::post('/public/reservations', [PublicReservationController::class, 'store'])->middleware('throttle:10,1')->name('public.reservations.store');

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
            Route::middleware('module:DASHBOARD')->group(function (): void {
                Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard.index');
                Route::get('/dashboard/reservations/{reservation}', [DashboardController::class, 'showReservation'])
                    ->name('dashboard.reservations.show');
                Route::get('/dashboard-payments/{payment}/proof', DashboardPaymentProofController::class)
                    ->name('dashboard-payments.proof');
            });

            Route::middleware('module:RESERVATION')->group(function (): void {
                Route::post('/push-subscriptions', [PushSubscriptionController::class, 'store'])->middleware('throttle:20,1')->name('push-subscriptions.store');
                Route::delete('/push-subscriptions', [PushSubscriptionController::class, 'destroy'])->middleware('throttle:20,1')->name('push-subscriptions.destroy');
                Route::get('/reservations/pending-summary', [ManagementReservationController::class, 'pendingSummary'])->name('reservations.pending-summary');
                Route::get('/reservations', [ManagementReservationController::class, 'index'])->name('reservations.index');
                Route::post('/reservations/walk-in', [ManagementReservationController::class, 'storeWalkIn'])->name('reservations.walk-in.store');
                Route::get('/reservations/{reservation}', [ManagementReservationController::class, 'show'])->name('reservations.show');
                Route::post('/reservations/{reservation}/verify', [ManagementReservationController::class, 'verify'])->name('reservations.verify');
                Route::post('/reservations/{reservation}/reject', [ManagementReservationController::class, 'reject'])->name('reservations.reject');
                Route::post('/reservations/{reservation}/start', [ManagementReservationController::class, 'start'])->name('reservations.start');
                Route::post('/reservations/{reservation}/reschedule', [ManagementReservationController::class, 'reschedule'])->name('reservations.reschedule');
                Route::post('/reservations/{reservation}/add-ons', [ManagementReservationController::class, 'addOns'])->name('reservations.add-ons');
                Route::post('/reservations/{reservation}/complete', [ManagementReservationController::class, 'complete'])->name('reservations.complete');
                Route::post('/reservations/{reservation}/no-show', [ManagementReservationController::class, 'noShow'])->name('reservations.no-show');
                Route::post('/reservations/{reservation}/cancel', [ManagementReservationController::class, 'cancel'])->name('reservations.cancel');
                Route::get('/reservation-payments/{payment}/proof', ReservationPaymentProofController::class)->name('reservation-payments.proof');
            });

            Route::middleware('module:HISTORY')->group(function (): void {
                Route::get('/history', [HistoryController::class, 'index'])->name('history.index');
                Route::get('/history/{reservation}', [HistoryController::class, 'show'])->name('history.show');
                Route::get('/history-payments/{payment}/proof', HistoryPaymentProofController::class)->name('history-payments.proof');
            });

            Route::prefix('reports')->middleware('module:REPORTS')->name('reports.')->group(function (): void {
                Route::get('/overview', [ReportController::class, 'overview'])->name('overview');
                Route::get('/revenue', [ReportController::class, 'revenue'])->name('revenue');
                Route::get('/reservations', [ReportController::class, 'reservations'])->name('reservations');
                Route::get('/court-utilization', [ReportController::class, 'courtUtilization'])->name('court-utilization');
                Route::get('/popular-times', [ReportController::class, 'popularTimes'])->name('popular-times');
                Route::get('/payments', [ReportController::class, 'payments'])->name('payments');
                Route::get('/operations', [ReportController::class, 'operations'])->name('operations');
            });

            Route::middleware('module:MANAGEMENT_COURT_PRICING')->group(function (): void {
                Route::get('/court-configuration', [CourtConfigurationController::class, 'show'])->name('court-configuration.show');
                Route::put('/court-configuration', [CourtConfigurationController::class, 'update'])->name('court-configuration.update');
                Route::apiResource('courts', CourtController::class)->only(['index', 'store', 'destroy']);
                Route::apiResource('rental-equipment', RentalEquipmentController::class)->only(['index', 'store', 'update', 'destroy']);
            });

            Route::middleware('module:MANAGEMENT_PAYMENT_METHODS')->group(function (): void {
                Route::apiResource('payment-methods', PaymentMethodController::class)->only(['index', 'store', 'update', 'destroy']);
            });

            Route::prefix('payment-proof-retention')->middleware('module:MANAGEMENT_STORAGE_RETENTION')->name('payment-proof-retention.')->group(function (): void {
                Route::get('/preview', [PaymentProofRetentionController::class, 'preview'])->name('preview');
                Route::post('/delete', [PaymentProofRetentionController::class, 'delete'])->name('delete');
                Route::get('/activity', [PaymentProofRetentionController::class, 'activity'])->name('activity');
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

<?php

namespace App\Services;

use App\Exceptions\ReservationConflictException;
use App\Models\AuditLog;
use App\Models\AvailabilityClosure;
use App\Models\Court;
use App\Models\CourtConfiguration;
use App\Models\PaymentMethod;
use App\Models\PolicySection;
use App\Models\RentalEquipment;
use App\Models\Reservation;
use App\Models\ReservationEquipmentItem;
use App\Models\ReservationSlotLock;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Database\QueryException;
use Illuminate\Http\UploadedFile;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection as SupportCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

class ReservationService
{
    private const DETAIL_RELATIONS = ['currentSlots.court', 'payments', 'equipmentItems', 'adjustments', 'scheduleHistories', 'refunds'];

    public function __construct(private readonly PaymentProofStorageService $proofStorage) {}

    /** @param array<string, mixed> $input */
    public function submit(array $input, UploadedFile $proof, ?string $idempotencyKey = null): Reservation
    {
        if ($idempotencyKey) {
            $existing = Reservation::query()->where('idempotency_key', $idempotencyKey)->first();
            if ($existing) {
                return $existing->fresh(self::DETAIL_RELATIONS);
            }
        }

        $proofPath = $this->proofStorage->store($proof);

        try {
            return DB::transaction(function () use ($input, $proofPath, $idempotencyKey): Reservation {
                $slots = collect($input['slots'])->sortBy(fn (array $slot): string => sprintf('%010d-%02d', $slot['court_id'], $slot['start_hour']))->values()->all();
                $date = $slots[0]['date'];
                $configuration = CourtConfiguration::query()->with('ratePeriods')->lockForUpdate()->find(1);
                if (! $configuration) {
                    throw ValidationException::withMessages(['slots' => ['Court pricing has not been configured.']]);
                }

                $courtIds = collect($slots)->pluck('court_id')->unique()->sort()->values();
                $courts = Court::query()->active()->whereIn('id', $courtIds)->orderBy('id')->lockForUpdate()->get()->keyBy('id');
                if ($courts->count() !== $courtIds->count()) {
                    throw ValidationException::withMessages(['slots' => ['One or more selected courts are unavailable.']]);
                }

                $pricedSlots = $this->validateAndPriceSlots($slots, $configuration, $courts);
                $this->assertNoClosureOrLock($pricedSlots);

                $paymentMethod = PaymentMethod::query()->active()->lockForUpdate()->find($input['payment_method_id']);
                if (! $paymentMethod) {
                    throw ValidationException::withMessages(['payment_method_id' => ['Choose an active payment method.']]);
                }

                $equipment = $this->validateEquipment($input['equipment'] ?? [], false);
                $courtAmount = collect($pricedSlots)->sum('unit_amount');
                $playerAmount = (int) $input['additional_players'] * (float) $configuration->additional_player_price;
                $equipmentAmount = $equipment->sum(fn (array $item): float => $item['quantity'] * $item['unit_amount']);
                $originalAmount = round($courtAmount + $playerAmount + $equipmentAmount, 2);

                $reservation = Reservation::query()->create([
                    'idempotency_key' => $idempotencyKey,
                    'source' => 'ONLINE', 'booking_date' => $date, 'customer_name' => $input['customer_name'],
                    'customer_email' => $input['customer_email'], 'customer_contact_number' => $input['customer_contact_number'],
                    'status' => Reservation::STATUS_PENDING, 'original_additional_players' => $input['additional_players'],
                    'additional_player_unit_amount' => $configuration->additional_player_price, 'original_amount' => $originalAmount,
                    'final_amount' => $originalAmount, 'policy_snapshot' => $this->policySnapshot(),
                    'policy_accepted_at' => now(), 'submitted_at' => now(),
                ]);
                $reservation->update(['reference_number' => 'RF-'.str_pad((string) $reservation->id, 3, '0', STR_PAD_LEFT)]);

                foreach ($pricedSlots as $slotData) {
                    $slot = $reservation->slots()->create([...$slotData, 'kind' => 'ORIGINAL', 'is_current' => true]);
                    ReservationSlotLock::query()->create(['reservation_slot_id' => $slot->id, 'court_id' => $slot->court_id, 'date' => $slot->date->toDateString(), 'start_hour' => $slot->start_hour]);
                }

                foreach ($equipment as $item) {
                    $reservation->equipmentItems()->create([...$item, 'kind' => 'ORIGINAL', 'is_active' => true]);
                }

                $reservation->payments()->create([
                    'payment_method_id' => $paymentMethod->id, 'payment_method_name' => $paymentMethod->name,
                    'channel' => 'EWALLET', 'kind' => 'INITIAL', 'status' => 'PENDING', 'amount' => $originalAmount,
                    'reference_number' => $input['payment_reference_number'], 'proof_path' => $proofPath,
                ]);
                $reservation->statusHistories()->create(['from_status' => null, 'to_status' => Reservation::STATUS_PENDING]);
                $this->audit(null, AuditLog::RESERVATION_SUBMITTED, $reservation, ['status' => Reservation::STATUS_PENDING, 'reference_number' => $reservation->reference_number]);

                return $reservation->fresh(self::DETAIL_RELATIONS);
            });
        } catch (QueryException $exception) {
            if ($idempotencyKey && $exception->getCode() === '23000' && str_contains($exception->getMessage(), 'idempotency_key')) {
                $this->proofStorage->delete($proofPath);
                $existing = Reservation::query()->where('idempotency_key', $idempotencyKey)->first();
                if ($existing) {
                    return $existing->fresh(self::DETAIL_RELATIONS);
                }
            }
            $this->proofStorage->delete($proofPath);
            throw $exception;
        } catch (Throwable $exception) {
            $this->proofStorage->delete($proofPath);
            throw $exception;
        }
    }

    /** @param array<string, mixed> $input */
    public function createWalkIn(array $input, User $user, ?UploadedFile $proof = null): Reservation
    {
        $proofPath = $proof ? $this->proofStorage->store($proof) : null;

        try {
            return DB::transaction(function () use ($input, $user, $proofPath): Reservation {
                $slots = collect($input['slots'])
                    ->sortBy(fn (array $slot): string => sprintf('%010d-%02d', $slot['court_id'], $slot['start_hour']))
                    ->values()
                    ->all();
                $date = $slots[0]['date'];
                $configuration = CourtConfiguration::query()->with('ratePeriods')->lockForUpdate()->find(1);
                if (! $configuration) {
                    throw ValidationException::withMessages(['slots' => ['Court pricing has not been configured.']]);
                }

                $courtIds = collect($slots)->pluck('court_id')->unique()->sort()->values();
                $courts = Court::query()->active()->whereIn('id', $courtIds)->orderBy('id')->lockForUpdate()->get()->keyBy('id');
                if ($courts->count() !== $courtIds->count()) {
                    throw ValidationException::withMessages(['slots' => ['One or more selected courts are unavailable.']]);
                }

                $pricedSlots = $this->validateAndPriceSlots($slots, $configuration, $courts);
                $this->assertNoClosureOrLock($pricedSlots);
                $equipment = $this->validateEquipment($input['equipment'] ?? [], false);
                $courtAmount = collect($pricedSlots)->sum('unit_amount');
                $playerAmount = (int) $input['additional_players'] * (float) $configuration->additional_player_price;
                $equipmentAmount = $equipment->sum(fn (array $item): float => $item['quantity'] * $item['unit_amount']);
                $originalAmount = round($courtAmount + $playerAmount + $equipmentAmount, 2);
                $now = now();
                $channel = $input['payment_channel'];
                $paymentMethod = null;
                if ($channel === 'EWALLET_BANK') {
                    $paymentMethod = PaymentMethod::query()->active()->lockForUpdate()->find($input['payment_method_id']);
                    if (! $paymentMethod) {
                        throw ValidationException::withMessages(['payment_method_id' => ['Choose an active e-wallet or bank payment method.']]);
                    }
                }

                $reservation = Reservation::query()->create([
                    'source' => 'WALK_IN',
                    'booking_date' => $date,
                    'customer_name' => $input['customer_name'],
                    'customer_email' => $input['customer_email'],
                    'customer_contact_number' => $input['customer_contact_number'],
                    'status' => Reservation::STATUS_VERIFIED,
                    'original_additional_players' => $input['additional_players'],
                    'additional_player_unit_amount' => $configuration->additional_player_price,
                    'original_amount' => $originalAmount,
                    'final_amount' => $originalAmount,
                    'amount_paid' => $originalAmount,
                    'submitted_at' => $now,
                    'verified_at' => $now,
                    'created_by_user_id' => $user->id,
                    'verified_by_user_id' => $user->id,
                ]);
                $reservation->update(['reference_number' => 'RF-'.str_pad((string) $reservation->id, 3, '0', STR_PAD_LEFT)]);

                foreach ($pricedSlots as $slotData) {
                    $slot = $reservation->slots()->create([
                        ...$slotData,
                        'kind' => 'ORIGINAL',
                        'is_current' => true,
                        'added_by_user_id' => $user->id,
                    ]);
                    ReservationSlotLock::query()->create([
                        'reservation_slot_id' => $slot->id,
                        'court_id' => $slot->court_id,
                        'date' => $slot->date->toDateString(),
                        'start_hour' => $slot->start_hour,
                    ]);
                }

                foreach ($equipment as $item) {
                    $reservation->equipmentItems()->create([
                        ...$item,
                        'kind' => 'ORIGINAL',
                        'is_active' => true,
                        'added_by_user_id' => $user->id,
                    ]);
                }
                $this->assertEquipmentAvailable($reservation);

                $reservation->payments()->create([
                    'payment_method_id' => $paymentMethod?->id,
                    'payment_method_name' => $paymentMethod?->name ?? 'Cash',
                    'channel' => $channel,
                    'kind' => 'INITIAL',
                    'status' => 'VERIFIED',
                    'amount' => $originalAmount,
                    'reference_number' => $input['payment_reference_number'] ?? null,
                    'proof_path' => $proofPath,
                    'recorded_by_user_id' => $user->id,
                    'verified_by_user_id' => $user->id,
                    'verified_at' => $now,
                ]);
                $reservation->statusHistories()->create([
                    'from_status' => null,
                    'to_status' => Reservation::STATUS_VERIFIED,
                    'changed_by_user_id' => $user->id,
                ]);
                $this->audit($user, AuditLog::RESERVATION_WALK_IN_CREATED, $reservation, [
                    'status' => Reservation::STATUS_VERIFIED,
                    'source' => 'WALK_IN',
                    'reference_number' => $reservation->reference_number,
                    'amount_paid' => $originalAmount,
                ]);

                return $reservation->fresh(self::DETAIL_RELATIONS);
            });
        } catch (Throwable $exception) {
            if ($proofPath) {
                $this->proofStorage->delete($proofPath);
            }
            throw $exception;
        }
    }

    /** @param array<string, mixed> $filters @return array{paginator: LengthAwarePaginator, kpis: array<string, int>} */
    public function operationalList(array $filters): array
    {
        $query = Reservation::query()->operational()->with(['currentSlots.court'])->latest('submitted_at')->latest('id');
        if ($search = trim((string) ($filters['search'] ?? ''))) {
            $query->where(function ($query) use ($search): void {
                $query->where('reference_number', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_email', 'like', "%{$search}%")
                    ->orWhere('customer_contact_number', 'like', "%{$search}%")
                    ->orWhereHas('payments', fn ($payments) => $payments->where('reference_number', 'like', "%{$search}%"));
            });
        }
        if ($status = $filters['status'] ?? null) {
            if ($status === 'RESCHEDULED') {
                $query->where('status', Reservation::STATUS_VERIFIED)->where('is_rescheduled', true);
            } elseif ($status === Reservation::STATUS_VERIFIED) {
                $query->where('status', $status)->where('is_rescheduled', false);
            } else {
                $query->where('status', $status);
            }
        }

        $kpis = Reservation::query()
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as pending', [Reservation::STATUS_PENDING])
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as ongoing', [Reservation::STATUS_ONGOING])
            ->selectRaw('SUM(CASE WHEN status = ? AND is_rescheduled = 0 THEN 1 ELSE 0 END) as verified', [Reservation::STATUS_VERIFIED])
            ->selectRaw('SUM(CASE WHEN status = ? AND is_rescheduled = 1 THEN 1 ELSE 0 END) as rescheduled', [Reservation::STATUS_VERIFIED])
            ->first();

        return [
            'paginator' => $query->paginate(10),
            'kpis' => [
                'pending' => (int) ($kpis?->pending ?? 0),
                'ongoing' => (int) ($kpis?->ongoing ?? 0),
                'verified' => (int) ($kpis?->verified ?? 0),
                'rescheduled' => (int) ($kpis?->rescheduled ?? 0),
            ],
        ];
    }

    /** @return array{pending_count: int, latest_online_submission_id: int|null, latest_online_submission_at: string|null} */
    public function pendingSummary(): array
    {
        $summary = Reservation::query()
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as pending_count', [Reservation::STATUS_PENDING])
            ->selectRaw("MAX(CASE WHEN source = 'ONLINE' THEN id ELSE NULL END) as latest_online_submission_id")
            ->selectRaw("MAX(CASE WHEN source = 'ONLINE' THEN submitted_at ELSE NULL END) as latest_online_submission_at")
            ->first();

        return [
            'pending_count' => (int) ($summary?->pending_count ?? 0),
            'latest_online_submission_id' => $summary?->latest_online_submission_id === null ? null : (int) $summary->latest_online_submission_id,
            'latest_online_submission_at' => $summary?->latest_online_submission_at,
        ];
    }

    /** @param array<string, mixed> $filters @return array{paginator: LengthAwarePaginator, kpis: array<string, int>} */
    public function historyList(array $filters): array
    {
        $query = Reservation::query()
            ->whereIn('status', Reservation::FINAL_STATUSES)
            ->with(['currentSlots.court'])
            ->latest('updated_at')
            ->latest('id');

        if ($search = trim((string) ($filters['search'] ?? ''))) {
            $courtSearch = preg_replace('/^court\s+/i', '', $search) ?? $search;
            $query->where(function ($query) use ($courtSearch, $search): void {
                $query->where('reference_number', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_email', 'like', "%{$search}%")
                    ->orWhere('customer_contact_number', 'like', "%{$search}%")
                    ->orWhere('booking_date', 'like', "%{$search}%")
                    ->orWhereHas('currentSlots.court', fn ($courts) => $courts->where('court_number', 'like', "%{$courtSearch}%"))
                    ->orWhereHas('payments', fn ($payments) => $payments->where('reference_number', 'like', "%{$search}%"));
            });
        }
        if ($status = $filters['status'] ?? null) {
            $query->where('status', $status);
        }
        if ($source = $filters['source'] ?? null) {
            $query->where('source', $source);
        }

        $counts = Reservation::query()
            ->whereIn('status', Reservation::FINAL_STATUSES)
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return [
            'paginator' => $query->paginate(10),
            'kpis' => [
                'completed' => (int) ($counts[Reservation::STATUS_COMPLETED] ?? 0),
                'cancelled' => (int) ($counts[Reservation::STATUS_CANCELLED] ?? 0),
                'rejected' => (int) ($counts[Reservation::STATUS_REJECTED] ?? 0),
                'no_show' => (int) ($counts[Reservation::STATUS_NO_SHOW] ?? 0),
            ],
        ];
    }

    public function historyDetail(Reservation $reservation): Reservation
    {
        return Reservation::query()
            ->whereKey($reservation->getKey())
            ->whereIn('status', Reservation::FINAL_STATUSES)
            ->firstOrFail()
            ->load(self::DETAIL_RELATIONS);
    }

    public function detail(Reservation $reservation): Reservation
    {
        return $reservation->load(self::DETAIL_RELATIONS);
    }

    public function verify(Reservation $reservation, User $user): Reservation
    {
        return DB::transaction(function () use ($reservation, $user): Reservation {
            $reservation = $this->lockReservation($reservation);
            $this->requireStatus($reservation, Reservation::STATUS_PENDING, 'Only pending reservations can be verified.');
            $this->assertEquipmentAvailable($reservation);
            $payment = $reservation->payments()->where('kind', 'INITIAL')->lockForUpdate()->firstOrFail();
            $payment->update(['status' => 'VERIFIED', 'verified_by_user_id' => $user->id, 'verified_at' => now()]);
            $reservation->update(['status' => Reservation::STATUS_VERIFIED, 'verified_by_user_id' => $user->id, 'verified_at' => now(), 'amount_paid' => $payment->amount]);
            $this->recordTransition($reservation, Reservation::STATUS_PENDING, Reservation::STATUS_VERIFIED, $user);
            $this->audit($user, AuditLog::RESERVATION_VERIFIED, $reservation, ['status' => Reservation::STATUS_VERIFIED]);

            return $reservation->fresh(self::DETAIL_RELATIONS);
        });
    }

    public function reject(Reservation $reservation, User $user, string $concern, string $reason): Reservation
    {
        return DB::transaction(function () use ($reservation, $user, $concern, $reason): Reservation {
            $reservation = $this->lockReservation($reservation);
            $this->requireStatus($reservation, Reservation::STATUS_PENDING, 'Only pending reservations can be rejected.');
            $reservation->payments()->where('kind', 'INITIAL')->update(['status' => 'REJECTED']);
            $this->releaseLocks($reservation);
            $reservation->update(['status' => Reservation::STATUS_REJECTED, 'rejection_concern' => $concern, 'rejection_reason' => $reason, 'rejected_by_user_id' => $user->id, 'rejected_at' => now()]);
            $this->recordTransition($reservation, Reservation::STATUS_PENDING, Reservation::STATUS_REJECTED, $user, $reason);
            $this->audit($user, AuditLog::RESERVATION_REJECTED, $reservation, ['status' => Reservation::STATUS_REJECTED, 'concern' => $concern]);

            return $reservation->fresh(self::DETAIL_RELATIONS);
        });
    }

    public function start(Reservation $reservation, User $user): Reservation
    {
        return DB::transaction(function () use ($reservation, $user): Reservation {
            $reservation = $this->lockReservation($reservation);
            $this->requireStatus($reservation, Reservation::STATUS_VERIFIED, 'Only verified reservations can be marked ongoing.');
            $reservation->update(['status' => Reservation::STATUS_ONGOING, 'started_by_user_id' => $user->id, 'started_at' => now()]);
            $this->recordTransition($reservation, Reservation::STATUS_VERIFIED, Reservation::STATUS_ONGOING, $user);
            $this->audit($user, AuditLog::RESERVATION_STARTED, $reservation, ['status' => Reservation::STATUS_ONGOING]);

            return $reservation->fresh(self::DETAIL_RELATIONS);
        });
    }

    /** @param list<array{court_id: int, date: string, start_hour: int}> $inputSlots */
    public function reschedule(Reservation $reservation, User $user, array $inputSlots): Reservation
    {
        $this->requireManager($user);

        return DB::transaction(function () use ($reservation, $user, $inputSlots): Reservation {
            $reservation = $this->lockReservation($reservation);
            $this->requireStatus($reservation, Reservation::STATUS_VERIFIED, 'Only verified reservations can be rescheduled.');
            $oldSlots = $reservation->currentSlots()->with('court')->orderBy('date')->orderBy('court_id')->orderBy('start_hour')->lockForUpdate()->get();
            if ($oldSlots->count() !== count($inputSlots)) {
                throw ValidationException::withMessages(['slots' => ["Choose exactly {$oldSlots->count()} one-hour replacement slots."]]);
            }

            $configuration = CourtConfiguration::query()->with('ratePeriods')->lockForUpdate()->find(1);
            if (! $configuration) {
                throw ValidationException::withMessages(['slots' => ['Court pricing has not been configured.']]);
            }
            $courtIds = collect($inputSlots)->pluck('court_id')->unique()->sort()->values();
            $courts = Court::query()->active()->whereIn('id', $courtIds)->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            if ($courts->count() !== $courtIds->count()) {
                throw ValidationException::withMessages(['slots' => ['One or more selected courts are unavailable.']]);
            }
            $pricedSlots = $this->validateAndPriceSlots($inputSlots, $configuration, $courts);
            $this->assertNoClosureOrLock($pricedSlots, $reservation->id);

            $oldSnapshot = $this->slotSnapshot($oldSlots);
            $oldAmount = (float) $oldSlots->sum('unit_amount');
            $newAmount = (float) collect($pricedSlots)->sum('unit_amount');
            $difference = round($newAmount - $oldAmount, 2);

            $this->releaseLocks($reservation);
            $oldSlots->each->update(['is_current' => false]);
            foreach ($pricedSlots as $slotData) {
                $slot = $reservation->slots()->create([...$slotData, 'kind' => 'RESCHEDULED', 'is_current' => true, 'added_by_user_id' => $user->id]);
                ReservationSlotLock::query()->create(['reservation_slot_id' => $slot->id, 'court_id' => $slot->court_id, 'date' => $slot->date->toDateString(), 'start_hour' => $slot->start_hour]);
            }
            if ($difference !== 0.0) {
                $reservation->adjustments()->create([
                    'type' => $difference > 0 ? 'RESCHEDULE_BALANCE' : 'RESCHEDULE_CREDIT',
                    'description' => $difference > 0 ? 'Reschedule price difference' : 'Refundable reschedule credit',
                    'quantity' => 1, 'unit_amount' => $difference, 'total_amount' => $difference, 'created_by_user_id' => $user->id,
                ]);
            }
            $newDate = $pricedSlots[0]['date'];
            $reservation->scheduleHistories()->create([
                'old_booking_date' => $reservation->booking_date, 'new_booking_date' => $newDate,
                'old_slots' => $oldSnapshot, 'new_slots' => collect($pricedSlots)->map(fn (array $slot): array => $this->slotArray($slot))->all(),
                'old_slot_amount' => $oldAmount, 'new_slot_amount' => $newAmount, 'difference_amount' => $difference, 'performed_by_user_id' => $user->id,
            ]);
            $reservation->update(['booking_date' => $newDate, 'is_rescheduled' => true, 'reschedule_count' => $reservation->reschedule_count + 1]);
            $this->recalculate($reservation);
            $this->audit($user, AuditLog::RESERVATION_RESCHEDULED, $reservation, ['difference_amount' => $difference, 'reschedule_count' => $reservation->reschedule_count]);

            return $reservation->fresh(self::DETAIL_RELATIONS);
        });
    }

    /** @param array<string, mixed> $input */
    public function addOns(Reservation $reservation, User $user, array $input, ?UploadedFile $proof = null): Reservation
    {
        $proofPath = null;
        try {
            return DB::transaction(function () use ($reservation, $user, $input, $proof, &$proofPath): Reservation {
                $reservation = $this->lockReservation($reservation);
                $this->requireStatus($reservation, Reservation::STATUS_ONGOING, 'Add-ons can only be added to an ongoing reservation.');
                $configuration = CourtConfiguration::query()->with('ratePeriods')->lockForUpdate()->find(1);
                if (! $configuration) {
                    throw ValidationException::withMessages(['add_ons' => ['Court pricing has not been configured.']]);
                }

                $channel = $input['payment_channel'];
                $paymentMethod = null;
                if ($channel === 'EWALLET_BANK') {
                    $paymentMethod = PaymentMethod::query()->active()->lockForUpdate()->find($input['payment_method_id']);
                    if (! $paymentMethod) {
                        throw ValidationException::withMessages(['payment_method_id' => ['Choose an active e-wallet or bank payment method.']]);
                    }
                }

                $slots = $input['slots'] ?? [];
                $addOnAmount = 0.0;
                if ($slots) {
                    if (collect($slots)->pluck('date')->unique()->values()->all() !== [$reservation->booking_date->toDateString()]) {
                        throw ValidationException::withMessages(['slots' => ['Additional court times must use the reservation booking date.']]);
                    }
                    $courtIds = collect($slots)->pluck('court_id')->unique()->sort()->values();
                    $courts = Court::query()->active()->whereIn('id', $courtIds)->orderBy('id')->lockForUpdate()->get()->keyBy('id');
                    $pricedSlots = $this->validateAndPriceSlots($slots, $configuration, $courts);
                    $this->assertNoClosureOrLock($pricedSlots, $reservation->id);
                    $addOnAmount += (float) collect($pricedSlots)->sum('unit_amount');
                    foreach ($pricedSlots as $slotData) {
                        $slot = $reservation->slots()->create([...$slotData, 'kind' => 'ADD_ON', 'is_current' => true, 'added_by_user_id' => $user->id]);
                        ReservationSlotLock::query()->create(['reservation_slot_id' => $slot->id, 'court_id' => $slot->court_id, 'date' => $slot->date->toDateString(), 'start_hour' => $slot->start_hour]);
                        $reservation->adjustments()->create(['type' => 'COURT_ADD_ON', 'description' => "Additional Court {$courts[$slot->court_id]->court_number} time", 'quantity' => 1, 'unit_amount' => $slot->unit_amount, 'total_amount' => $slot->unit_amount, 'metadata' => ['slot_id' => $slot->id], 'created_by_user_id' => $user->id]);
                    }
                }

                $additionalPlayers = (int) ($input['additional_players'] ?? 0);
                if ($additionalPlayers > 0) {
                    $total = round($additionalPlayers * (float) $configuration->additional_player_price, 2);
                    $addOnAmount += $total;
                    $reservation->adjustments()->create(['type' => 'ADDITIONAL_PLAYER', 'description' => 'Additional player', 'quantity' => $additionalPlayers, 'unit_amount' => $configuration->additional_player_price, 'total_amount' => $total, 'created_by_user_id' => $user->id]);
                }

                $equipment = $this->validateEquipment($input['equipment'] ?? [], true, $reservation);
                foreach ($equipment as $item) {
                    $equipmentItem = $reservation->equipmentItems()->create([...$item, 'kind' => 'ADD_ON', 'is_active' => true, 'added_by_user_id' => $user->id]);
                    $total = round($item['quantity'] * $item['unit_amount'], 2);
                    $addOnAmount += $total;
                    $reservation->adjustments()->create(['type' => 'EQUIPMENT', 'description' => $item['name'], 'quantity' => $item['quantity'], 'unit_amount' => $item['unit_amount'], 'total_amount' => $total, 'metadata' => ['equipment_item_id' => $equipmentItem->id], 'created_by_user_id' => $user->id]);
                }

                $this->recalculate($reservation);
                $amountDue = max(0, round((float) $reservation->final_amount - (float) $reservation->amount_paid, 2));
                if ($amountDue > 0) {
                    $proofPath = $proof ? $this->proofStorage->store($proof) : null;
                    $reservation->payments()->create([
                        'payment_method_id' => $paymentMethod?->id,
                        'payment_method_name' => $paymentMethod?->name ?? 'Cash',
                        'channel' => $channel, 'kind' => 'ADD_ON', 'status' => 'VERIFIED', 'amount' => $amountDue,
                        'reference_number' => $input['payment_reference_number'] ?? null, 'proof_path' => $proofPath,
                        'recorded_by_user_id' => $user->id, 'verified_by_user_id' => $user->id, 'verified_at' => now(),
                    ]);
                    $reservation->update(['amount_paid' => round((float) $reservation->amount_paid + $amountDue, 2)]);
                    $this->recalculate($reservation);
                }
                $this->audit($user, AuditLog::RESERVATION_ADD_ON_ADDED, $reservation, ['add_on_amount' => round($addOnAmount, 2), 'payment_amount' => $amountDue, 'adjustment_amount' => $reservation->adjustment_amount, 'final_amount' => $reservation->final_amount]);

                return $reservation->fresh(self::DETAIL_RELATIONS);
            });
        } catch (Throwable $exception) {
            if ($proofPath) {
                $this->proofStorage->delete($proofPath);
            }
            throw $exception;
        }
    }

    public function complete(Reservation $reservation, User $user, ?string $channel, ?string $reference, ?UploadedFile $proof): Reservation
    {
        $proofPath = null;
        try {
            return DB::transaction(function () use ($reservation, $user, $channel, $reference, $proof, &$proofPath): Reservation {
                $reservation = $this->lockReservation($reservation);
                $this->requireStatus($reservation, Reservation::STATUS_ONGOING, 'Only ongoing reservations can be completed.');
                $this->recalculate($reservation);
                $outstanding = max(0, round((float) $reservation->final_amount - (float) $reservation->amount_paid, 2));
                if ($outstanding > 0 && ! $channel) {
                    throw ValidationException::withMessages(['payment_channel' => ['Choose how the outstanding amount was collected.']]);
                }
                if ($outstanding > 0) {
                    $proofPath = $proof ? $this->proofStorage->store($proof) : null;
                    $reservation->payments()->create(['payment_method_name' => $channel, 'channel' => $channel, 'kind' => 'SETTLEMENT', 'status' => 'VERIFIED', 'amount' => $outstanding, 'reference_number' => $reference, 'proof_path' => $proofPath, 'recorded_by_user_id' => $user->id, 'verified_by_user_id' => $user->id, 'verified_at' => now()]);
                    $reservation->update(['amount_paid' => round((float) $reservation->amount_paid + $outstanding, 2)]);
                }
                $this->recalculate($reservation);
                if ((float) $reservation->refundable_credit > 0) {
                    $reservation->refunds()->create(['type' => 'RESCHEDULE_CREDIT', 'status' => 'DUE', 'amount' => $reservation->refundable_credit, 'reason' => 'Refundable credit remaining at completion.', 'created_by_user_id' => $user->id]);
                }
                $this->releaseLocks($reservation);
                $reservation->update(['status' => Reservation::STATUS_COMPLETED, 'completed_by_user_id' => $user->id, 'completed_at' => now()]);
                $this->recordTransition($reservation, Reservation::STATUS_ONGOING, Reservation::STATUS_COMPLETED, $user);
                $this->audit($user, AuditLog::RESERVATION_COMPLETED, $reservation, ['status' => Reservation::STATUS_COMPLETED, 'final_amount' => $reservation->final_amount, 'amount_paid' => $reservation->amount_paid]);

                return $reservation->fresh(self::DETAIL_RELATIONS);
            });
        } catch (Throwable $exception) {
            if ($proofPath) {
                $this->proofStorage->delete($proofPath);
            }
            throw $exception;
        }
    }

    public function noShow(Reservation $reservation, User $user): Reservation
    {
        return DB::transaction(function () use ($reservation, $user): Reservation {
            $reservation = $this->lockReservation($reservation);
            $this->requireStatus($reservation, Reservation::STATUS_VERIFIED, 'Only verified reservations can be marked as no-show.');
            $this->releaseLocks($reservation);
            $reservation->update(['status' => Reservation::STATUS_NO_SHOW, 'no_show_by_user_id' => $user->id, 'no_show_at' => now()]);
            $this->recordTransition($reservation, Reservation::STATUS_VERIFIED, Reservation::STATUS_NO_SHOW, $user);
            $this->audit($user, AuditLog::RESERVATION_NO_SHOW, $reservation, ['status' => Reservation::STATUS_NO_SHOW, 'recognized_revenue' => $reservation->amount_paid]);

            return $reservation->fresh(self::DETAIL_RELATIONS);
        });
    }

    public function cancel(Reservation $reservation, User $user, string $reason, string $refundType, ?float $customAmount): Reservation
    {
        $this->requireManager($user);

        return DB::transaction(function () use ($reservation, $user, $reason, $refundType, $customAmount): Reservation {
            $reservation = $this->lockReservation($reservation);
            $this->requireStatus($reservation, Reservation::STATUS_VERIFIED, 'Only verified reservations can be cancelled.');
            $refundAmount = $refundType === 'FULL' ? (float) $reservation->amount_paid : round((float) $customAmount, 2);
            if ($refundAmount > (float) $reservation->amount_paid) {
                throw ValidationException::withMessages(['refund_amount' => ['The refund cannot exceed the amount collected.']]);
            }
            $this->releaseLocks($reservation);
            $reservation->update(['status' => Reservation::STATUS_CANCELLED, 'cancellation_reason' => $reason, 'cancelled_by_user_id' => $user->id, 'cancelled_at' => now(), 'refundable_credit' => $refundAmount]);
            if ($refundAmount > 0) {
                $reservation->refunds()->create(['type' => 'CANCELLATION', 'status' => 'DUE', 'amount' => $refundAmount, 'reason' => $reason, 'created_by_user_id' => $user->id]);
            }
            $this->recordTransition($reservation, Reservation::STATUS_VERIFIED, Reservation::STATUS_CANCELLED, $user, $reason);
            $this->audit($user, AuditLog::RESERVATION_CANCELLED, $reservation, ['status' => Reservation::STATUS_CANCELLED, 'refund_amount' => $refundAmount]);

            return $reservation->fresh(self::DETAIL_RELATIONS);
        });
    }

    /** @param list<array<string, mixed>> $slots @param EloquentCollection<int, Court> $courts @return list<array<string, mixed>> */
    private function validateAndPriceSlots(array $slots, CourtConfiguration $configuration, EloquentCollection $courts): array
    {
        $priced = [];
        foreach ($slots as $index => $slot) {
            $hour = (int) $slot['start_hour'];
            if (! $courts->has((int) $slot['court_id']) || $hour < $configuration->opening_hour || $hour >= $configuration->closing_hour) {
                throw ValidationException::withMessages(["slots.{$index}.start_hour" => ['Choose an active court time within operating hours.']]);
            }
            $date = CarbonImmutable::createFromFormat('Y-m-d', $slot['date']);
            $now = CarbonImmutable::now('Asia/Manila');
            $slotHasEnded = $date->toDateString() < $now->toDateString()
                || ($date->toDateString() === $now->toDateString() && (($hour + 1) * 60) < (($now->hour * 60) + $now->minute));
            if ($slotHasEnded) {
                throw ValidationException::withMessages(["slots.{$index}.start_hour" => ['Choose a court time that has not ended.']]);
            }
            $dayType = $date->isWeekend() ? 'weekend' : 'weekday';
            $rate = $configuration->ratePeriods->first(fn ($period): bool => $period->day_type === $dayType && $period->start_hour <= $hour && $period->end_hour > $hour);
            if (! $rate) {
                throw ValidationException::withMessages(["slots.{$index}.start_hour" => ['No rate is configured for this court time.']]);
            }
            $priced[] = ['court_id' => (int) $slot['court_id'], 'date' => $slot['date'], 'start_hour' => $hour, 'end_hour' => $hour + 1, 'unit_amount' => $rate->price];
        }

        return $priced;
    }

    /** @param list<array<string, mixed>> $slots */
    private function assertNoClosureOrLock(array $slots, ?int $ignoreReservationId = null): void
    {
        foreach ($slots as $slot) {
            $closures = AvailabilityClosure::query()->active()->whereDate('date', $slot['date'])
                ->where(function ($query) use ($slot): void {
                    $query->where('type', AvailabilityClosure::TYPE_ENTIRE_OPERATION)
                        ->orWhere(function ($query) use ($slot): void {
                            $query->where('type', AvailabilityClosure::TYPE_COURT_TIME)->where('court_id', $slot['court_id'])
                                ->whereHas('periods', fn ($periods) => $periods->where('start_hour', '<=', $slot['start_hour'])->where('end_hour', '>', $slot['start_hour']));
                        });
                })->exists();
            if ($closures) {
                throw new ReservationConflictException('One or more selected court times are closed. Choose another time.');
            }

            $lock = ReservationSlotLock::query()->where('court_id', $slot['court_id'])->whereDate('date', $slot['date'])->where('start_hour', $slot['start_hour'])
                ->when($ignoreReservationId, fn ($query) => $query->whereHas('reservationSlot', fn ($slotQuery) => $slotQuery->where('reservation_id', '!=', $ignoreReservationId)))
                ->exists();
            if ($lock) {
                throw new ReservationConflictException('One or more selected court times were just reserved. Choose another time.');
            }
        }
    }

    /** @param list<array{id: int, quantity: int}> $requested @return SupportCollection<int, array<string, mixed>> */
    private function validateEquipment(array $requested, bool $checkAvailability, ?Reservation $reservation = null): SupportCollection
    {
        if ($requested === []) {
            return new SupportCollection;
        }
        $ids = collect($requested)->pluck('id')->unique()->sort()->values();
        $items = RentalEquipment::query()->active()->whereIn('id', $ids)->orderBy('id')->lockForUpdate()->get()->keyBy('id');
        if ($items->count() !== $ids->count()) {
            throw ValidationException::withMessages(['equipment' => ['One or more equipment items are unavailable.']]);
        }
        $result = collect($requested)->map(function (array $requestedItem) use ($items): array {
            $item = $items[(int) $requestedItem['id']];
            if ((int) $requestedItem['quantity'] > $item->total_quantity) {
                throw ValidationException::withMessages(['equipment' => ["Only {$item->total_quantity} {$item->name} are available."]]);
            }

            return ['rental_equipment_id' => $item->id, 'name' => $item->name, 'quantity' => (int) $requestedItem['quantity'], 'unit_amount' => $item->price];
        });
        if ($checkAvailability && $reservation) {
            $existing = $reservation->equipmentItems()->where('is_active', true)->get()
                ->groupBy('rental_equipment_id')
                ->map(fn ($group, $equipmentId): array => [
                    'rental_equipment_id' => (int) $equipmentId,
                    'name' => $group->first()->name,
                    'quantity' => (int) $group->sum('quantity'),
                    'unit_amount' => $group->first()->unit_amount,
                ]);
            $combined = $existing->concat($result)->groupBy('rental_equipment_id')->map(fn ($group): array => [
                'rental_equipment_id' => $group->first()['rental_equipment_id'],
                'name' => $group->first()['name'],
                'quantity' => (int) $group->sum('quantity'),
                'unit_amount' => $group->first()['unit_amount'],
            ])->values();
            $this->assertEquipmentSelectionAvailable($reservation, $combined, $items);
        }

        return $result;
    }

    private function assertEquipmentAvailable(Reservation $reservation): void
    {
        $selection = $reservation->equipmentItems()->where('is_active', true)->get()->map(fn (ReservationEquipmentItem $item): array => ['rental_equipment_id' => $item->rental_equipment_id, 'name' => $item->name, 'quantity' => $item->quantity, 'unit_amount' => $item->unit_amount]);
        if ($selection->isEmpty()) {
            return;
        }
        $ids = $selection->pluck('rental_equipment_id')->filter()->unique()->sort()->values();
        $items = RentalEquipment::query()->whereIn('id', $ids)->orderBy('id')->lockForUpdate()->get()->keyBy('id');
        $this->assertEquipmentSelectionAvailable($reservation, $selection, $items);
    }

    private function assertEquipmentSelectionAvailable(Reservation $reservation, SupportCollection $selection, EloquentCollection $items): void
    {
        $hours = $reservation->currentSlots()->get(['date', 'start_hour'])->unique(fn ($slot): string => $slot->date->toDateString().'-'.$slot->start_hour);
        foreach ($selection as $selected) {
            $item = $items->get($selected['rental_equipment_id']);
            if (! $item) {
                throw ValidationException::withMessages(['equipment' => ["{$selected['name']} is no longer offered."]]);
            }
            foreach ($hours as $hour) {
                $used = ReservationEquipmentItem::query()->where('rental_equipment_id', $item->id)->where('is_active', true)
                    ->where('reservation_id', '!=', $reservation->id)
                    ->whereHas('reservation', fn ($query) => $query->whereIn('status', [Reservation::STATUS_VERIFIED, Reservation::STATUS_ONGOING])
                        ->whereHas('currentSlots', fn ($slots) => $slots->whereDate('date', $hour->date)->where('start_hour', $hour->start_hour)))
                    ->sum('quantity');
                if ($used + $selected['quantity'] > $item->total_quantity) {
                    throw new ReservationConflictException("There is not enough {$item->name} stock for the selected reservation time.");
                }
            }
        }
    }

    private function recalculate(Reservation $reservation): void
    {
        $adjustments = round((float) $reservation->adjustments()->sum('total_amount'), 2);
        $final = max(0, round((float) $reservation->original_amount + $adjustments, 2));
        $reservation->update(['adjustment_amount' => $adjustments, 'final_amount' => $final, 'refundable_credit' => max(0, round((float) $reservation->amount_paid - $final, 2))]);
        $reservation->refresh();
    }

    private function releaseLocks(Reservation $reservation): void
    {
        ReservationSlotLock::query()->whereIn('reservation_slot_id', $reservation->currentSlots()->select('id'))->delete();
    }

    private function lockReservation(Reservation $reservation): Reservation
    {
        return Reservation::query()->lockForUpdate()->findOrFail($reservation->id);
    }

    private function requireStatus(Reservation $reservation, string $status, string $message): void
    {
        if ($reservation->status !== $status) {
            throw new ReservationConflictException($message);
        }
    }

    private function requireManager(User $user): void
    {
        if (! $user->role?->is_full_access) {
            throw new AuthorizationException;
        }
    }

    private function recordTransition(Reservation $reservation, string $from, string $to, User $user, ?string $reason = null): void
    {
        $reservation->statusHistories()->create(['from_status' => $from, 'to_status' => $to, 'reason' => $reason, 'changed_by_user_id' => $user->id]);
    }

    private function audit(?User $user, string $action, Reservation $reservation, array $after): void
    {
        AuditLog::query()->create(['actor_id' => $user?->id, 'action' => $action, 'target_type' => Reservation::class, 'target_id' => (string) $reservation->id, 'after' => $after]);
    }

    private function policySnapshot(): array
    {
        return PolicySection::query()->inDisplayOrder()->with('subheaders.rules')->get()->map(fn (PolicySection $section): array => [
            'slug' => $section->slug, 'name' => $section->name,
            'subheaders' => $section->subheaders->map(fn ($subheader): array => ['title' => $subheader->title, 'rules' => $subheader->rules->pluck('content')->all()])->all(),
        ])->all();
    }

    private function slotSnapshot(EloquentCollection $slots): array
    {
        return $slots->map(fn ($slot): array => ['court_id' => $slot->court_id, 'court_name' => $slot->court ? "Court {$slot->court->court_number}" : null, 'date' => $slot->date->toDateString(), 'start_hour' => $slot->start_hour, 'end_hour' => $slot->end_hour, 'amount' => (float) $slot->unit_amount])->all();
    }

    private function slotArray(array $slot): array
    {
        return ['court_id' => $slot['court_id'], 'date' => $slot['date'], 'start_hour' => $slot['start_hour'], 'end_hour' => $slot['end_hour'], 'amount' => (float) $slot['unit_amount']];
    }
}

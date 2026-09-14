<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\AvailabilityClosure;
use App\Models\AvailabilityClosurePeriod;
use App\Models\Court;
use App\Models\CourtConfiguration;
use App\Models\ReservationSlotLock;
use App\Models\User;
use App\Support\BusinessClock;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AvailabilityClosureService
{
    public function closeEntireOperation(User $user, string $date, string $reason): AvailabilityClosure
    {
        return DB::transaction(function () use ($user, $date, $reason): AvailabilityClosure {
            $courts = Court::query()->active()->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            $activeReservation = ReservationSlotLock::query()
                ->whereDate('date', $date)
                ->orderBy('court_id')
                ->orderBy('start_hour')
                ->first();
            if ($activeReservation) {
                $courtNumber = $courts->get($activeReservation->court_id)?->court_number ?? $activeReservation->court_id;
                throw ValidationException::withMessages(['date' => [sprintf(
                    'Cannot close %s because Court %s has an active reservation at %s. Handle that reservation before closing the operation.',
                    $this->formatDate($date),
                    $courtNumber,
                    $this->formatPeriod($activeReservation->start_hour, $activeReservation->start_hour + 1),
                )]]);
            }
            $existing = AvailabilityClosure::query()
                ->whereDate('date', $date)
                ->lockForUpdate()
                ->get();

            if ($existing->contains(fn (AvailabilityClosure $closure): bool => $closure->is_active && $closure->type === AvailabilityClosure::TYPE_ENTIRE_OPERATION)) {
                throw ValidationException::withMessages(['date' => [sprintf(
                    'The entire operation is already closed for %s. Choose a different date or reopen the existing closure first.',
                    $this->formatDate($date),
                )]]);
            }

            $closure = AvailabilityClosure::query()->create([
                'type' => AvailabilityClosure::TYPE_ENTIRE_OPERATION,
                'date' => $date,
                'reason' => $reason,
                'is_active' => true,
                'created_by_user_id' => $user->id,
            ]);

            $this->recordAudit($user, AuditLog::DATE_CLOSED, $closure);

            return $closure->load(['court', 'periods']);
        });
    }

    /** @param list<array{start_hour: int, end_hour: int}> $periods */
    public function blockCourtTimes(User $user, int $courtId, string $date, array $periods, string $reason): AvailabilityClosure
    {
        return DB::transaction(function () use ($user, $courtId, $date, $periods, $reason): AvailabilityClosure {
            $court = Court::query()->active()->lockForUpdate()->find($courtId);
            if (! $court) {
                throw ValidationException::withMessages(['court_id' => ['Choose an active court.']]);
            }

            $configuration = CourtConfiguration::query()->lockForUpdate()->find(1);
            if (! $configuration) {
                throw ValidationException::withMessages(['periods' => ['Configure court operating hours before blocking time ranges.']]);
            }

            foreach ($periods as $index => $period) {
                if ($period['start_hour'] < $configuration->opening_hour || $period['end_hour'] > $configuration->closing_hour) {
                    throw ValidationException::withMessages([
                        "periods.{$index}.start_hour" => ['Choose a time within the configured operating hours.'],
                    ]);
                }

                $activeReservation = ReservationSlotLock::query()
                    ->where('court_id', $court->id)
                    ->whereDate('date', $date)
                    ->where('start_hour', '>=', $period['start_hour'])
                    ->where('start_hour', '<', $period['end_hour'])
                    ->orderBy('start_hour')
                    ->first();
                if ($activeReservation) {
                    throw ValidationException::withMessages(["periods.{$index}.start_hour" => [sprintf(
                        'Cannot close Court %s on %s at %s because an active reservation uses that court time. Handle the reservation before blocking it.',
                        $court->court_number,
                        $this->formatDate($date),
                        $this->formatPeriod($activeReservation->start_hour, $activeReservation->start_hour + 1),
                    )]]);
                }
            }

            $closuresForDate = AvailabilityClosure::query()
                ->whereDate('date', $date)
                ->with('periods')
                ->lockForUpdate()
                ->get();

            if ($closuresForDate->contains(fn (AvailabilityClosure $closure): bool => $closure->is_active && $closure->type === AvailabilityClosure::TYPE_ENTIRE_OPERATION)) {
                throw ValidationException::withMessages(['date' => [sprintf(
                    'The entire operation is already closed for %s, so Court %s time ranges cannot be added. Reopen the date closure first.',
                    $this->formatDate($date),
                    $court->court_number,
                )]]);
            }

            $existingPeriods = $closuresForDate
                ->filter(fn (AvailabilityClosure $closure): bool => $closure->is_active
                    && $closure->type === AvailabilityClosure::TYPE_COURT_TIME
                    && $closure->court_id === $court->id)
                ->flatMap(fn (AvailabilityClosure $closure) => $closure->periods);

            foreach ($periods as $index => $period) {
                if ($existingPeriods->contains(fn (AvailabilityClosurePeriod $existing): bool => $this->periodsOverlap(
                    $period['start_hour'],
                    $period['end_hour'],
                    $existing->start_hour,
                    $existing->end_hour,
                ))) {
                    throw ValidationException::withMessages([
                        "periods.{$index}.start_hour" => [sprintf(
                            'Cannot close Court %s on %s for %s because it overlaps an existing active closure. Choose a time outside that closure or reopen it first.',
                            $court->court_number,
                            $this->formatDate($date),
                            $this->formatPeriod($period['start_hour'], $period['end_hour']),
                        )],
                    ]);
                }
            }

            $closure = AvailabilityClosure::query()->create([
                'type' => AvailabilityClosure::TYPE_COURT_TIME,
                'date' => $date,
                'court_id' => $court->id,
                'reason' => $reason,
                'is_active' => true,
                'created_by_user_id' => $user->id,
            ]);

            $closure->periods()->createMany($periods);
            $closure->load(['court', 'periods']);
            $this->recordAudit($user, AuditLog::COURT_SLOT_BLOCKED, $closure);

            return $closure;
        });
    }

    public function reopen(User $user, AvailabilityClosure $closure, string $reason): AvailabilityClosure
    {
        return DB::transaction(function () use ($user, $closure, $reason): AvailabilityClosure {
            $closure = AvailabilityClosure::query()
                ->with(['court', 'periods'])
                ->lockForUpdate()
                ->findOrFail($closure->id);

            if (! $closure->is_active) {
                throw ValidationException::withMessages(['closure' => ['This closure has already been reopened.']]);
            }

            $closure->update([
                'is_active' => false,
                'reopened_by_user_id' => $user->id,
                'reopened_at' => now(),
            ]);

            $this->recordAudit(
                $user,
                $closure->type === AvailabilityClosure::TYPE_ENTIRE_OPERATION ? AuditLog::DATE_REOPENED : AuditLog::COURT_SLOT_REOPENED,
                $closure,
                ['is_active' => true],
                ['is_active' => false, 'reason' => $reason],
            );

            return $closure->fresh(['court', 'periods']);
        });
    }

    private function periodsOverlap(int $firstStart, int $firstEnd, int $secondStart, int $secondEnd): bool
    {
        return $firstStart < $secondEnd && $firstEnd > $secondStart;
    }

    private function formatDate(string $date): string
    {
        return CarbonImmutable::createFromFormat('Y-m-d', $date, BusinessClock::timezone())->format('M j, Y');
    }

    private function formatPeriod(int $startHour, int $endHour): string
    {
        return $this->formatHour($startHour).'–'.$this->formatHour($endHour);
    }

    private function formatHour(int $hour): string
    {
        $normalized = $hour % 24;
        $displayHour = $normalized % 12 ?: 12;
        $period = $normalized < 12 ? 'AM' : 'PM';

        return "{$displayHour}:00 {$period}";
    }

    /** @param array<string, mixed>|null $oldValues @param array<string, mixed>|null $newValues */
    private function recordAudit(User $user, string $action, AvailabilityClosure $closure, ?array $oldValues = null, ?array $newValues = null): void
    {
        $snapshot = [
            'closure_type' => $closure->type,
            'date' => $closure->date->toDateString(),
            'court_id' => $closure->court_id,
            'court_name' => $closure->court ? "Court {$closure->court->court_number}" : null,
            'periods' => $closure->periods->map(fn (AvailabilityClosurePeriod $period): array => [
                'start_hour' => $period->start_hour,
                'end_hour' => $period->end_hour,
            ])->values()->all(),
            'reason' => $closure->reason,
        ];

        app(SecurityAuditService::class)->recordFromContext(
            $action,
            $user,
            $closure,
            [
                ...$snapshot,
                ...($newValues ?? ['is_active' => $closure->is_active]),
            ],
            'MANAGEMENT_AVAILABILITY_CLOSURES',
            $closure->type === AvailabilityClosure::TYPE_ENTIRE_OPERATION
                ? "Entire operation on {$snapshot['date']}"
                : "{$snapshot['court_name']} on {$snapshot['date']}",
        );
    }
}

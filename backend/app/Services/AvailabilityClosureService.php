<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\AvailabilityClosure;
use App\Models\AvailabilityClosurePeriod;
use App\Models\Court;
use App\Models\CourtConfiguration;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AvailabilityClosureService
{
    public function closeEntireOperation(User $user, string $date, string $reason): AvailabilityClosure
    {
        return DB::transaction(function () use ($user, $date, $reason): AvailabilityClosure {
            $existing = AvailabilityClosure::query()
                ->whereDate('date', $date)
                ->lockForUpdate()
                ->get();

            if ($existing->contains(fn (AvailabilityClosure $closure): bool => $closure->is_active && $closure->type === AvailabilityClosure::TYPE_ENTIRE_OPERATION)) {
                throw ValidationException::withMessages(['date' => ['The entire operation is already closed for this date.']]);
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
            }

            $closuresForDate = AvailabilityClosure::query()
                ->whereDate('date', $date)
                ->with('periods')
                ->lockForUpdate()
                ->get();

            if ($closuresForDate->contains(fn (AvailabilityClosure $closure): bool => $closure->is_active && $closure->type === AvailabilityClosure::TYPE_ENTIRE_OPERATION)) {
                throw ValidationException::withMessages(['date' => ['The entire operation is already closed for this date.']]);
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
                        "periods.{$index}.start_hour" => ['This time range overlaps an existing active closure for the selected court.'],
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

    public function reopen(User $user, AvailabilityClosure $closure): AvailabilityClosure
    {
        return DB::transaction(function () use ($user, $closure): AvailabilityClosure {
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
                ['is_active' => false],
            );

            return $closure->fresh(['court', 'periods']);
        });
    }

    private function periodsOverlap(int $firstStart, int $firstEnd, int $secondStart, int $secondEnd): bool
    {
        return $firstStart < $secondEnd && $firstEnd > $secondStart;
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

        AuditLog::query()->create([
            'actor_id' => $user->id,
            'action' => $action,
            'target_type' => AvailabilityClosure::class,
            'target_id' => (string) $closure->id,
            'before' => $oldValues,
            'after' => [
                ...$snapshot,
                ...($newValues ?? [
                    'is_active' => $closure->is_active,
                ]),
            ],
        ]);
    }
}

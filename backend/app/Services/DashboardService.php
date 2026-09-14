<?php

namespace App\Services;

use App\Models\Reservation;
use App\Support\BusinessClock;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class DashboardService
{
    public function __construct(private readonly CourtAvailabilityService $availability) {}

    /** @return array<string, mixed> */
    public function overview(string $requestedWeekStart, string $selectedDate): array
    {
        $weekStart = CarbonImmutable::createFromFormat('Y-m-d', $requestedWeekStart)
            ->startOfWeek(CarbonInterface::MONDAY);
        $weekEnd = $weekStart->addDays(6);
        $now = BusinessClock::now();
        $today = $now->toDateString();
        $snapshots = [];
        $days = [];

        foreach (range(0, 6) as $offset) {
            $date = $weekStart->addDays($offset)->toDateString();
            $snapshot = $snapshots[$date] = $this->availability->forDate($date);
            $unavailable = collect($snapshot['unavailable_slots'])
                ->mapWithKeys(fn (array $slot): array => [$this->slotKey($slot['court_id'], $slot['start_hour']) => true]);
            $total = 0;
            $available = 0;

            foreach ($snapshot['courts'] as $court) {
                foreach ($snapshot['slots'] as $slot) {
                    if ($this->isPastSlot($date, $slot['end_hour'], $now)) {
                        continue;
                    }
                    $total++;
                    if (! $unavailable->has($this->slotKey($court->id, $slot['start_hour']))) {
                        $available++;
                    }
                }
            }

            $days[] = [
                'date' => $date,
                'available_slots' => $available,
                'total_slots' => $total,
                'is_closed' => $snapshot['is_date_closed'],
                'is_past' => $date < $today,
            ];
        }

        $selectedSnapshot = $snapshots[$selectedDate] ?? $this->availability->forDate($selectedDate);

        return [
            'week' => [
                'start' => $weekStart->toDateString(),
                'end' => $weekEnd->toDateString(),
            ],
            'kpis' => $this->weeklyKpis($weekStart, $weekEnd),
            'days' => $days,
            'selected_date' => $this->selectedDate($selectedDate, $selectedSnapshot, $now),
        ];
    }

    public function reservationDetail(Reservation $reservation): Reservation
    {
        if (! in_array($reservation->status, [
            ...Reservation::OPERATIONAL_STATUSES,
            ...Reservation::FINAL_STATUSES,
        ], true)) {
            throw (new ModelNotFoundException)->setModel(Reservation::class, [$reservation->id]);
        }

        return $reservation->load([
            'currentSlots.court',
            'payments',
            'equipmentItems',
            'adjustments',
            'scheduleHistories',
            'refunds',
        ]);
    }

    /** @return array{pending: int, verified: int, completed: int, revenue: float} */
    private function weeklyKpis(CarbonImmutable $weekStart, CarbonImmutable $weekEnd): array
    {
        $base = Reservation::query()->whereBetween('booking_date', [
            $weekStart->toDateString(),
            $weekEnd->toDateString(),
        ]);

        $kpis = $base
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as pending', [Reservation::STATUS_PENDING])
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as verified', [Reservation::STATUS_VERIFIED])
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed', [Reservation::STATUS_COMPLETED])
            ->selectRaw('COALESCE(SUM(CASE WHEN status = ? THEN final_amount ELSE 0 END), 0) as revenue', [Reservation::STATUS_COMPLETED])
            ->first();

        return [
            'pending' => (int) ($kpis?->pending ?? 0),
            'verified' => (int) ($kpis?->verified ?? 0),
            'completed' => (int) ($kpis?->completed ?? 0),
            'revenue' => (float) ($kpis?->revenue ?? 0),
        ];
    }

    /** @param array<string, mixed> $snapshot @return array<string, mixed> */
    private function selectedDate(string $date, array $snapshot, CarbonImmutable $now): array
    {
        $unavailable = collect($snapshot['unavailable_slots'])
            ->mapWithKeys(fn (array $slot): array => [$this->slotKey($slot['court_id'], $slot['start_hour']) => true]);
        $closed = collect($snapshot['closed_slots'] ?? [])
            ->mapWithKeys(fn (array $slot): array => [$this->slotKey($slot['court_id'], $slot['start_hour']) => true]);
        $activeReservations = $snapshot['reservations_by_slot'];
        $finalReservations = [];

        Reservation::query()
            ->whereIn('status', Reservation::FINAL_STATUSES)
            ->whereHas('currentSlots', fn ($slots) => $slots->whereDate('date', $date))
            ->with(['currentSlots' => fn ($slots) => $slots->whereDate('date', $date)])
            ->get()
            ->each(function (Reservation $reservation) use (&$finalReservations): void {
                foreach ($reservation->currentSlots as $slot) {
                    $finalReservations[$this->slotKey($slot->court_id, $slot->start_hour)] = $reservation;
                }
            });

        $courts = $snapshot['courts']->map(function ($court) use ($date, $snapshot, $now, $unavailable, $closed, $activeReservations, $finalReservations): array {
            return [
                'id' => $court->id,
                'name' => "Court {$court->court_number}",
                'slots' => collect($snapshot['slots'])->map(function (array $slot) use ($court, $date, $now, $unavailable, $closed, $activeReservations, $finalReservations): array {
                    $key = $this->slotKey($court->id, $slot['start_hour']);
                    $reservation = $activeReservations[$key] ?? $finalReservations[$key] ?? null;
                    $status = match (true) {
                        // Keep the reservation's status for historical slots so staff can open the record.
                        $reservation !== null => $reservation->status,
                        // Keep an explicit closure visible even when the closed slot is in the past.
                        $closed->has($key) => 'CLOSED',
                        $this->isPastSlot($date, $slot['end_hour'], $now) => 'PAST',
                        $unavailable->has($key) => 'CLOSED',
                        default => 'AVAILABLE',
                    };

                    return [
                        'start_hour' => $slot['start_hour'],
                        'end_hour' => $slot['end_hour'],
                        'price' => $slot['price'],
                        'status' => $status,
                        'reservation_id' => $reservation?->id,
                        'reservation_reference' => $reservation?->reference_number,
                    ];
                })->values()->all(),
            ];
        })->values()->all();

        return [
            'date' => $date,
            'is_closed' => $snapshot['is_date_closed'],
            'opening_hour' => $snapshot['configuration']?->opening_hour,
            'closing_hour' => $snapshot['configuration']?->closing_hour,
            'courts' => $courts,
        ];
    }

    private function isPastSlot(string $date, int $endHour, CarbonImmutable $now): bool
    {
        if ($date !== $now->toDateString()) {
            return $date < $now->toDateString();
        }

        return ($endHour * 60) < (($now->hour * 60) + $now->minute);
    }

    private function slotKey(int $courtId, int $startHour): string
    {
        return "{$courtId}-{$startHour}";
    }
}

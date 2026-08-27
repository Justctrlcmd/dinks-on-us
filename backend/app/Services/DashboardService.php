<?php

namespace App\Services;

use App\Models\Reservation;
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
        $now = CarbonImmutable::now('Asia/Manila');
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
            Reservation::STATUS_PENDING,
            Reservation::STATUS_VERIFIED,
            Reservation::STATUS_ONGOING,
            Reservation::STATUS_COMPLETED,
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

        return [
            'pending' => (clone $base)->where('status', Reservation::STATUS_PENDING)->count(),
            'verified' => (clone $base)->where('status', Reservation::STATUS_VERIFIED)->count(),
            'completed' => (clone $base)->where('status', Reservation::STATUS_COMPLETED)->count(),
            'revenue' => (float) (clone $base)->where('status', Reservation::STATUS_COMPLETED)->sum('final_amount'),
        ];
    }

    /** @param array<string, mixed> $snapshot @return array<string, mixed> */
    private function selectedDate(string $date, array $snapshot, CarbonImmutable $now): array
    {
        $unavailable = collect($snapshot['unavailable_slots'])
            ->mapWithKeys(fn (array $slot): array => [$this->slotKey($slot['court_id'], $slot['start_hour']) => true]);
        $activeReservations = $snapshot['reservations_by_slot'];
        $completedReservations = [];

        Reservation::query()
            ->where('status', Reservation::STATUS_COMPLETED)
            ->whereHas('currentSlots', fn ($slots) => $slots->whereDate('date', $date))
            ->with(['currentSlots' => fn ($slots) => $slots->whereDate('date', $date)])
            ->get()
            ->each(function (Reservation $reservation) use (&$completedReservations): void {
                foreach ($reservation->currentSlots as $slot) {
                    $completedReservations[$this->slotKey($slot->court_id, $slot->start_hour)] = $reservation;
                }
            });

        $courts = $snapshot['courts']->map(function ($court) use ($date, $snapshot, $now, $unavailable, $activeReservations, $completedReservations): array {
            return [
                'id' => $court->id,
                'name' => "Court {$court->court_number}",
                'slots' => collect($snapshot['slots'])->map(function (array $slot) use ($court, $date, $now, $unavailable, $activeReservations, $completedReservations): array {
                    $key = $this->slotKey($court->id, $slot['start_hour']);
                    $reservation = $activeReservations[$key] ?? $completedReservations[$key] ?? null;
                    $status = match (true) {
                        $this->isPastSlot($date, $slot['end_hour'], $now) => 'PAST',
                        isset($activeReservations[$key]) => $reservation->status,
                        isset($completedReservations[$key]) => Reservation::STATUS_COMPLETED,
                        $unavailable->has($key) => 'CLOSED',
                        default => 'AVAILABLE',
                    };

                    return [
                        'start_hour' => $slot['start_hour'],
                        'end_hour' => $slot['end_hour'],
                        'price' => $slot['price'],
                        'status' => $status,
                        'reservation_id' => $status === 'PAST' ? null : $reservation?->id,
                        'reservation_reference' => $status === 'PAST' ? null : $reservation?->reference_number,
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

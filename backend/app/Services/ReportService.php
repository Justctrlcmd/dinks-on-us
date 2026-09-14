<?php

namespace App\Services;

use App\Models\AvailabilityClosure;
use App\Models\Court;
use App\Models\CourtConfiguration;
use App\Models\Reservation;
use App\Models\ReservationAdjustment;
use App\Models\ReservationEquipmentItem;
use App\Models\ReservationPayment;
use App\Models\ReservationScheduleHistory;
use App\Models\ReservationSlot;
use App\Support\BusinessClock;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class ReportService
{
    private const DAY_NAMES = [
        1 => 'Monday', 2 => 'Tuesday', 3 => 'Wednesday', 4 => 'Thursday',
        5 => 'Friday', 6 => 'Saturday', 7 => 'Sunday',
    ];

    /** @param array<string, mixed> $input @return array<string, mixed> */
    public function overview(array $input): array
    {
        $filters = $this->filters($input);
        $revenue = $this->revenueData($filters, $this->automaticGrouping($filters));
        $capacity = $this->capacityData($filters);
        $reservations = $this->reservationData($filters, $this->automaticGrouping($filters));

        return [
            'context' => $this->context($filters),
            'has_reportable_data' => $revenue['has_data'] || $capacity['sellable_hours'] > 0 || $reservations['has_data'],
            'kpis' => [
                'recognized_revenue' => $revenue['metrics']['recognized_revenue'],
                'completed_reservations' => $revenue['metrics']['completed_reservations'],
                'court_utilization_percent' => $capacity['utilization_percent'],
                'average_reservation_value' => $revenue['metrics']['average_reservation_value'],
            ],
            'secondary_metrics' => [
                'completed_court_hours' => $capacity['completed_hours'],
                'no_show_rate_percent' => $reservations['rates']['no_show_percent'],
                'cancellation_rate_percent' => $reservations['rates']['cancellation_percent'],
                'walk_in_share_percent' => $reservations['walk_in_share_percent'],
            ],
            'revenue_trend' => $revenue['trend'],
            'court_utilization' => $capacity['courts'],
            'source_breakdown' => $reservations['sources'],
            'popular_times' => $this->popularHours($capacity['heatmap']),
            'outcomes' => $reservations['outcomes'],
            'scope_note' => $revenue['scope_note'],
        ];
    }

    /** @param array<string, mixed> $input @return array<string, mixed> */
    public function revenue(array $input): array
    {
        $filters = $this->filters($input);
        $groupBy = (string) ($input['group_by'] ?? $this->automaticGrouping($filters));
        $data = $this->revenueData($filters, $groupBy);

        return [
            'context' => $this->context($filters),
            'has_reportable_data' => $data['has_data'],
            ...$data,
        ];
    }

    /** @param array<string, mixed> $input @return array<string, mixed> */
    public function reservations(array $input): array
    {
        $filters = $this->filters($input);
        $groupBy = (string) ($input['group_by'] ?? $this->automaticGrouping($filters));
        $data = $this->reservationData($filters, $groupBy);

        return [
            'context' => $this->context($filters),
            'has_reportable_data' => $data['has_data'],
            ...$data,
        ];
    }

    /** @param array<string, mixed> $input @return array<string, mixed> */
    public function courtUtilization(array $input): array
    {
        $filters = $this->filters($input);
        $data = $this->capacityData($filters);

        return [
            'context' => $this->context($filters),
            'has_reportable_data' => $data['sellable_hours'] > 0,
            'summary' => [
                'completed_hours' => $data['completed_hours'],
                'potential_hours' => $data['potential_hours'],
                'closed_hours' => $data['closed_hours'],
                'sellable_hours' => $data['sellable_hours'],
                'utilization_percent' => $data['utilization_percent'],
                'operational_availability_percent' => $data['operational_availability_percent'],
            ],
            'courts' => $data['courts'],
            'day_of_week' => $data['day_of_week'],
            'capacity_note' => $this->capacityNote(),
        ];
    }

    /** @param array<string, mixed> $input @return array<string, mixed> */
    public function popularTimes(array $input): array
    {
        $filters = $this->filters($input);
        $capacity = $this->capacityData($filters);

        return [
            'context' => $this->context($filters),
            'has_reportable_data' => $capacity['completed_hours'] > 0,
            'measure' => 'completed_slot_count',
            'heatmap' => $capacity['heatmap'],
            'popular_hours' => $this->popularHours($capacity['heatmap']),
            'capacity_note' => $this->capacityNote(),
        ];
    }

    /** @param array<string, mixed> $input @return array<string, mixed> */
    public function payments(array $input): array
    {
        $filters = $this->filters($input);
        $bounds = $this->timestampBounds($filters);
        $payments = ReservationPayment::query()
            ->where('status', 'VERIFIED')
            ->whereBetween('verified_at', $bounds)
            ->whereHas('reservation', fn (Builder $query) => $this->applyReservationDimensions($query, $filters))
            ->with('paymentMethod:id,name')
            ->get(['id', 'reservation_id', 'payment_method_id', 'payment_method_name', 'channel', 'amount', 'verified_at']);

        $verificationDurations = collect();
        if ($filters['source'] !== 'WALK_IN') {
            $verificationQuery = Reservation::query()
                ->where('source', 'ONLINE')
                ->whereNotNull('submitted_at')
                ->whereNotNull('verified_at')
                ->whereBetween('verified_at', $bounds);
            $this->applyCourt($verificationQuery, $filters['court_id']);
            $verificationDurations = $verificationQuery
                ->get(['submitted_at', 'verified_at'])
                ->map(fn (Reservation $reservation): float => max(0, $reservation->submitted_at->diffInSeconds($reservation->verified_at, true) / 60))
                ->sort()
                ->values();
        }

        $methods = $payments
            ->groupBy(fn (ReservationPayment $payment): string => $this->paymentMethodGroupKey($payment))
            ->map(function (Collection $items) use ($payments): array {
                $count = $items->count();
                $payment = $items->first();
                $name = $payment?->paymentMethod?->name ?: $payment?->payment_method_name ?: $payment?->channel ?: 'Unknown';

                return [
                    'name' => trim($name),
                    'count' => $count,
                    'amount' => round((float) $items->sum('amount'), 2),
                    'share_percent' => $this->percentage($count, $payments->count()),
                ];
            })
            ->sortByDesc('count')
            ->values()
            ->all();

        return [
            'context' => $this->context($filters),
            'has_reportable_data' => $payments->isNotEmpty() || $verificationDurations->isNotEmpty(),
            'verification' => [
                'sample_size' => $verificationDurations->count(),
                'average_minutes' => $verificationDurations->isEmpty() ? null : round((float) $verificationDurations->average(), 1),
                'median_minutes' => $this->median($verificationDurations),
            ],
            'verified_payments' => [
                'count' => $payments->count(),
                'amount' => round((float) $payments->sum('amount'), 2),
                'methods' => $methods,
            ],
        ];
    }

    /** @param array<string, mixed> $input @return array<string, mixed> */
    public function operations(array $input): array
    {
        $filters = $this->filters($input);
        $bounds = $this->timestampBounds($filters);
        $outcomes = $this->outcomes($filters);
        $capacity = $this->capacityData($filters);

        $rejections = Reservation::query()
            ->where('status', Reservation::STATUS_REJECTED)
            ->whereBetween('rejected_at', $bounds);
        $this->applyReservationDimensions($rejections, $filters);
        $rejectionConcerns = $rejections->get(['rejection_concern'])
            ->groupBy(fn (Reservation $reservation): string => $reservation->rejection_concern ?: 'UNSPECIFIED')
            ->map(fn (Collection $items, string $concern): array => [
                'concern' => $concern,
                'label' => $this->humanize($concern),
                'count' => $items->count(),
            ])->sortByDesc('count')->values()->all();

        $reservationIds = $this->dimensionReservationIds($filters);
        $rescheduleOperations = ReservationScheduleHistory::query()
            ->whereBetween('created_at', $bounds)
            ->whereIn('reservation_id', $reservationIds)
            ->get(['reservation_id']);
        $rescheduledReservations = $rescheduleOperations->pluck('reservation_id')->unique()->count();

        $completed = Reservation::query()
            ->where('status', Reservation::STATUS_COMPLETED)
            ->whereBetween('completed_at', $bounds);
        $this->applyReservationDimensions($completed, $filters);
        $completedCount = $completed->count();
        $extendedCount = (clone $completed)
            ->whereHas('currentSlots', fn (Builder $query) => $query->where('kind', 'ADD_ON'))
            ->count();

        return [
            'context' => $this->context($filters),
            'has_reportable_data' => array_sum($outcomes) > 0 || $rescheduleOperations->isNotEmpty() || $capacity['closed_hours'] > 0,
            'outcomes' => $outcomes,
            'rates' => $this->outcomeRates($outcomes),
            'rejection_concerns' => $rejectionConcerns,
            'rescheduling' => [
                'reservations_affected' => $rescheduledReservations,
                'operations' => $rescheduleOperations->count(),
            ],
            'extensions' => [
                'completed_reservations' => $completedCount,
                'reservations_with_extension' => $extendedCount,
                'rate_percent' => $this->percentage($extendedCount, $completedCount),
            ],
            'closures' => [
                'potential_hours' => $capacity['potential_hours'],
                'closed_hours' => $capacity['closed_hours'],
                'sellable_hours' => $capacity['sellable_hours'],
                'operational_availability_percent' => $capacity['operational_availability_percent'],
            ],
            'capacity_note' => $this->capacityNote(),
        ];
    }

    /** @param array<string, mixed> $filters @return array<string, mixed> */
    private function revenueData(array $filters, string $groupBy): array
    {
        $bounds = $this->timestampBounds($filters);
        $completedQuery = Reservation::query()
            ->where('status', Reservation::STATUS_COMPLETED)
            ->whereBetween('completed_at', $bounds);
        $this->applyReservationDimensions($completedQuery, $filters);

        if ($filters['court_id']) {
            $completed = $completedQuery->with(['currentSlots' => fn ($query) => $query->where('court_id', $filters['court_id'])])
                ->get(['id', 'completed_at']);
            $completedEvents = $completed->map(fn (Reservation $reservation): array => [
                'date' => $reservation->completed_at,
                'amount' => round((float) $reservation->currentSlots->sum('unit_amount'), 2),
            ]);
            $noShowEvents = collect();
        } else {
            $completed = $completedQuery->get(['id', 'completed_at', 'final_amount', 'original_additional_players', 'additional_player_unit_amount']);
            $completedEvents = $completed->map(fn (Reservation $reservation): array => [
                'date' => $reservation->completed_at,
                'amount' => (float) $reservation->final_amount,
            ]);
            $noShowQuery = Reservation::query()
                ->where('status', Reservation::STATUS_NO_SHOW)
                ->whereBetween('no_show_at', $bounds);
            $this->applySource($noShowQuery, $filters['source']);
            $noShowEvents = $noShowQuery->get(['no_show_at', 'amount_paid'])->map(fn (Reservation $reservation): array => [
                'date' => $reservation->no_show_at,
                'amount' => (float) $reservation->amount_paid,
            ]);
        }

        $completedRevenue = round((float) $completedEvents->sum('amount'), 2);
        $noShowRevenue = round((float) $noShowEvents->sum('amount'), 2);
        $completedCount = $completed->count();
        $composition = $this->revenueComposition($completed, $completedRevenue, $filters);

        return [
            'has_data' => $completedEvents->isNotEmpty() || $noShowEvents->isNotEmpty(),
            'metrics' => [
                'recognized_revenue' => round($completedRevenue + $noShowRevenue, 2),
                'completed_reservation_revenue' => $completedRevenue,
                'no_show_recognized_revenue' => $noShowRevenue,
                'completed_reservations' => $completedCount,
                'average_reservation_value' => $completedCount === 0 ? null : round($completedRevenue / $completedCount, 2),
            ],
            'trend' => [
                'group_by' => $groupBy,
                'points' => $this->revenueTrend($filters, $groupBy, $completedEvents, $noShowEvents),
            ],
            'composition' => $composition,
            'scope_note' => $filters['court_id']
                ? 'Court-filtered revenue includes completed slot-derived revenue for the selected court. Reservation-wide add-ons and no-show retained amounts are not allocated to a court.'
                : 'Recognized revenue uses completed final amounts plus the amount already collected for no-shows.',
        ];
    }

    /** @param Collection<int, Reservation> $completed @param array<string, mixed> $filters @return array<string, float> */
    private function revenueComposition(Collection $completed, float $completedRevenue, array $filters): array
    {
        $ids = $completed->pluck('id');
        if ($ids->isEmpty()) {
            return [
                'original_slot_revenue' => 0.0, 'extension_slot_revenue' => 0.0,
                'additional_player_revenue' => 0.0, 'rental_equipment_revenue' => 0.0,
                'other_adjustment_revenue' => 0.0,
            ];
        }

        if ($filters['court_id']) {
            $slots = ReservationSlot::query()
                ->whereIn('reservation_id', $ids)
                ->where('court_id', $filters['court_id'])
                ->where('is_current', true)
                ->get(['kind', 'unit_amount']);
            $extensions = round((float) $slots->where('kind', 'ADD_ON')->sum('unit_amount'), 2);

            return [
                'original_slot_revenue' => round($completedRevenue - $extensions, 2),
                'extension_slot_revenue' => $extensions,
                'additional_player_revenue' => 0.0,
                'rental_equipment_revenue' => 0.0,
                'other_adjustment_revenue' => 0.0,
            ];
        }

        $originalSlots = (float) ReservationSlot::query()
            ->whereIn('reservation_id', $ids)
            ->where('kind', 'ORIGINAL')
            ->sum('unit_amount');
        $originalPlayers = (float) $completed->sum(fn (Reservation $reservation): float => $reservation->original_additional_players * (float) $reservation->additional_player_unit_amount);
        $originalEquipment = (float) ReservationEquipmentItem::query()
            ->whereIn('reservation_id', $ids)
            ->where('kind', 'ORIGINAL')
            ->get(['quantity', 'unit_amount'])
            ->sum(fn (ReservationEquipmentItem $item): float => $item->quantity * (float) $item->unit_amount);
        $adjustments = ReservationAdjustment::query()->whereIn('reservation_id', $ids)->get(['type', 'total_amount']);
        $extensions = (float) $adjustments->where('type', 'COURT_ADD_ON')->sum('total_amount');
        $players = $originalPlayers + (float) $adjustments->where('type', 'ADDITIONAL_PLAYER')->sum('total_amount');
        $equipment = $originalEquipment + (float) $adjustments->where('type', 'EQUIPMENT')->sum('total_amount');
        $known = $originalSlots + $extensions + $players + $equipment;

        return [
            'original_slot_revenue' => round($originalSlots, 2),
            'extension_slot_revenue' => round($extensions, 2),
            'additional_player_revenue' => round($players, 2),
            'rental_equipment_revenue' => round($equipment, 2),
            'other_adjustment_revenue' => round($completedRevenue - $known, 2),
        ];
    }

    /** @param array<string, mixed> $filters @return array<string, mixed> */
    private function reservationData(array $filters, string $groupBy): array
    {
        $query = Reservation::query()->whereBetween('submitted_at', $this->timestampBounds($filters));
        $this->applyReservationDimensions($query, $filters);
        $submitted = $query->get(['id', 'source', 'submitted_at']);
        $outcomes = $this->outcomes($filters);
        $total = $submitted->count();
        $sources = collect(['ONLINE', 'WALK_IN'])->map(function (string $source) use ($submitted, $total): array {
            $count = $submitted->where('source', $source)->count();

            return ['source' => $source, 'label' => $source === 'WALK_IN' ? 'Walk-In' : 'Online', 'count' => $count, 'share_percent' => $this->percentage($count, $total)];
        })->all();

        $buckets = $this->emptyBuckets($filters, $groupBy);
        foreach ($submitted as $reservation) {
            $key = $this->bucketKey($reservation->submitted_at, $groupBy);
            $buckets[$key] = ($buckets[$key] ?? 0) + 1;
        }

        return [
            'has_data' => $submitted->isNotEmpty() || array_sum($outcomes) > 0,
            'trend_basis' => 'submitted_at',
            'trend' => [
                'group_by' => $groupBy,
                'points' => collect($buckets)->map(fn (int $count, string $period): array => ['period' => $period, 'count' => $count])->values()->all(),
            ],
            'outcomes' => $outcomes,
            'rates' => $this->outcomeRates($outcomes),
            'sources' => $sources,
            'walk_in_share_percent' => $this->percentage($submitted->where('source', 'WALK_IN')->count(), $total),
        ];
    }

    /** @param array<string, mixed> $filters @return array<string, int> */
    private function outcomes(array $filters): array
    {
        return [
            'completed' => $this->statusEventCount($filters, Reservation::STATUS_COMPLETED, 'completed_at'),
            'cancelled' => $this->statusEventCount($filters, Reservation::STATUS_CANCELLED, 'cancelled_at'),
            'rejected' => $this->statusEventCount($filters, Reservation::STATUS_REJECTED, 'rejected_at'),
            'no_show' => $this->statusEventCount($filters, Reservation::STATUS_NO_SHOW, 'no_show_at'),
        ];
    }

    /** @param array<string, int> $outcomes @return array<string, float|null> */
    private function outcomeRates(array $outcomes): array
    {
        return [
            'no_show_percent' => $this->percentage($outcomes['no_show'], $outcomes['completed'] + $outcomes['no_show']),
            'cancellation_percent' => $this->percentage($outcomes['cancelled'], $outcomes['completed'] + $outcomes['cancelled'] + $outcomes['no_show']),
        ];
    }

    /** @param array<string, mixed> $filters */
    private function statusEventCount(array $filters, string $status, string $column): int
    {
        $query = Reservation::query()->where('status', $status)->whereBetween($column, $this->timestampBounds($filters));
        $this->applyReservationDimensions($query, $filters);

        return $query->count();
    }

    /** @param array<string, mixed> $filters @return array<string, mixed> */
    private function capacityData(array $filters): array
    {
        $configuration = CourtConfiguration::query()->find(1);
        $courtsQuery = Court::query()->orderBy('court_number');
        if ($filters['court_id']) {
            $courtsQuery->whereKey($filters['court_id']);
        }
        $courtsQuery->whereIn('id', $this->reportableCourtIds($filters));
        $courts = $courtsQuery->get(['id', 'court_number', 'is_active']);

        $courtTotals = $courts->mapWithKeys(fn (Court $court): array => [$court->id => [
            'court_id' => $court->id,
            'court_name' => "Court {$court->court_number}",
            'completed_hours' => 0,
            'potential_hours' => 0,
            'closed_hours' => 0,
            'sellable_hours' => 0,
        ]])->all();
        $heatmap = [];
        $dayTotals = collect(self::DAY_NAMES)->mapWithKeys(fn (string $name, int $day): array => [$day => [
            'day_index' => $day, 'day' => $name, 'completed_reservations' => [],
            'completed_hours' => 0, 'sellable_hours' => 0, 'slot_revenue' => 0.0,
        ]])->all();

        if (! $configuration || $courts->isEmpty()) {
            return $this->capacityResult($courtTotals, $heatmap, $dayTotals);
        }

        $closures = AvailabilityClosure::query()
            ->whereBetween('date', [$filters['from'], $filters['to']])
            ->with('periods')
            ->get();
        $completedSlots = ReservationSlot::query()
            ->whereBetween('date', [$filters['from'], $filters['to']])
            ->where('is_current', true)
            ->whereIn('court_id', $courts->pluck('id'))
            ->whereHas('reservation', function (Builder $query) use ($filters): void {
                $query->where('status', Reservation::STATUS_COMPLETED);
                $this->applySource($query, $filters['source']);
            })
            ->get(['reservation_id', 'court_id', 'date', 'start_hour', 'end_hour', 'unit_amount']);
        $completedBySlot = $completedSlots->keyBy(fn (ReservationSlot $slot): string => $this->slotKey($slot->court_id, $slot->date->toDateString(), $slot->start_hour));
        $now = BusinessClock::now();
        $date = CarbonImmutable::createFromFormat('Y-m-d', $filters['from'], BusinessClock::timezone());
        $to = CarbonImmutable::createFromFormat('Y-m-d', $filters['to'], BusinessClock::timezone());

        while ($date->lessThanOrEqualTo($to)) {
            $dateString = $date->toDateString();
            $day = $date->dayOfWeekIso;
            $dateClosures = $closures->filter(fn (AvailabilityClosure $closure): bool => $closure->date->toDateString() === $dateString);

            foreach ($courts as $court) {
                for ($hour = $configuration->opening_hour; $hour < $configuration->closing_hour; $hour++) {
                    if (! $this->isElapsedSlot($dateString, $hour + 1, $now)) {
                        continue;
                    }

                    $courtTotals[$court->id]['potential_hours']++;
                    $closed = $dateClosures->contains(fn (AvailabilityClosure $closure): bool => $this->closureAffectsSlot($closure, $court->id, $dateString, $hour));
                    if ($closed) {
                        $courtTotals[$court->id]['closed_hours']++;
                    } else {
                        $courtTotals[$court->id]['sellable_hours']++;
                        $dayTotals[$day]['sellable_hours']++;
                    }

                    $cellKey = "{$day}-{$hour}";
                    $heatmap[$cellKey] ??= [
                        'day_index' => $day,
                        'day' => self::DAY_NAMES[$day],
                        'start_hour' => $hour,
                        'completed_slots' => 0,
                        'sellable_slots' => 0,
                    ];
                    if (! $closed) {
                        $heatmap[$cellKey]['sellable_slots']++;
                    }

                    $slot = $completedBySlot->get($this->slotKey($court->id, $dateString, $hour));
                    if ($slot) {
                        $duration = max(0, $slot->end_hour - $slot->start_hour);
                        $courtTotals[$court->id]['completed_hours'] += $duration;
                        $heatmap[$cellKey]['completed_slots'] += $duration;
                        $dayTotals[$day]['completed_hours'] += $duration;
                        $dayTotals[$day]['slot_revenue'] += (float) $slot->unit_amount;
                        $dayTotals[$day]['completed_reservations'][$slot->reservation_id] = true;
                    }
                }
            }
            $date = $date->addDay();
        }

        return $this->capacityResult($courtTotals, $heatmap, $dayTotals);
    }

    /** @param array<int, array<string, mixed>> $courtTotals @param array<string, array<string, mixed>> $heatmap @param array<int, array<string, mixed>> $dayTotals @return array<string, mixed> */
    private function capacityResult(array $courtTotals, array $heatmap, array $dayTotals): array
    {
        $courts = collect($courtTotals)->map(function (array $court): array {
            $court['utilization_percent'] = $this->percentage($court['completed_hours'], $court['sellable_hours']);

            return $court;
        })->values();
        $potential = (int) $courts->sum('potential_hours');
        $closed = (int) $courts->sum('closed_hours');
        $sellable = (int) $courts->sum('sellable_hours');
        $completed = (int) $courts->sum('completed_hours');

        $heatmapRows = collect($heatmap)->map(function (array $cell): array {
            $cell['utilization_percent'] = $this->percentage($cell['completed_slots'], $cell['sellable_slots']);

            return $cell;
        })->sortBy(fn (array $cell): string => sprintf('%02d-%02d', $cell['day_index'], $cell['start_hour']))->values()->all();

        $days = collect($dayTotals)->map(function (array $day): array {
            $day['completed_reservations'] = count($day['completed_reservations']);
            $day['slot_revenue'] = round($day['slot_revenue'], 2);
            $day['utilization_percent'] = $this->percentage($day['completed_hours'], $day['sellable_hours']);

            return $day;
        })->values()->all();

        return [
            'completed_hours' => $completed,
            'potential_hours' => $potential,
            'closed_hours' => $closed,
            'sellable_hours' => $sellable,
            'utilization_percent' => $this->percentage($completed, $sellable),
            'operational_availability_percent' => $this->percentage($sellable, $potential),
            'courts' => $courts->all(),
            'heatmap' => $heatmapRows,
            'day_of_week' => $days,
        ];
    }

    private function closureAffectsSlot(AvailabilityClosure $closure, int $courtId, string $date, int $startHour): bool
    {
        if (! $closure->is_active && ! $closure->reopened_at) {
            return false;
        }

        if ($closure->reopened_at) {
            $slotStart = CarbonImmutable::createFromFormat('Y-m-d H:i', sprintf('%s %02d:00', $date, $startHour), BusinessClock::timezone());
            if ($closure->reopened_at->setTimezone(BusinessClock::timezone())->lessThanOrEqualTo($slotStart)) {
                return false;
            }
        }

        if ($closure->type === AvailabilityClosure::TYPE_ENTIRE_OPERATION) {
            return true;
        }

        if ($closure->type !== AvailabilityClosure::TYPE_COURT_TIME || $closure->court_id !== $courtId) {
            return false;
        }

        return $closure->periods->contains(fn ($period): bool => $period->start_hour <= $startHour && $period->end_hour > $startHour);
    }

    private function isElapsedSlot(string $date, int $endHour, CarbonImmutable $now): bool
    {
        if ($date !== $now->toDateString()) {
            return $date < $now->toDateString();
        }

        return ($endHour * 60) <= (($now->hour * 60) + $now->minute);
    }

    /** @param list<array<string, mixed>> $heatmap @return list<array<string, mixed>> */
    private function popularHours(array $heatmap): array
    {
        return collect($heatmap)
            ->groupBy('start_hour')
            ->map(fn (Collection $cells, int $hour): array => [
                'start_hour' => $hour,
                'completed_slots' => (int) $cells->sum('completed_slots'),
                'sellable_slots' => (int) $cells->sum('sellable_slots'),
                'utilization_percent' => $this->percentage((int) $cells->sum('completed_slots'), (int) $cells->sum('sellable_slots')),
            ])
            ->sortByDesc('completed_slots')
            ->values()
            ->take(6)
            ->all();
    }

    /** @param array<string, mixed> $filters @param Collection<int, array{date: mixed, amount: float}> $completed @param Collection<int, array{date: mixed, amount: float}> $noShows @return list<array<string, mixed>> */
    private function revenueTrend(array $filters, string $groupBy, Collection $completed, Collection $noShows): array
    {
        $buckets = collect($this->emptyBuckets($filters, $groupBy))->map(fn (): array => ['completed' => 0.0, 'no_show' => 0.0]);
        foreach ($completed as $event) {
            $key = $this->bucketKey($event['date'], $groupBy);
            $bucket = $buckets->get($key, ['completed' => 0.0, 'no_show' => 0.0]);
            $bucket['completed'] = round($bucket['completed'] + $event['amount'], 2);
            $buckets->put($key, $bucket);
        }
        foreach ($noShows as $event) {
            $key = $this->bucketKey($event['date'], $groupBy);
            $bucket = $buckets->get($key, ['completed' => 0.0, 'no_show' => 0.0]);
            $bucket['no_show'] = round($bucket['no_show'] + $event['amount'], 2);
            $buckets->put($key, $bucket);
        }

        return $buckets->map(fn (array $values, string $period): array => [
            'period' => $period,
            'completed_revenue' => $values['completed'],
            'no_show_revenue' => $values['no_show'],
            'recognized_revenue' => round($values['completed'] + $values['no_show'], 2),
        ])->values()->all();
    }

    /** @param array<string, mixed> $filters @return array<string, int> */
    private function emptyBuckets(array $filters, string $groupBy): array
    {
        $buckets = [];
        $date = CarbonImmutable::createFromFormat('Y-m-d', $filters['from'], BusinessClock::timezone());
        $to = CarbonImmutable::createFromFormat('Y-m-d', $filters['to'], BusinessClock::timezone());
        while ($date->lessThanOrEqualTo($to)) {
            $buckets[$this->bucketKey($date, $groupBy)] = 0;
            $date = $date->addDay();
        }

        return $buckets;
    }

    private function bucketKey(mixed $value, string $groupBy): string
    {
        $date = $value instanceof CarbonInterface
            ? CarbonImmutable::instance($value)->setTimezone(BusinessClock::timezone())
            : CarbonImmutable::parse($value, 'UTC')->setTimezone(BusinessClock::timezone());

        return match ($groupBy) {
            'month' => $date->startOfMonth()->toDateString(),
            'week' => $date->startOfWeek(CarbonInterface::MONDAY)->toDateString(),
            default => $date->toDateString(),
        };
    }

    /** @param array<string, mixed> $filters */
    private function automaticGrouping(array $filters): string
    {
        $from = CarbonImmutable::createFromFormat('Y-m-d', $filters['from'], BusinessClock::timezone());
        $to = CarbonImmutable::createFromFormat('Y-m-d', $filters['to'], BusinessClock::timezone());
        $days = $from->diffInDays($to) + 1;

        return match (true) {
            $days <= 45 => 'day',
            $days <= 180 => 'week',
            default => 'month',
        };
    }

    /** @param array<string, mixed> $input @return array{from: string, to: string, court_id: int|null, source: string|null} */
    private function filters(array $input): array
    {
        return [
            'from' => (string) $input['from'],
            'to' => (string) $input['to'],
            'court_id' => isset($input['court_id']) ? (int) $input['court_id'] : null,
            'source' => isset($input['source']) ? (string) $input['source'] : null,
        ];
    }

    /** @param array<string, mixed> $filters @return array<string, mixed> */
    private function context(array $filters): array
    {
        $courtIds = $this->reportableCourtIds($filters);
        $courtsQuery = Court::query()->orderBy('court_number')->whereIn('id', $courtIds);

        return [
            'range' => ['from' => $filters['from'], 'to' => $filters['to'], 'time_zone' => BusinessClock::timezone()],
            'filters' => ['court_id' => $filters['court_id'], 'source' => $filters['source']],
            'courts' => $courtsQuery->get(['id', 'court_number', 'is_active'])->map(fn (Court $court): array => [
                'id' => $court->id,
                'name' => "Court {$court->court_number}",
                'is_active' => $court->is_active,
            ])->all(),
            'capacity_basis' => 'CURRENT_CONFIGURATION_WITH_RECORDED_CLOSURES',
        ];
    }

    /** @param array<string, mixed> $filters @return Collection<int, int> */
    private function reportableCourtIds(array $filters): Collection
    {
        $query = ReservationSlot::query()
            ->whereBetween('date', [$filters['from'], $filters['to']])
            ->whereHas('reservation', function (Builder $reservation) use ($filters): void {
                $this->applySource($reservation, $filters['source']);
            });

        if ($filters['court_id']) {
            $query->where('court_id', $filters['court_id']);
        }

        return $query->distinct()->pluck('court_id')->map(fn (mixed $courtId): int => (int) $courtId);
    }

    /** @param array<string, mixed> $filters @return array{0: CarbonImmutable, 1: CarbonImmutable} */
    private function timestampBounds(array $filters): array
    {
        return [
            CarbonImmutable::createFromFormat('Y-m-d', $filters['from'], BusinessClock::timezone())->startOfDay()->utc(),
            CarbonImmutable::createFromFormat('Y-m-d', $filters['to'], BusinessClock::timezone())->endOfDay()->utc(),
        ];
    }

    /** @param Builder<Reservation> $query @param array<string, mixed> $filters */
    private function applyReservationDimensions(Builder $query, array $filters): void
    {
        $this->applySource($query, $filters['source']);
        $this->applyCourt($query, $filters['court_id']);
    }

    /** @param Builder<Reservation> $query */
    private function applySource(Builder $query, ?string $source): void
    {
        if ($source) {
            $query->where('source', $source);
        }
    }

    /** @param Builder<Reservation> $query */
    private function applyCourt(Builder $query, ?int $courtId): void
    {
        if ($courtId) {
            $query->whereHas('currentSlots', fn (Builder $slots) => $slots->where('court_id', $courtId));
        }
    }

    private function paymentMethodGroupKey(ReservationPayment $payment): string
    {
        if ($payment->payment_method_id) {
            return "id:{$payment->payment_method_id}";
        }

        return 'name:'.mb_strtolower(trim((string) ($payment->payment_method_name ?: $payment->channel)));
    }

    /** @param array<string, mixed> $filters */
    private function dimensionReservationIds(array $filters): Builder
    {
        $query = Reservation::query()->select('id');
        $this->applyReservationDimensions($query, $filters);

        return $query;
    }

    private function percentage(int|float $numerator, int|float $denominator): ?float
    {
        return $denominator == 0 ? null : round(($numerator / $denominator) * 100, 1);
    }

    /** @param Collection<int, float|int> $values */
    private function median(Collection $values): ?float
    {
        $count = $values->count();
        if ($count === 0) {
            return null;
        }
        $middle = intdiv($count, 2);

        return round($count % 2 === 1
            ? (float) $values[$middle]
            : ((float) $values[$middle - 1] + (float) $values[$middle]) / 2, 1);
    }

    private function slotKey(int $courtId, string $date, int $startHour): string
    {
        return "{$courtId}-{$date}-{$startHour}";
    }

    private function humanize(string $value): string
    {
        return str($value)->lower()->replace('_', ' ')->title()->toString();
    }

    private function capacityNote(): string
    {
        return 'Sellable capacity uses recorded closures and the currently configured operating schedule because historical operating-hour and court-activation versions are not stored.';
    }
}

<?php

namespace App\Services;

use App\Models\AvailabilityClosure;
use App\Models\Court;
use App\Models\CourtConfiguration;
use App\Models\Reservation;
use App\Models\ReservationSlotLock;
use App\Support\BusinessClock;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;

class CourtAvailabilityService
{
    /**
     * @return array{
     *   configuration: CourtConfiguration|null,
     *   courts: Collection<int, Court>,
     *   slots: list<array{start_hour: int, end_hour: int, price: float}>,
     *   is_outside_booking_window: bool,
     *   booking_window_end: string|null,
     *   is_date_closed: bool,
     *   unavailable_slots: list<array{court_id: int, start_hour: int}>,
     *   closed_slots: list<array{court_id: int, start_hour: int}>,
     *   reserved_slots: list<array{court_id: int, start_hour: int}>,
     *   past_slots: list<array{court_id: int, start_hour: int}>,
     *   reservations_by_slot: array<string, Reservation>
     * }
     */
    public function forDate(string $date, bool $enforcePublicBookingWindow = true): array
    {
        $parsedDate = CarbonImmutable::createFromFormat('Y-m-d', $date);
        $configuration = CourtConfiguration::query()->with('ratePeriods')->find(1);
        $courts = Court::query()->active()->orderBy('court_number')->get();
        $isOutsideBookingWindow = $configuration && $configuration->isAfterPublicBookingWindow($date);
        $closures = AvailabilityClosure::query()
            ->active()
            ->whereDate('date', $date)
            ->with('periods')
            ->get();

        $slots = [];
        if ($configuration && (! $enforcePublicBookingWindow || ! $isOutsideBookingWindow)) {
            $dayType = CourtConfiguration::dayTypeForDate($parsedDate);
            $rates = $configuration->ratePeriods->where('day_type', $dayType);

            for ($hour = $configuration->opening_hour; $hour < $configuration->closing_hour; $hour++) {
                $rate = $rates->first(fn ($period) => $period->start_hour <= $hour && $period->end_hour > $hour);
                if ($rate) {
                    $slots[] = [
                        'start_hour' => $hour,
                        'end_hour' => $hour + 1,
                        'price' => (float) $rate->price,
                    ];
                }
            }
        }

        $isDateClosed = $closures->contains(
            fn (AvailabilityClosure $closure): bool => $closure->type === AvailabilityClosure::TYPE_ENTIRE_OPERATION,
        );
        $unavailableSlots = [];
        $closedSlots = [];
        $reservedSlots = [];
        $pastSlots = [];
        $reservationsBySlot = [];
        $now = BusinessClock::now();

        foreach ($courts as $court) {
            foreach ($slots as $slot) {
                if ($this->isPastSlot($date, $slot['end_hour'], $now)) {
                    $pastSlot = ['court_id' => $court->id, 'start_hour' => $slot['start_hour']];
                    $pastSlots[] = $pastSlot;
                    $unavailableSlots[] = $pastSlot;
                }
            }
        }

        if ($isDateClosed) {
            foreach ($courts as $court) {
                foreach ($slots as $slot) {
                    $closedSlot = [
                        'court_id' => $court->id,
                        'start_hour' => $slot['start_hour'],
                    ];
                    $unavailableSlots[] = $closedSlot;
                    $closedSlots[] = $closedSlot;
                }
            }
        } else {
            $closures
                ->where('type', AvailabilityClosure::TYPE_COURT_TIME)
                ->each(function (AvailabilityClosure $closure) use (&$unavailableSlots, &$closedSlots, $slots): void {
                    foreach ($closure->periods as $period) {
                        foreach ($slots as $slot) {
                            if ($slot['start_hour'] >= $period->start_hour && $slot['end_hour'] <= $period->end_hour) {
                                $closedSlot = [
                                    'court_id' => $closure->court_id,
                                    'start_hour' => $slot['start_hour'],
                                ];
                                $unavailableSlots[] = $closedSlot;
                                $closedSlots[] = $closedSlot;
                            }
                        }
                    }
                });

            ReservationSlotLock::query()
                ->whereDate('date', $date)
                ->with('reservationSlot.reservation')
                ->get()
                ->each(function (ReservationSlotLock $lock) use (&$unavailableSlots, &$reservedSlots, &$reservationsBySlot): void {
                    $slot = ['court_id' => $lock->court_id, 'start_hour' => $lock->start_hour];
                    $key = $this->slotKey($lock->court_id, $lock->start_hour);
                    $unavailableSlots[] = $slot;
                    $reservedSlots[] = $slot;
                    if ($lock->reservationSlot?->reservation) {
                        $reservationsBySlot[$key] = $lock->reservationSlot->reservation;
                    }
                });
        }

        return [
            'configuration' => $configuration,
            'courts' => $courts,
            'slots' => $slots,
            'is_outside_booking_window' => $isOutsideBookingWindow,
            'booking_window_end' => $configuration?->publicBookingWindowEnd(),
            'is_date_closed' => $isDateClosed,
            'unavailable_slots' => collect($unavailableSlots)
                ->unique(fn (array $slot): string => $this->slotKey($slot['court_id'], $slot['start_hour']))
                ->values()
                ->all(),
            'closed_slots' => collect($closedSlots)
                ->unique(fn (array $slot): string => $this->slotKey($slot['court_id'], $slot['start_hour']))
                ->values()
                ->all(),
            'reserved_slots' => collect($reservedSlots)
                ->unique(fn (array $slot): string => $this->slotKey($slot['court_id'], $slot['start_hour']))
                ->values()
                ->all(),
            'past_slots' => collect($pastSlots)
                ->unique(fn (array $slot): string => $this->slotKey($slot['court_id'], $slot['start_hour']))
                ->values()
                ->all(),
            'reservations_by_slot' => $reservationsBySlot,
        ];
    }

    private function slotKey(int $courtId, int $startHour): string
    {
        return "{$courtId}-{$startHour}";
    }

    private function isPastSlot(string $date, int $endHour, CarbonImmutable $now): bool
    {
        if ($date !== $now->toDateString()) {
            return $date < $now->toDateString();
        }

        return ($endHour * 60) < (($now->hour * 60) + $now->minute);
    }
}

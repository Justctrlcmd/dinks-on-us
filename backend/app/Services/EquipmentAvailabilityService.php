<?php

namespace App\Services;

use App\Exceptions\ReservationConflictException;
use App\Models\RentalEquipment;
use App\Models\Reservation;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class EquipmentAvailabilityService
{
    /** Stock currently represents usable units; no damaged-stock model exists yet. */
    public function usableStock(RentalEquipment $item): int
    {
        return $item->is_active ? max(0, $item->total_quantity) : 0;
    }

    /**
     * Equipment belongs to the reservation, not to each court. Deduplicate actual
     * booked hours so simultaneous courts do not multiply an allocation.
     *
     * @param  Collection<int, RentalEquipment>  $items
     * @param  list<array{date: string, start_hour: int, end_hour?: int}>  $slots
     * @return array<int, array{available_quantity: int, slots: list<array<string, mixed>>}>
     */
    public function forSlots(Collection $items, array $slots, ?int $ignoreReservationId = null, bool $lock = false): array
    {
        $hours = [];
        foreach ($slots as $slot) {
            for ($hour = $slot['start_hour']; $hour < ($slot['end_hour'] ?? $slot['start_hour'] + 1); $hour++) {
                $hours[$slot['date'].'-'.$hour] = ['date' => $slot['date'], 'start_hour' => $hour, 'end_hour' => $hour + 1];
            }
        }
        if ($items->isEmpty()) {
            return [];
        }

        $usage = [];
        if ($hours !== []) {
            $query = DB::table('reservation_equipment_items as equipment')
                ->join('reservations as reservation', 'reservation.id', '=', 'equipment.reservation_id')
                ->join('reservation_slots as slot', 'slot.reservation_id', '=', 'reservation.id')
                ->whereIn('equipment.rental_equipment_id', $items->modelKeys())
                ->where('equipment.is_active', true)
                ->whereIn('reservation.status', Reservation::OPERATIONAL_STATUSES)
                ->where('slot.is_current', true)
                ->when($ignoreReservationId !== null, fn ($query) => $query->where('reservation.id', '!=', $ignoreReservationId))
                ->where(function ($query) use ($hours): void {
                    foreach (collect($hours)->groupBy('date') as $date => $selectedHours) {
                        $query->orWhere(function ($query) use ($date, $selectedHours): void {
                            $query->where('slot.date', $date)->whereIn('slot.start_hour', $selectedHours->pluck('start_hour'));
                        });
                    }
                })
                ->select(['equipment.id', 'equipment.rental_equipment_id', 'equipment.quantity', 'slot.date', 'slot.start_hour']);
            // A locking read sees the latest committed allocations even if the
            // caller established a MySQL REPEATABLE READ snapshot before waiting
            // for the inventory lock. Only relevant overlapping rows are read.
            if ($lock) {
                $query->lockForUpdate();
            }
            $seen = [];
            foreach ($query->get() as $allocation) {
                $key = $allocation->date.'-'.$allocation->start_hour;
                $allocationKey = $allocation->id.'-'.$key;
                if (isset($seen[$allocationKey])) {
                    continue;
                }
                $seen[$allocationKey] = true;
                $id = $allocation->rental_equipment_id;
                $usage[$id][$key] = ($usage[$id][$key] ?? 0) + $allocation->quantity;
            }
        }

        $result = [];
        foreach ($items as $item) {
            $stock = $this->usableStock($item);
            $availability = [];
            foreach ($hours as $key => $hour) {
                $availability[] = [...$hour, 'available_quantity' => max(0, $stock - ($usage[$item->id][$key] ?? 0))];
            }
            $result[$item->id] = [
                'available_quantity' => $availability === [] ? 0 : min(array_column($availability, 'available_quantity')),
                'slots' => $availability,
            ];
        }

        return $result;
    }

    /** Must run inside the transaction that writes the slots and allocations. */
    public function assertReservationAvailable(Reservation $reservation): void
    {
        $selection = $reservation->equipmentItems()->where('is_active', true)->get()->groupBy('rental_equipment_id');
        if ($selection->isEmpty()) {
            return;
        }
        // Stable inventory rows serialize competing allocations, including when
        // there are no existing bookings to lock. Always acquire in ID order.
        $items = RentalEquipment::query()->whereIn('id', $selection->keys())->orderBy('id')->lockForUpdate()->get();
        $slots = $reservation->currentSlots()->get()->map(fn ($slot): array => [
            'date' => $slot->date->toDateString(), 'start_hour' => $slot->start_hour, 'end_hour' => $slot->end_hour,
        ])->all();
        $availability = $this->forSlots($items, $slots, $reservation->id, true);
        foreach ($selection as $id => $allocations) {
            $maximum = $availability[$id]['available_quantity'] ?? 0;
            if ($allocations->sum('quantity') > $maximum) {
                $name = $allocations->first()->name;
                throw new ReservationConflictException("Only {$maximum} {$name} are currently available for the selected schedule.");
            }
        }
    }
}

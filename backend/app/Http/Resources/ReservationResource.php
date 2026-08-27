<?php

namespace App\Http\Resources;

use App\Models\Reservation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReservationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var Reservation $reservation */
        $reservation = $this->resource;
        $displayStatus = $reservation->status === Reservation::STATUS_VERIFIED && $reservation->is_rescheduled ? 'RESCHEDULED' : $reservation->status;

        return [
            'id' => $reservation->id,
            'reference_number' => $reservation->reference_number,
            'source' => $reservation->source,
            'booking_date' => $reservation->booking_date->toDateString(),
            'customer' => ['name' => $reservation->customer_name, 'email' => $reservation->customer_email, 'contact_number' => $reservation->customer_contact_number],
            'status' => $reservation->status,
            'display_status' => $displayStatus,
            'is_rescheduled' => $reservation->is_rescheduled,
            'reschedule_count' => $reservation->reschedule_count,
            'amounts' => [
                'original' => (float) $reservation->original_amount,
                'adjustments' => (float) $reservation->adjustment_amount,
                'final' => (float) $reservation->final_amount,
                'paid' => (float) $reservation->amount_paid,
                'outstanding' => max(0, (float) $reservation->final_amount - (float) $reservation->amount_paid),
                'refundable_credit' => (float) $reservation->refundable_credit,
            ],
            'rejection' => $reservation->rejection_concern ? ['concern' => $reservation->rejection_concern, 'reason' => $reservation->rejection_reason] : null,
            'cancellation_reason' => $reservation->cancellation_reason,
            'slots' => $this->whenLoaded('currentSlots', fn () => $reservation->currentSlots->map(fn ($slot): array => [
                'id' => $slot->id, 'court_id' => $slot->court_id, 'court_name' => $slot->court ? "Court {$slot->court->court_number}" : null,
                'date' => $slot->date->toDateString(), 'start_hour' => $slot->start_hour, 'end_hour' => $slot->end_hour,
                'amount' => (float) $slot->unit_amount, 'kind' => $slot->kind,
            ])->values()),
            'equipment' => $this->whenLoaded('equipmentItems', fn () => $reservation->equipmentItems->where('is_active', true)->map(fn ($item): array => [
                'id' => $item->id, 'equipment_id' => $item->rental_equipment_id, 'name' => $item->name, 'quantity' => $item->quantity,
                'unit_amount' => (float) $item->unit_amount, 'total_amount' => (float) $item->unit_amount * $item->quantity, 'kind' => $item->kind,
            ])->values()),
            'additional_players' => ['original_quantity' => $reservation->original_additional_players, 'unit_amount' => (float) $reservation->additional_player_unit_amount],
            'payments' => $this->whenLoaded('payments', fn () => $reservation->payments->map(fn ($payment): array => [
                'id' => $payment->id, 'method' => $payment->payment_method_name, 'channel' => $payment->channel, 'kind' => $payment->kind,
                'status' => $payment->status, 'amount' => (float) $payment->amount, 'reference_number' => $payment->reference_number,
                'proof_url' => $payment->proof_path ? match (true) {
                    $request->routeIs('management.history.show') => "/api/v1/management/history-payments/{$payment->id}/proof",
                    $request->routeIs('management.dashboard.reservations.show') => "/api/v1/management/dashboard-payments/{$payment->id}/proof",
                    default => "/api/v1/management/reservation-payments/{$payment->id}/proof",
                } : null,
            ])->values()),
            'adjustments' => $this->whenLoaded('adjustments', fn () => $reservation->adjustments->map(fn ($adjustment): array => [
                'id' => $adjustment->id, 'type' => $adjustment->type, 'description' => $adjustment->description, 'quantity' => $adjustment->quantity,
                'unit_amount' => (float) $adjustment->unit_amount, 'total_amount' => (float) $adjustment->total_amount,
            ])->values()),
            'schedule_history' => $this->whenLoaded('scheduleHistories', fn () => $reservation->scheduleHistories->map(fn ($history): array => [
                'id' => $history->id, 'old_booking_date' => $history->old_booking_date->toDateString(), 'new_booking_date' => $history->new_booking_date->toDateString(),
                'old_slots' => $history->old_slots, 'new_slots' => $history->new_slots, 'difference_amount' => (float) $history->difference_amount, 'created_at' => $history->created_at?->toISOString(),
            ])->values()),
            'refunds' => $this->whenLoaded('refunds', fn () => $reservation->refunds->map(fn ($refund): array => ['id' => $refund->id, 'type' => $refund->type, 'status' => $refund->status, 'amount' => (float) $refund->amount, 'reason' => $refund->reason])->values()),
            'timestamps' => [
                'submitted_at' => $reservation->submitted_at?->toISOString(), 'verified_at' => $reservation->verified_at?->toISOString(),
                'started_at' => $reservation->started_at?->toISOString(), 'completed_at' => $reservation->completed_at?->toISOString(),
                'cancelled_at' => $reservation->cancelled_at?->toISOString(), 'rejected_at' => $reservation->rejected_at?->toISOString(),
                'no_show_at' => $reservation->no_show_at?->toISOString(),
            ],
        ];
    }
}

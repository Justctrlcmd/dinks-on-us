<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Reservation update</title>
</head>

<body style="margin:0;background:#f7f3e9;color:#213547;font-family:Arial,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                    style="max-width:640px;background:#fffdfc;border:1px solid #d9e0e3;border-radius:12px;overflow:hidden">
                    <tr>
                        <td style="padding:28px">
                            @php
                            $titles = [
                                'verified' => 'Your reservation is verified',
                                'rejected' => 'Your reservation was not approved',
                                'rescheduled' => 'Your reservation has been rescheduled',
                                'completed' => 'Your reservation is complete',
                                'cancelled' => 'Your reservation has been cancelled',
                                'no_show' => 'Your reservation was marked as a no-show',
                            ];
                            @endphp
                            <h1 style="margin:0 0 8px;font-size:24px">{{ $titles[$event] ?? 'Reservation update' }}</h1>
                            <p style="margin:0 0 20px;color:#6b7a86">Reference <strong
                                    style="color:#1e6f78">{{ $reservation->reference_number }}</strong></p>
                            <p>Hi {{ $reservation->customer_name }},</p>
                            @if ($event === 'verified')
                            <p>Good news your payment has been verified and your reservation is confirmed.</p>
                            @endif
                            @if ($event === 'rejected')
                            <p>We could not approve your reservation after reviewing the submitted payment details. The
                                selected court times have been released.</p>
                            <p><strong>Concern:</strong>
                                {{ ucwords(strtolower(str_replace('_', ' ', $reservation->rejection_concern ?? ''))) }}
                            </p>
                            <p><strong>Reason:</strong> {{ $reservation->rejection_reason }}</p>
                            @endif
                            @if ($event === 'rescheduled')
                            <p>Your reservation schedule has been updated. Please use the new court, date, and time
                                shown below.</p>
                            @endif
                            @if ($event === 'completed')
                            <p>Your reservation is complete. The final amount below includes any recorded add-ons.</p>
                            @endif
                            @if ($event === 'cancelled')
                            <p>Your reservation has been cancelled and the selected court times have been released.</p>
                            <p><strong>Reason:</strong> {{ $reservation->cancellation_reason }}</p>
                            @endif
                            @if ($event === 'no_show')
                            <p>Your reservation was marked as a no-show. Any amount already paid is retained and is not refundable.</p>
                            @endif
                            @php
                            $courtTotal = (float) $reservation->currentSlots->sum('unit_amount');
                            $additionalPlayerAdjustments = $reservation->adjustments->where('type', 'ADDITIONAL_PLAYER');
                            $additionalPlayerQuantity = (int) $reservation->original_additional_players + (int) $additionalPlayerAdjustments->sum('quantity');
                            $additionalPlayersTotal = ((int) $reservation->original_additional_players * (float) $reservation->additional_player_unit_amount) + (float) $additionalPlayerAdjustments->sum('total_amount');
                            $equipmentItems = $reservation->equipmentItems->where('is_active', true);
                            $equipmentTotal = (float) $equipmentItems->sum(fn ($equipment) => (float) $equipment->unit_amount * (int) $equipment->quantity);
                            $outstanding = max(0, (float) $reservation->final_amount - (float) $reservation->amount_paid);
                            $refundableCredit = max(0, (float) $reservation->refundable_credit);
                            $reschedulePayment = $reservation->payments->where('kind', 'RESCHEDULE')->sortByDesc('id')->first();
                            $slotsByCourt = $reservation->currentSlots
                                ->sortBy(fn ($slot) => sprintf('%s-%03d-%03d', $slot->date->format('Y-m-d'), $slot->court->court_number, $slot->start_hour))
                                ->groupBy(fn ($slot) => $slot->date->format('Y-m-d').'-'.$slot->court_id);
                            @endphp
                            <h2 style="font-size:17px;margin-top:24px">Your reservation</h2>
                            @foreach ($slotsByCourt as $slots)
                            @php
                            $firstSlot = $slots->first();
                            $slotCount = $slots->count();
                            $courtGroupTotal = (float) $slots->sum('unit_amount');
                            @endphp
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                                style="margin:8px 0;background:#f7f3e9;border-radius:8px">
                                <tr>
                                    <td style="padding:12px 14px 8px">
                                        <div style="font-size:12px;color:#6b7a86;text-transform:uppercase;letter-spacing:.08em">Court</div>
                                        <strong style="font-size:16px">Court {{ $firstSlot->court->court_number }}</strong>
                                    </td>
                                    <td align="right" style="padding:12px 14px 8px">
                                        <div style="font-size:12px;color:#6b7a86;text-transform:uppercase;letter-spacing:.08em">{{ $slotCount === 1 ? 'Price' : 'Court total' }}</div>
                                        <strong style="font-size:16px">₱{{ number_format($courtGroupTotal, 2) }}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td colspan="2" style="padding:8px 14px;border-top:1px solid #e4dfd2">
                                        <div style="font-size:12px;color:#6b7a86;text-transform:uppercase;letter-spacing:.08em">Date</div>
                                        <strong>{{ $firstSlot->date->format('F j, Y') }}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td colspan="2" style="padding:8px 14px 12px">
                                        <div style="font-size:12px;color:#6b7a86;text-transform:uppercase;letter-spacing:.08em">{{ $slotCount === 1 ? 'Time' : "Time slots ({$slotCount})" }}</div>
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:4px">
                                            @foreach ($slots as $slot)
                                            @php
                                            $startTime = \Carbon\Carbon::createFromTime((int) $slot->start_hour)->format('g:i A');
                                            $endTime = \Carbon\Carbon::createFromTime((int) $slot->end_hour)->format('g:i A');
                                            @endphp
                                            <tr>
                                                <td style="padding:4px 0{{ $loop->last ? '' : ';border-bottom:1px solid #e4dfd2' }}"><strong>{{ $startTime }} – {{ $endTime }}</strong></td>
                                                @if ($slotCount > 1)
                                                <td align="right" style="padding:4px 0{{ $loop->last ? '' : ';border-bottom:1px solid #e4dfd2' }}">₱{{ number_format((float) $slot->unit_amount, 2) }}</td>
                                                @endif
                                            </tr>
                                            @endforeach
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            @endforeach
                            @if ($additionalPlayerQuantity > 0 || $equipmentItems->isNotEmpty())
                            <h3 style="font-size:15px;margin:20px 0 8px">Additional reservation details</h3>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px">
                                @if ($additionalPlayerQuantity > 0)
                                <tr>
                                    <td style="padding:6px 0">{{ $additionalPlayerQuantity }} Additional Player{{ $additionalPlayerQuantity === 1 ? '' : 's' }}</td>
                                    <td align="right" style="padding:6px 0"><strong>₱{{ number_format($additionalPlayersTotal, 2) }}</strong></td>
                                </tr>
                                @endif
                                @foreach ($equipmentItems as $equipment)
                                <tr>
                                    <td style="padding:6px 0">{{ $equipment->quantity }} {{ $equipment->name }}</td>
                                    <td align="right" style="padding:6px 0"><strong>₱{{ number_format((float) $equipment->unit_amount * $equipment->quantity, 2) }}</strong></td>
                                </tr>
                                @endforeach
                            </table>
                            @endif
                            <h3 style="font-size:15px;margin:20px 0 8px">Payment summary</h3>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px">
                                <tr>
                                    <td style="padding:6px 0">Court rental</td>
                                    <td align="right" style="padding:6px 0">₱{{ number_format($courtTotal, 2) }}</td>
                                </tr>
                                @if ($additionalPlayerQuantity > 0)
                                <tr>
                                    <td style="padding:6px 0">Additional players</td>
                                    <td align="right" style="padding:6px 0">₱{{ number_format($additionalPlayersTotal, 2) }}</td>
                                </tr>
                                @endif
                                @if ($equipmentItems->isNotEmpty())
                                <tr>
                                    <td style="padding:6px 0">Rental equipment</td>
                                    <td align="right" style="padding:6px 0">₱{{ number_format($equipmentTotal, 2) }}</td>
                                </tr>
                                @endif
                                <tr>
                                    <td style="padding:10px 0 6px;border-top:1px solid #d9e0e3;font-size:17px"><strong>Reservation total</strong></td>
                                    <td align="right" style="padding:10px 0 6px;border-top:1px solid #d9e0e3;font-size:17px"><strong>₱{{ number_format((float) $reservation->final_amount, 2) }}</strong></td>
                                </tr>
                                <tr>
                                    <td style="padding:6px 0"><strong>Amount paid</strong></td>
                                    <td align="right" style="padding:6px 0"><strong>₱{{ number_format((float) $reservation->amount_paid, 2) }}</strong></td>
                                </tr>
                                @if ($event === 'rescheduled' && $reschedulePayment)
                                <tr>
                                    <td style="padding:6px 0"><strong>Additional payment</strong></td>
                                    <td align="right" style="padding:6px 0"><strong>₱{{ number_format((float) $reschedulePayment->amount, 2) }}</strong></td>
                                </tr>
                                @endif
                                @if (in_array($event, ['rescheduled', 'completed'], true))
                                <tr>
                                    <td style="padding:6px 0;color:#1e6f78"><strong>Payment status</strong></td>
                                    <td align="right" style="padding:6px 0;color:#1e6f78"><strong>Settled</strong></td>
                                </tr>
                                @elseif ($outstanding > 0)
                                <tr>
                                    <td style="padding:6px 0;color:#a33a3a"><strong>Balance due</strong></td>
                                    <td align="right" style="padding:6px 0;color:#a33a3a"><strong>₱{{ number_format($outstanding, 2) }}</strong></td>
                                </tr>
                                @endif
                                @if ($event === 'cancelled')
                                <tr>
                                    <td style="padding:6px 0;color:#1e6f78"><strong>Refunded amount</strong></td>
                                    <td align="right" style="padding:6px 0;color:#1e6f78"><strong>₱{{ number_format($refundableCredit, 2) }}</strong></td>
                                </tr>
                                @elseif ($event === 'no_show')
                                <tr>
                                    <td style="padding:6px 0;color:#a33a3a"><strong>Non-refundable amount retained</strong></td>
                                    <td align="right" style="padding:6px 0;color:#a33a3a"><strong>₱{{ number_format((float) $reservation->amount_paid, 2) }}</strong></td>
                                </tr>
                                @elseif ($refundableCredit > 0)
                                <tr>
                                    <td style="padding:6px 0;color:#1e6f78"><strong>{{ $event === 'completed' ? 'Refund due' : 'Refundable credit' }}</strong></td>
                                    <td align="right" style="padding:6px 0;color:#1e6f78"><strong>₱{{ number_format($refundableCredit, 2) }}</strong></td>
                                </tr>
                                @endif
                            </table>
                            @if (in_array($event, ['verified', 'rescheduled'], true))<p
                                style="margin-top:24px;padding:14px;background:#bee3db;border-radius:8px">Please arrive
                                10–15 minutes before your reserved time and review the website policies before your
                                visit.</p>@endif
                            <div style="margin-top:28px;padding-top:20px;border-top:1px solid #d9e0e3;text-align:center">
                                <p style="margin:0 0 8px;font-weight:700;color:#213547">Follow us for more information</p>
                                <a href="{{ config('app.facebook_url') }}" style="color:#1e6f78;font-weight:700">Facebook</a>
                                <span style="color:#9aa7ad">&nbsp;·&nbsp;</span>
                                <a href="{{ rtrim(config('app.frontend_url'), '/') }}" style="color:#1e6f78;font-weight:700">Visit our website</a>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>

</html>

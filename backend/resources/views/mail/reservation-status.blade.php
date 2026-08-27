<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reservation update</title></head>
<body style="margin:0;background:#f7f3e9;color:#213547;font-family:Arial,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fffdfc;border:1px solid #d9e0e3;border-radius:12px;overflow:hidden">
<tr><td style="background:#1e6f78;padding:22px;text-align:center"><img src="{{ rtrim(config('app.frontend_url'), '/') }}/images/dinks-on-us-logo.png" width="150" alt="Dinks on Us" style="max-width:150px;height:auto"><div style="margin-top:8px;color:#fff;font-weight:700">Dinks on Us</div></td></tr>
<tr><td style="padding:28px">
@php
  $titles = ['submitted' => 'Reservation received', 'verified' => 'Your reservation is verified', 'rejected' => 'Your reservation was not approved', 'rescheduled' => 'Your reservation was rescheduled', 'cancelled' => 'Your reservation was cancelled'];
@endphp
<h1 style="margin:0 0 8px;font-size:24px">{{ $titles[$event] ?? 'Reservation update' }}</h1>
<p style="margin:0 0 20px;color:#6b7a86">Reference <strong style="color:#1e6f78">{{ $reservation->reference_number }}</strong></p>
@if ($event === 'rejected')<p><strong>Concern:</strong> {{ str_replace('_', ' ', $reservation->rejection_concern ?? '') }}</p><p><strong>Reason:</strong> {{ $reservation->rejection_reason }}</p>@endif
@if ($event === 'cancelled')<p><strong>Reason:</strong> {{ $reservation->cancellation_reason }}</p>@endif
<h2 style="font-size:17px;margin-top:24px">Reservation summary</h2>
@foreach ($reservation->currentSlots as $slot)
<p style="margin:8px 0;padding:10px;background:#f7f3e9;border-radius:8px">Court {{ $slot->court->court_number }} · {{ $slot->date->format('F j, Y') }} · {{ $slot->start_hour }}:00–{{ $slot->end_hour }}:00 <strong style="float:right">₱{{ number_format((float) $slot->unit_amount, 2) }}</strong></p>
@endforeach
@foreach ($reservation->adjustments as $adjustment)<p style="margin:6px 0">{{ $adjustment->description }} <strong style="float:right">₱{{ number_format((float) $adjustment->total_amount, 2) }}</strong></p>@endforeach
<p style="margin-top:16px;border-top:1px solid #d9e0e3;padding-top:14px;font-size:18px"><strong>Current total</strong><strong style="float:right">₱{{ number_format((float) $reservation->final_amount, 2) }}</strong></p>
@if ($event === 'verified')<p style="margin-top:24px;padding:14px;background:#bee3db;border-radius:8px">Please arrive 10–15 minutes before your reserved time and review the website policies before your visit.</p>@endif
<p style="margin-top:24px"><a href="{{ rtrim(config('app.frontend_url'), '/') }}" style="color:#1e6f78;font-weight:700">Visit the Dinks on Us website</a></p>
</td></tr></table></td></tr></table>
</body></html>

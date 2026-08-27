# Dinks on Us — Reports & Analytics Formulas

## 1. Purpose

This document defines the authoritative formulas, date bases, denominator rules, and intended business meaning for the Dinks on Us Reports & Analytics module.

Its purpose is to prevent different screens, endpoints, and developers from calculating the same metric differently.

All report values must be derived from authoritative transactional records. The system must not maintain duplicate manually updated reporting totals.

Backend calculations are authoritative. The frontend renders report results and must not independently redefine business formulas.

---

# 2. Global reporting principles

## 2.1 Business timezone

Dinks on Us operates in:

```text
Asia/Manila
```

Reservation business dates and court times are local business values.

Timestamp-based groupings must be converted/interpreted using the project date strategy and the Dinks on Us business timezone before assigning a reporting day.

---

## 2.2 Reporting date presets

The Reports UI uses rolling ranges ending on the current business date.

Required presets:

```text
Last 7 Days
Last 30 Days
Last 3 Months
Last 6 Months
Last 12 Months
Custom Range
```

Default:

```text
Last 7 Days
```

Do not use ambiguous labels such as `Last Month`.

### Last 7 Days

```text
to   = today
from = today - 6 days
```

This produces 7 inclusive calendar dates.

### Last 30 Days

```text
to   = today
from = today - 29 days
```

This produces 30 inclusive calendar dates.

### Last 3 Months

A rolling calendar-month range ending today.

```text
to   = today
from = same local calendar position 3 months earlier, adjusted safely for month length, then treated as an inclusive range
```

Implementation must use a no-overflow calendar-month operation.

### Last 6 Months

```text
to   = today
from = corresponding no-overflow calendar date 6 months earlier
```

Inclusive range.

### Last 12 Months

```text
to   = today
from = corresponding no-overflow calendar date 12 months earlier
```

Inclusive range.

### Custom Range

```text
from = user-selected business date
to   = user-selected business date
```

Validation:

```text
from <= to
to <= current business date
```

Future forecasting is outside the current Reports scope.

---

# 3. Metric date bases

Not every report should use the same date column.

The metric must be filtered using the date that matches its business meaning.

| Metric area | Preferred date basis | Purpose |
| --- | --- | --- |
| Recognized completed revenue | `completed_at` | Revenue becomes reportable when completion is recorded |
| No-show recognized revenue | `no_show_at` | No-show revenue becomes reportable when no-show is recorded |
| Reservation activity/submission trend | `submitted_at` or authoritative creation timestamp | Measures when reservations entered the system |
| Reservation service/demand trend | `booking_date` | Measures when customers intended to use courts |
| Court utilization | `reservation_slots.reservation_date` / reservation business date | Measures actual court usage by service date |
| Popular times | slot reservation date + start time | Measures demand/usage by day/time |
| Verification time | `submitted_at` to `verified_at` | Measures operational payment-review delay |
| Cancellation operations | `cancelled_at` | Measures when cancellations were performed |
| Rejection operations | `rejected_at` | Measures when rejections were performed |
| Reschedule operations | schedule-history `created_at` | Measures when rescheduling actions occurred |
| Closure operations | closure date for capacity effect; audit timestamp for management activity | Distinguishes business impact from action timing |

A report must label its time basis when there is a reasonable chance of ambiguity.

---

# 4. Recognized revenue

## 4.1 Purpose

Measures revenue that the system can treat as final/reportable under current business rules.

A `VERIFIED` reservation is not automatically recognized revenue because it may still be cancelled, become a no-show, receive extensions, or receive additional charges.

---

## 4.2 Completed reservation revenue

Primary formula:

```text
Completed Reservation Revenue
=
SUM(reservations.final_amount)
WHERE reservations.status = COMPLETED
AND completed_at is inside the selected report range
```

Purpose:

- captures the final business amount after valid slot charges and adjustments
- avoids using the original amount when extensions/add-ons changed the final bill

If current implementation guarantees completion only after outstanding balance is collected, `final_amount` is the reportable completed amount.

If the codebase later allows completed-but-unpaid reservations, this formula must be revised to use actual collected value instead of assuming full collection.

---

## 4.3 No-show recognized revenue

Formula:

```text
No-Show Recognized Revenue
=
SUM(non-refundable amount already collected)
WHERE status = NO_SHOW
AND no_show_at is inside the selected report range
```

Purpose:

Recognizes only money the business is entitled to retain.

Do not recognize unpaid balances.

Do not automatically assume `final_amount` is the retained no-show amount unless current business rules explicitly guarantee that equivalence.

Use the authoritative collected/non-refundable field available in the implemented schema.

---

## 4.4 Total recognized revenue

```text
Recognized Revenue
=
Completed Reservation Revenue
+
No-Show Recognized Revenue
```

Purpose:

Provides the top-level revenue KPI without counting pending or merely verified reservations.

---

# 5. Completed reservation count

Formula:

```text
Completed Reservations
=
COUNT(reservations)
WHERE status = COMPLETED
AND completed_at is inside the selected report range
```

Purpose:

Measures finalized successfully completed reservation transactions.

A reservation containing multiple court slots counts as one reservation.

Do not count each slot as a separate reservation.

---

# 6. Average reservation value

Formula:

```text
Average Reservation Value
=
Completed Reservation Revenue
/
Completed Reservations
```

If:

```text
Completed Reservations = 0
```

return:

```text
null
```

or an explicitly defined empty value, not an invalid division and not a misleading fabricated zero.

Purpose:

Measures the average finalized value of a successfully completed reservation transaction.

No-show retained revenue is excluded because a no-show is not a completed reservation.

---

# 7. Completed court hours

Each normal reservation slot represents one one-hour court period.

Formula:

```text
Completed Court Hours
=
COUNT(reservation_slots belonging to COMPLETED reservations)
```

when every stored slot is exactly one hour.

If variable-duration slots are ever introduced:

```text
Completed Court Hours
=
SUM(slot duration in hours)
```

Purpose:

Measures actual completed court consumption.

A reservation with:

```text
Court 1 / 9–10
Court 2 / 10–11
Court 1 / 1–2
```

contributes:

```text
3 completed court hours
```

Do not count `NO_SHOW` as completed court usage.

---

# 8. Potential operating court hours

## Purpose

Represents theoretical court capacity before subtracting business closures.

Conceptually:

```text
Potential Operating Court Hours
=
sum of scheduled operating one-hour periods
across eligible courts
inside the selected elapsed reporting range
```

For actual historical utilization, only elapsed periods count.

For the current day:

```text
future unelapsed slots are excluded
```

This prevents the current day's morning utilization from being artificially reduced by evening hours that have not happened yet.

---

# 9. Closed / blocked court hours

Formula:

```text
Closed or Blocked Court Hours
=
sum of court-hours removed by:
- full-operation closures
- court-specific closure periods
```

Do not double-count overlapping closure effects.

Example:

If the whole facility is closed 2–4 PM, a court-specific block for Court 1 during the same period must not subtract those same Court 1 hours twice.

Purpose:

Measures capacity that management intentionally made unavailable for sale.

---

# 10. Sellable court hours

Formula:

```text
Sellable Court Hours
=
Potential Operating Court Hours
-
Closed or Blocked Court Hours
```

Purpose:

Represents capacity the business could actually sell.

This is the correct denominator for utilization.

Do not use all theoretical operating hours when closures made some capacity unavailable.

---

# 11. Court utilization

Formula:

```text
Court Utilization %
=
Completed Court Hours
/
Sellable Court Hours
× 100
```

If:

```text
Sellable Court Hours = 0
```

return no percentage / `null`.

Purpose:

Measures actual completed court usage relative to capacity that was genuinely available to customers.

Important rules:

- use completed court usage for actual utilization
- do not count no-shows as actual use
- do not count future unelapsed hours in the denominator
- exclude closures/blocks from sellable capacity
- apply the selected court filter when present

---

# 12. Per-court utilization

For each court:

```text
Court Utilization %
=
Completed Hours for Court
/
Sellable Hours for Court
× 100
```

Purpose:

Allows management to compare Court 1, Court 2, Court 3, etc.

Do not allocate reservation-wide add-on revenue to a court unless the data model explicitly records court ownership.

---

# 13. Operational availability

Formula:

```text
Operational Availability %
=
Sellable Court Hours
/
Potential Operating Court Hours
× 100
```

Purpose:

Measures how much theoretical facility capacity remained open for normal selling.

This is different from utilization.

Example:

```text
Potential hours = 100
Closed/blocked = 10
Sellable = 90
Completed use = 63

Operational Availability = 90%
Court Utilization = 70%
```

Interpretation:

- 90% of theoretical capacity was available to sell
- 70% of sellable capacity was actually used

---

# 14. Reservation source share

Reservation sources:

```text
ONLINE
WALK_IN
```

Formula:

```text
Source Share %
=
Reservations from source
/
All reservations in the same eligible sample
× 100
```

Purpose:

Shows how reservations enter the business.

The report must clearly define whether the selected sample is based on:

```text
submission date
```

or:

```text
booking date
```

Do not mix both bases in the same percentage.

---

# 15. Walk-in share

Formula:

```text
Walk-In Share %
=
Walk-In Reservations
/
All Reservations
× 100
```

Purpose:

Measures the proportion of reservation transactions created by Staff/Manager for customers physically present at the venue.

---

# 16. Reservation outcomes

Final statuses:

```text
COMPLETED
CANCELLED
REJECTED
NO_SHOW
```

Report:

```text
count by final status
```

Purpose:

Shows how reservations ended.

Operational statuses such as `PENDING`, `VERIFIED`, and `ONGOING` should not be mixed into a "final outcomes" chart.

---

# 17. No-show rate

Recommended denominator:

```text
Attendance-Eligible Finalized Reservations
=
COMPLETED
+
NO_SHOW
```

Formula:

```text
No-Show Rate %
=
NO_SHOW
/
(COMPLETED + NO_SHOW)
× 100
```

Purpose:

Measures failure to attend among reservations that reached an attendance outcome.

Exclude:

```text
REJECTED
CANCELLED
```

because those reservations did not reach the same attendance decision point.

If the business later defines a different eligibility rule, update this document before changing code.

---

# 18. Cancellation rate

Recommended denominator:

```text
Accepted Finalized Reservations
=
COMPLETED
+
CANCELLED
+
NO_SHOW
```

Formula:

```text
Cancellation Rate %
=
CANCELLED
/
(COMPLETED + CANCELLED + NO_SHOW)
× 100
```

Purpose:

Measures how often accepted reservations end through cancellation.

Exclude `REJECTED` because rejection occurs before the reservation is accepted/verified.

---

# 19. Rejection count

Formula:

```text
Rejected Reservations
=
COUNT(reservations)
WHERE status = REJECTED
```

Purpose:

Measures submissions that failed payment/reservation acceptance.

For operational analysis, group by normalized rejection concern when a structured concern field exists.

Do not automatically categorize arbitrary free-text reasons.

---

# 20. Rejection rate

Use only when status-history data can reliably identify payment-review decisions.

Recommended denominator:

```text
Decided Online Submissions
=
reservations that reached either:
PENDING → VERIFIED
or
PENDING → REJECTED
```

Formula:

```text
Rejection Rate %
=
Rejected Decisions
/
Decided Online Submissions
× 100
```

Purpose:

Measures payment-review rejection among submissions that received a decision.

Do not include still-pending submissions in the denominator.

---

# 21. Payment verification time

For every successfully verified online reservation:

```text
Verification Duration
=
verified_at - submitted_at
```

Required metrics:

```text
Average Verification Time
Median Verification Time
```

Purpose:

Measures how quickly Staff/Manager review manual payment submissions.

Use only records with both timestamps.

Do not treat unverified pending records as infinite verification times.

---

# 22. Median verification time

Steps:

1. Calculate verification duration for each eligible reservation.
2. Sort durations ascending.
3. Use the middle duration.
4. For an even number of values, average the two middle durations.

Purpose:

Provides a less outlier-sensitive view of typical payment verification speed.

---

# 23. Reschedule rate

Recommended reservation-level formula:

```text
Reservations Rescheduled
=
COUNT(DISTINCT reservation_id with >= 1 schedule history)
```

```text
Reschedule Rate %
=
Reservations Rescheduled
/
Eligible Verified/Finalized Reservations
× 100
```

The exact denominator should remain consistent across the module.

Recommended eligible sample:

```text
reservations that reached VERIFIED
```

identified through current status or status history.

Purpose:

Measures how often accepted reservations required a schedule change.

---

# 24. Total reschedule operations

Formula:

```text
Total Reschedule Operations
=
COUNT(reservation_schedule_histories)
```

Purpose:

Measures workload/actions, not unique reservations.

A reservation rescheduled three times contributes:

```text
1 reservation affected
3 reschedule operations
```

---

# 25. Average reschedules per affected reservation

Formula:

```text
Average Reschedules per Affected Reservation
=
Total Reschedule Operations
/
Reservations Rescheduled
```

Purpose:

Shows how often a rescheduled booking tends to move again.

---

# 26. Extension rate

Reservation-level formula:

```text
Reservations With Extension
=
COUNT(DISTINCT reservation_id having slot_type = EXTENSION)
```

```text
Extension Rate %
=
Reservations With Extension
/
Completed Reservations
× 100
```

Purpose:

Measures how often completed reservations purchased additional court time.

If the business allows extensions that later end in a non-completed state, revise the denominator/sample definition explicitly rather than silently mixing states.

---

# 27. Extension revenue

Formula:

```text
Extension Revenue
=
SUM(rate_amount_snapshot)
for EXTENSION reservation slots
belonging to COMPLETED reservations
recognized in the selected completed-revenue range
```

Purpose:

Separates revenue earned from additional court time after the original booking.

---

# 28. Original reservation slot revenue

Formula:

```text
Original Slot Revenue
=
SUM(rate_amount_snapshot)
for ORIGINAL slots
belonging to COMPLETED reservations
recognized in the selected completed-revenue range
```

Purpose:

Measures base court-booking revenue before extension slots and reservation-wide adjustments.

---

# 29. Adjustment revenue

Formula:

```text
Adjustment Revenue
=
SUM(reservation_adjustments.total_amount)
for adjustments belonging to COMPLETED reservations
recognized in the selected completed-revenue range
```

Possible categories:

```text
ADDITIONAL_PLAYER
ADD_ON
MANUAL
```

Purpose:

Measures completed revenue generated outside original/extension slot charges.

Use the actual implemented adjustment types.

---

# 30. Revenue composition validation

For completed reservations, the following relationship should reconcile:

```text
Completed Final Revenue
≈
Original Slot Revenue
+
Extension Revenue
+
Adjustment Revenue
```

subject to any explicitly modeled refunds, credits, or other adjustments.

Purpose:

Provides a reconciliation check.

Do not force equality by inventing values.

If the system introduces refund/credit fields, the formula must be updated to reflect them.

---

# 31. Popular time usage

For each one-hour start time:

```text
Completed Slot Count at Time
=
COUNT(completed reservation slots grouped by start_time)
```

Purpose:

Shows which one-hour court periods are used most often.

For a demand-oriented version, an explicitly labeled "Booked Demand" metric may instead include accepted reservations/no-shows, but it must not be called actual utilization.

---

# 32. Day-of-week × time heatmap

For each:

```text
day_of_week
+
start_time
```

calculate either:

```text
completed slot count
```

or:

```text
utilization %
```

The UI must label which measure is being shown.

Recommended utilization heatmap:

```text
Heatmap Utilization %
=
Completed court slots for cell
/
Sellable court slots for cell
× 100
```

Purpose:

Shows when demand is strongest while accounting for unavailable capacity.

---

# 33. Day-of-week revenue

Formula:

```text
Day-of-Week Revenue
=
recognized revenue grouped by local day of week
```

Completed revenue uses `completed_at`.

No-show recognized revenue uses `no_show_at`.

Purpose:

Shows which days contribute the most recognized revenue.

---

# 34. Booking lead time

For reservation submissions:

```text
Lead Time
=
booking_date - local calendar date of submitted_at
```

Recommended buckets:

```text
Same day
1–2 days
3–7 days
8+ days
```

Purpose:

Shows how far in advance customers usually reserve.

Negative values should be treated as invalid data and investigated.

---

# 35. Revenue per completed court hour

Recommended formula:

```text
Revenue per Completed Court Hour
=
Completed Slot-Derived Revenue
/
Completed Court Hours
```

Where:

```text
Completed Slot-Derived Revenue
=
Original Slot Revenue + Extension Revenue
```

Purpose:

Measures court-use revenue efficiency.

Do not include reservation-wide additional-player/equipment/manual adjustments in a court-hour metric unless a future business definition explicitly decides to do so.

This avoids attributing non-court revenue to physical court time.

---

# 36. Payment method share

Formula:

```text
Payment Method Share %
=
Eligible reservations/payments using method
/
All eligible reservations/payments
× 100
```

Use the stored payment-method snapshot for historical meaning.

Purpose:

Shows which payment channels customers actually use.

Clearly define whether the report is counting:

```text
reservation payments
```

or:

```text
all payment records including add-on payments
```

Do not mix the two without labeling.

---

# 37. Closure share

Formula:

```text
Closure Share %
=
Closed or Blocked Court Hours
/
Potential Operating Court Hours
× 100
```

Purpose:

Shows how much theoretical facility capacity was intentionally unavailable.

This complements Operational Availability:

```text
Operational Availability %
=
100% - Closure Share %
```

when all removed capacity is represented by the same closure model.

---

# 38. Comparison periods

If percentage comparison is added:

```text
Current Range Length = N calendar days
Previous Comparison Range = immediately preceding N calendar days
```

Example:

```text
Current:
Aug 21–Aug 27

Previous:
Aug 14–Aug 20
```

Formula:

```text
Change %
=
(Current - Previous)
/
Previous
× 100
```

If:

```text
Previous = 0
```

do not show an infinite percentage.

Use a safe label such as:

```text
No prior baseline
```

Purpose:

Provides like-for-like comparison.

---

# 39. Zero and empty-data rules

Do not confuse:

```text
0
```

with:

```text
no eligible data
```

Examples:

- `0 cancellations` is valid data.
- `Average Reservation Value` with zero completed reservations has no valid denominator.
- `Court Utilization` with zero sellable hours has no valid denominator.

For invalid denominators, return `null`/not-applicable metadata and let the UI show:

```text
—
```

or:

```text
No eligible data
```

Do not fabricate `0%`.

---

# 40. Filter consistency

Every metric in one report response must use the same applicable global filters unless explicitly documented.

Global filters:

```text
from
to
court_id
source
```

Examples:

- When `court_id` is set, utilization and slot metrics apply only to that court.
- Reservation-level revenue with a court filter requires careful semantics because one reservation can contain multiple courts.

Recommended court-filter revenue rule:

```text
Court-specific revenue
=
slot-derived revenue for that court only
```

Do not include reservation-wide adjustments in court-specific revenue unless the data model explicitly assigns those adjustments to that court.

If the Overview's recognized revenue is intended to remain reservation-level, hide/disable the court filter for that metric or clearly define a court-attributed revenue variant.

Do not silently double-count one reservation's final amount across multiple courts.

---

# 41. Multi-court reservation rule

One reservation can contain multiple court/time slots.

Therefore:

```text
Reservation Count
```

and:

```text
Court Slot Count
```

are different metrics.

Example:

```text
Reservation RF-125
Court 1 / 9–10
Court 2 / 10–11
Court 1 / 1–2
Court 3 / 6–7
```

equals:

```text
1 reservation
4 court slots
4 court hours
```

Purpose:

Prevents report inflation.

---

# 42. Source filtering and multi-court reporting

`source` belongs to the reservation.

Therefore source filtering can safely apply to:

- reservations
- their slots
- their payments
- their adjustments
- their histories

`court_id` belongs to slots, not the reservation as a whole.

Therefore court filtering must not multiply or duplicate reservation-level totals.

Use slot-level aggregation for court-specific metrics.

---

# 43. Metrics not supported as definitive analytics yet

Do not claim these as authoritative without additional data:

```text
Customer demographics
Marketing attribution
Website conversion rate
True unique customer retention
Customer lifetime value
Net profit
Staff productivity ranking
```

Reasons:

- customer accounts do not exist
- marketing/referral events are not modeled
- website analytics funnel events are not defined
- expenses are not modeled
- audit action volume is not equivalent to staff performance

---

# 44. Repeat reservation identity limitation

The system may group reservations by normalized:

```text
customer_email
customer_contact_number
```

to estimate repeat reservation identity.

However, without customer accounts:

```text
same person may use different details
different people may share details
details may contain input variation
```

Therefore any such metric must be labeled as an estimate, not definitive unique-customer retention.

---

# 45. Data integrity expectations

Reporting depends on business invariants remaining true:

- one active reservation occupancy per court/date/time slot
- reservation slots remain individually trackable
- pricing snapshots survive future rate changes
- final reservation records are preserved
- status history records lifecycle changes
- schedule history records reschedules
- important actions are auditable
- closures are preserved rather than silently deleted

If an implementation change breaks these invariants, report accuracy is affected.

---

# 46. Recommended top-level KPI definitions

## Recognized Revenue

```text
Completed Reservation Revenue
+
No-Show Recognized Revenue
```

Purpose: finalized reportable business revenue.

## Completed Reservations

```text
COUNT(COMPLETED reservations)
```

Purpose: successful finalized reservation transactions.

## Court Utilization

```text
Completed Court Hours
/
Sellable Court Hours
× 100
```

Purpose: actual usage of sellable court capacity.

## Average Reservation Value

```text
Completed Reservation Revenue
/
Completed Reservations
```

Purpose: average finalized completed transaction value.

## No-Show Rate

```text
NO_SHOW
/
(COMPLETED + NO_SHOW)
× 100
```

Purpose: attendance failure among attendance-eligible finalized reservations.

## Cancellation Rate

```text
CANCELLED
/
(COMPLETED + CANCELLED + NO_SHOW)
× 100
```

Purpose: cancellation share among accepted finalized reservation outcomes.

## Walk-In Share

```text
WALK_IN reservations
/
all reservations in sample
× 100
```

Purpose: share of reservations created as walk-ins.

## Operational Availability

```text
Sellable Court Hours
/
Potential Operating Court Hours
× 100
```

Purpose: share of theoretical court capacity left open for sale.

---

# 47. Final rule

When a formula changes because of a new client decision:

1. update the business rule first when applicable
2. update the data model if required
3. update the API contract
4. update this formulas document
5. only then update backend report calculations
6. keep frontend rendering aligned with the API

No metric should have two competing definitions in the project.

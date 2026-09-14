# Dinks on Us — Reports & Analytics Master Implementation Prompt

> Historical implementation brief. The Reports module is implemented. Use
> `REPORTS_ANALYTICS_FORMULAS.md`, `ARCHITECTURE.md`, registered routes, and
> `ReportService` as the current sources of truth.

## Objective

Implement the **Reports & Analytics** module for Dinks on Us using the existing Laravel + Next.js architecture, business rules, data model, API conventions, and project design system.

This is an operational business-intelligence module. It must derive results from the system's existing transactional records and must **not** create manually maintained reporting totals or duplicate reservation state.

Before writing code, inspect the repository and the current project documentation. Existing implementations are the source of truth for architecture, component patterns, naming, API envelopes, query conventions, authorization, date handling, and visual language.

Do not redesign unrelated modules.

---

# 1. Non-negotiable architecture rules

Follow the existing project architecture.

## Backend

Laravel remains authoritative for:

- authentication
- authorization
- validation
- business rules
- reporting calculations
- persistence
- resource serialization
- safe API errors

All report routes must live under:

```text
/api/v1/management/reports
```

All report endpoints require the `REPORTS` module permission.

Frontend navigation visibility is not security. Laravel must reject unauthorized report requests with `403 Forbidden`.

Use the standard API envelope:

```text
success
message
code
data
errors
meta
```

Do not expose raw exception messages, SQL, file paths, stack traces, framework internals, or infrastructure information.

Do not create a reporting table containing duplicated revenue, reservation totals, utilization totals, or similar derived values unless an explicit future performance requirement justifies a materialized reporting strategy.

For this implementation, calculate reports from transactional records.

## Frontend

Next.js owns route composition and interface rendering.

Use:

- `src/app` for route files, loading/error boundaries, and metadata
- `src/views` for complete page implementations
- `services/<domain>` for raw API calls only
- `hooks/queries` for reads
- centralized hierarchical query keys in `config/query-keys.ts`
- `authFetch` for browser management API calls
- TanStack Query for server state

Do not use raw `fetch` in components.

Do not introduce Zustand.

Do not duplicate report API results into component-level shadow caches.

---

# 2. Required repository audit before implementation

Before coding:

1. Inspect the current Reports route/navigation state.
2. Inspect the existing `PortalMetricCard`.
3. Inspect the Team & Access management table shell.
4. Inspect `CalendarDatePicker`.
5. Inspect `SelectWithLabel`.
6. Inspect current query-key conventions.
7. Inspect current API service and TanStack Query patterns.
8. Inspect current authorization/module registry for `REPORTS`.
9. Inspect whether a chart library already exists.
10. Inspect current reservation, slot, payment, adjustment, closure, status-history, and schedule-history schema/model fields.
11. Inspect the project's date helpers and Asia/Manila business-time handling.
12. Inspect `REPORTS_ANALYTICS_FORMULAS.md` and treat its formulas as the reporting contract.

Do not invent missing fields silently.

If a requested metric cannot be calculated reliably from the current schema, either:

- derive it from existing authoritative records, or
- document the missing data requirement and omit the metric until the data exists.

Do not create fake analytics.

---

# 3. Reports page structure

Create one main Reports & Analytics page rather than many sidebar pages.

Recommended route:

```text
/portal/reports
```

Use tabs inside the page:

```text
Overview
Revenue
Reservations
Courts & Time
Operations
```

Do not create a separate sidebar item for every report.

The page must remain compact, operational, responsive, accessible, and consistent with existing portal screens.

---

# 4. Global report filters

All report tabs use one shared global filter row.

Required filters:

```text
Date Range
Court
Source
```

## Date Range options

Use exactly:

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

Do not use labels such as:

```text
This Week
This Month
This Year
Last Month
```

The preset ranges are rolling ranges ending today.

The frontend resolves every preset into explicit `from` and `to` values before calling Laravel.

Example:

```text
Last 7 Days
from=2026-08-21
to=2026-08-27
```

Laravel receives explicit dates and does not need separate business logic for `last_7_days`, `last_3_months`, etc.

Display the resolved period near the filter:

```text
Aug 21 – Aug 27, 2026
```

## Custom Range

When `Custom Range` is selected, show:

```text
From
To
Apply
```

Use the existing `CalendarDatePicker`.

Do not create another date-picker component.

Custom analytics ranges should not extend beyond the current business date unless the current product requirements explicitly introduce forecast/future-capacity reporting.

Validate:

```text
from <= to
```

Use the Dinks on Us business timezone.

## Court filter

Use:

```text
All Courts
Court 1
Court 2
Court 3
...
```

Only use actual court records returned by the backend.

## Source filter

Use:

```text
All Sources
Online
Walk-In
```

Use `SelectWithLabel` for the range, court, and source controls.

Shared text/select/date controls remain `h-10`.

Changing any global report filter must refresh every metric and visualization in the active report tab consistently.

Do not give individual cards or charts conflicting date-range selectors unless a future product decision explicitly requires it.

---

# 5. Backend date-range interpretation

Use a dedicated FormRequest for report filters.

Recommended reusable request:

```text
ReportFilterRequest
```

Validate and normalize:

```text
from: Y-m-d
to: Y-m-d
court_id: nullable valid court
source: nullable ONLINE|WALK_IN
```

Additional report-specific filters such as `group_by` must use explicit allowlists.

Never pass arbitrary user-provided database columns into `orderBy`.

Use business-date semantics for reservation dates and Asia/Manila semantics where timestamps need to be grouped into local reporting dates.

---

# 6. API endpoints

Use these report endpoints:

```text
GET /api/v1/management/reports/overview
GET /api/v1/management/reports/revenue
GET /api/v1/management/reports/reservations
GET /api/v1/management/reports/court-utilization
GET /api/v1/management/reports/popular-times
GET /api/v1/management/reports/payments
GET /api/v1/management/reports/operations
```

Do not create one endpoint per KPI card.

Prefer one coherent response per report tab/area.

If the existing API specification already contains a subset of these endpoints, extend it rather than creating competing conventions.

Example request:

```text
GET /api/v1/management/reports/overview
    ?from=2026-08-21
    &to=2026-08-27
    &court_id=1
    &source=ONLINE
```

---

# 7. Overview tab

The Overview tab answers:

```text
How is the business performing overall?
```

Use `PortalMetricCard`.

Required KPI cards:

```text
Recognized Revenue
Completed Reservations
Court Utilization
Average Reservation Value
```

Secondary metrics may include:

```text
Completed Court Hours
No-Show Rate
Cancellation Rate
Walk-In Share
```

Do not overload the first viewport with too many equal-emphasis cards.

Recommended visual sections:

1. KPI summary
2. Revenue trend
3. Court utilization comparison
4. Reservation source breakdown
5. Popular-time summary or compact heatmap
6. Reservation outcomes

---

# 8. Revenue tab

The Revenue tab answers:

```text
How much money are we actually earning, and where does it come from?
```

Required metrics:

```text
Recognized Revenue
Completed Reservation Revenue
No-Show Recognized Revenue
Average Reservation Value
```

Required visualizations:

## Revenue trend

Support:

```text
day
week
month
```

The backend chooses or validates grouping.

Do not calculate authoritative report totals in the browser.

## Revenue composition

Break down, when supported by current records:

```text
Original reservation slot revenue
Extension slot revenue
Additional-player revenue
Rental-equipment/add-on revenue
Other adjustment revenue
No-show recognized revenue
```

Do not allocate reservation-wide adjustments to individual courts unless the data model explicitly records such ownership.

## Revenue comparison

When a comparison period is implemented, use a like-for-like immediately preceding range with the same duration.

Do not introduce comparison percentages unless both periods are complete and denominator rules are clear.

---

# 9. Reservations tab

The Reservations tab answers:

```text
How are reservations behaving?
```

Required sections:

## Reservation outcomes

Show counts for finalized outcomes:

```text
Completed
Cancelled
Rejected
No-Show
```

## Reservation trend

Show reservation activity over the selected range.

Clearly label whether the trend is based on:

```text
submitted/created date
```

or:

```text
booking/service date
```

Use the formula contract in `REPORTS_ANALYTICS_FORMULAS.md`.

Do not mix date bases inside one visualization without explicit labeling.

## Reservation source

Compare:

```text
Online
Walk-In
```

Possible metrics:

```text
reservation count
completed count
recognized/completed revenue where appropriate
average completed reservation value
no-show count/rate
```

Do not imply source causation from correlation.

---

# 10. Courts & Time tab

The Courts & Time tab answers:

```text
Which courts are being used, and when?
```

## Court utilization

Required per-court values:

```text
Completed court hours
Sellable court hours
Utilization %
```

Use the formula contract.

Do not count future unelapsed hours in the denominator for actual utilization.

Do not count `NO_SHOW` as actual completed court usage.

## Popular time heatmap

Display:

```text
Day of week × one-hour time slot
```

Use reservation-slot data.

Each heatmap cell must expose the numeric value through visible text, tooltip, accessible label, or an accessible table alternative.

Color must not be the only carrier of meaning.

## Day-of-week performance

Allow compact comparison of:

```text
completed reservations
completed court hours
revenue
utilization
```

## Revenue per court hour

If shown:

```text
slot-derived completed revenue
/
completed court hours
```

Do not assign reservation-wide add-ons to a court unless ownership is explicitly stored.

---

# 11. Operations tab

The Operations tab answers:

```text
Where are operational problems or delays happening?
```

Required analytics when supported:

```text
No-show count and rate
Cancellation count and rate
Rejected reservation count
Payment verification time
Reschedule count/rate
Extension count/rate
Closure/block hours
Operational availability
```

## Payment verification time

Use:

```text
verified_at - submitted_at
```

Provide:

```text
average
median
```

Optionally show a percentile only if implemented correctly.

Do not display misleading averages when the selected sample is empty.

## Rejection reasons

Use normalized/system-defined rejection concerns where available.

If reasons are only free text, do not pretend they form reliable categories.

## Cancellation reasons

Same rule:

- categorical analytics require normalized categories
- free-text reasons may be shown in detail/history but should not be automatically grouped into fake categories

## Rescheduling

Possible metrics:

```text
reservations affected by rescheduling
total reschedule operations
average reschedules per affected reservation
```

## Closures

Possible metrics:

```text
potential operating court hours
closed/blocked court hours
sellable court hours
operational availability %
```

---

# 12. Formula authority

All report formulas and denominator definitions must follow:

```text
REPORTS_ANALYTICS_FORMULAS.md
```

Do not recreate different formulas independently in:

- controllers
- frontend components
- chart utilities
- KPI components

Backend calculations are authoritative.

Frontend receives already calculated values and renders them.

Where reasonable, centralize substantial aggregation logic in focused report query/service classes.

Reports are sufficiently query-heavy that a dedicated aggregation service/query layer may be justified.

Do not introduce repositories merely for ceremony.

---

# 13. Revenue recognition rules

Do not count a merely `VERIFIED` reservation as recognized revenue.

Primary recognized business revenue comes from:

```text
Completed reservations
→ completed final amount

No-show reservations
→ non-refundable amount already collected
```

Pending and verified reservations are operational commitments, not automatically final recognized revenue.

Cancelled and rejected reservations do not contribute recognized revenue except for explicitly retained/non-refundable amounts defined by the business rules.

Do not infer refund accounting beyond stored authoritative values.

---

# 14. Query implementation rules

Use efficient aggregate queries.

Avoid N+1 queries.

Use indexes that align with report filters/grouping, especially around:

```text
reservations.status
reservations.source
reservations.booking_date
reservations.completed_at
reservations.created_at/submitted_at
reservation_slots.reservation_id
reservation_slots.court_id
reservation_slots.reservation_date
reservation_slots.start_time
reservation_payments.reservation_id
availability_closures.date
```

Before adding a new index, inspect existing migrations.

Do not add duplicate indexes.

For multi-filter reports, inspect query plans where practical.

---

# 15. Frontend query architecture

Add hierarchical report query keys.

Example shape:

```ts
reports: {
  all: ["reports"],
  overview: (filters) => ["reports", "overview", filters],
  revenue: (filters) => ["reports", "revenue", filters],
  reservations: (filters) => ["reports", "reservations", filters],
  courtUtilization: (filters) => ["reports", "court-utilization", filters],
  popularTimes: (filters) => ["reports", "popular-times", filters],
  payments: (filters) => ["reports", "payments", filters],
  operations: (filters) => ["reports", "operations", filters],
}
```

Use normalized filters.

Query functions forward abort signals.

Choose reasonable stale times for historical analytics.

Do not use optimistic updates because reports are read-only.

---

# 16. Services

Create a focused report service only for raw API calls.

Example:

```text
services/reports/reports-service.ts
```

Possible named functions:

```text
getReportsOverview
getRevenueReport
getReservationReport
getCourtUtilizationReport
getPopularTimesReport
getPaymentReport
getOperationsReport
```

Services must not contain:

- React state
- chart transformations tied to UI rendering
- toasts
- routing
- query cache logic

---

# 17. Charts

First inspect the current dependencies.

If a chart library already exists, reuse it.

If no chart library exists, add one only if justified by the required visualizations. Prefer a mature React-compatible library and avoid creating a home-grown chart system.

Charts must:

- work in light and dark mode
- use the project's approved semantic/brand chart palette
- include labels or accessible alternatives
- never communicate state only through color
- have useful empty states
- be responsive
- avoid excessive decoration
- use compact portal spacing

Recommended visual types:

```text
Revenue trend → line or bar
Court utilization → horizontal bars
Reservation sources → donut or horizontal bars
Reservation outcomes → stacked/segmented bar or donut
Popular times → heatmap
Revenue breakdown → bar or compact stacked treatment
```

Do not use 3D charts.

Do not use decorative gradients that reduce readability.

---

# 18. UI design requirements

Follow `PROJECT_DESIGN.md` and the reusable design system.

The portal remains compact and operational.

Use:

- existing page-header spacing
- `PortalMetricCard`
- Team & Access table shell where a table is needed
- `CalendarDatePicker`
- `SelectWithLabel`
- existing shadcn primitives
- React Icons `fi` for application semantics

Do not create a competing card, select, date-picker, or table visual language.

Desktop:

- filters should fit on one compact row when space permits
- charts should use content-driven heights
- avoid oversized empty regions

Mobile:

- stack filters
- preserve clear selected range
- charts must not force horizontal page scrolling
- heatmap may use a responsive scroll container only when necessary and must remain understandable
- touch targets remain practical

---

# 19. Loading, empty, and error states

Use contextual loading language such as:

```text
Loading revenue analytics…
Loading court utilization…
Loading reservation analytics…
```

Empty states should explain:

```text
No reportable data exists for this range.
```

Do not show a chart with fabricated zeros if there were no eligible records.

API/server failures use the existing safe global error treatment.

Read-only report requests should not generate noisy success toasts.

---

# 20. Accessibility

Required:

- semantic headings
- keyboard-operable filters/tabs
- visible focus
- accessible chart labels or table alternatives
- sufficient contrast
- no state conveyed by color alone
- clear empty/loading/error text
- screen-reader names for unlabeled compact controls
- proper `aria-selected`/tab semantics
- meaningful numeric labels

---

# 21. Testing requirements

## Backend feature tests

Cover:

1. authenticated user with `REPORTS` access succeeds
2. guest receives `401`
3. authenticated user without `REPORTS` receives `403`
4. invalid date range receives `422`
5. invalid source receives `422`
6. invalid court receives `422`
7. recognized revenue uses only eligible completed/no-show amounts
8. verified reservations are not automatically recognized as revenue
9. average reservation value handles zero completed reservations
10. no-show rate denominator is correct
11. cancellation rate denominator is correct
12. source filter works
13. court filter works
14. custom date range works
15. utilization excludes closures/blocks from sellable capacity
16. utilization does not count future unelapsed hours
17. no-show does not count as completed usage
18. popular-time aggregation groups correct one-hour slots
19. Asia/Manila date boundaries are correct
20. report responses use the standard API envelope

## Frontend tests where current project practice supports them

Cover:

1. default range is `Last 7 Days`
2. preset converts to correct `from`/`to`
3. custom range uses `CalendarDatePicker`
4. invalid custom range cannot apply
5. changing range/court/source changes query keys
6. loading/empty/error states render
7. tabs are keyboard accessible
8. resolved date range is displayed
9. no report values are calculated authoritatively in the component

---

# 22. Data-quality guardrails

Do not claim analytics the current data cannot support.

Do not implement these as definitive metrics unless the required data is explicitly tracked:

```text
customer demographics
marketing attribution
website-to-reservation conversion
true customer lifetime value
profit/net income
staff productivity ranking
```

Customer email/contact may suggest repeat reservation identity, but without customer accounts it must not be presented as guaranteed unique-customer identity.

---

# 23. Documentation updates

Update project documentation only where behavior is genuinely introduced.

At minimum:

1. Add/maintain `REPORTS_ANALYTICS_FORMULAS.md`.
2. Update API documentation for newly added report endpoints.
3. Update architecture docs only if a new shared report-query/service pattern is introduced.
4. Update business/data-model docs only if implementation requires a real business-rule or schema change.

Do not rewrite unrelated documentation.

---

# 24. Implementation phases

## Phase 0 — Audit

- inspect codebase
- inspect schemas/models
- inspect permissions
- inspect report-related docs
- inspect chart dependencies
- identify any formula/data gaps
- report planned files before implementation

## Phase 1 — Reporting foundation

- reusable `ReportFilterRequest`
- date-range/filter normalization
- `REPORTS` authorization
- report query/service foundation only if justified
- overview endpoint
- backend tests

## Phase 2 — Overview UI

- `/portal/reports`
- global filter bar
- default Last 7 Days
- custom range
- KPI cards
- overview query/service/hooks
- loading/error/empty states

## Phase 3 — Revenue and Reservations

- revenue endpoint/UI
- reservation endpoint/UI
- trend/grouping
- source/outcome breakdowns
- tests

## Phase 4 — Courts & Time

- utilization endpoint/UI
- sellable-hour calculation
- popular-time heatmap
- day-of-week analytics
- tests

## Phase 5 — Operations

- payment verification analytics
- no-show/cancellation/rejection analytics
- reschedule/extension metrics
- closure/operational-availability metrics
- tests

## Phase 6 — Hardening

- query efficiency review
- indexes only where justified
- accessibility review
- responsive review
- light/dark review
- empty-state review
- timezone boundary tests
- documentation sync

---

# 25. Completion criteria

The module is complete only when:

- all reports derive from authoritative transactional records
- no duplicate reporting totals are manually maintained
- `REPORTS` authorization works server-side
- Last 7 Days is the default range
- all presets resolve to explicit `from` and `to`
- Custom Range uses the existing date picker
- date/court/source filters refresh the active report consistently
- formulas match `REPORTS_ANALYTICS_FORMULAS.md`
- revenue recognition does not count verified reservations prematurely
- utilization uses sellable elapsed capacity correctly
- chart and KPI states are accessible
- UI matches existing portal components
- mobile layouts remain usable
- API and feature tests pass
- documentation is synchronized
- no unrelated architecture or visual refactor is introduced

---

# 26. Agent behavior

Do not hallucinate files, fields, components, routes, or packages.

Inspect before changing.

If the current codebase conflicts with this prompt:

1. identify the conflict
2. preserve authoritative business rules
3. make the smallest justified implementation change
4. update the appropriate documentation when behavior truly changes

Do not silently invent a business decision.

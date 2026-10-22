# Architecture

## Responsibilities

Laravel is authoritative for authentication, authorization, validation, persistence, resource serialization, and safe API errors. Next.js owns routing and interface composition. TanStack Query owns browser server state; React Hook Form owns temporary form state; Zod provides immediate client feedback but never replaces FormRequests.

The request path is: form → Zod → mutation hook → service → `publicFetch`/`authFetch` → `/api/v1` → Sanctum → FormRequest → controller → model → API Resource → `ApiResponse` envelope.

Public reservation submission accepts an `Idempotency-Key`. The key is stored
with a database uniqueness constraint so a browser retry returns the original
reservation instead of creating another slot lock or payment. Management
reservation badges use a dedicated aggregate summary endpoint rather than
polling the paginated reservation collection.

## Backend

Routes are versioned under `/api/v1`. Controllers are focused and use `app/Traits/ApiResponse.php`; resources shape entities. Input requests normalize only intentional fields and persist `validated()`/`safe()` data. Names and emails may be normalized; passwords, tokens, identifiers, JSON, signatures, code, and rich text must not be globally transformed.

Query-heavy report aggregation belongs in `ReportService`, which is the backend
authority for report formulas, date bases, filter semantics, and capacity
calculations. Report controllers remain transport-only and return the standard
API envelope. Reports are derived from transactional records; they do not store
parallel manually maintained totals.

API responses always contain `success`, `message`, `code`, `data`, `errors`, and `meta`, except a true HTTP 204, which has no body. Human messages are safe and nontechnical. Never expose SQL, paths, exception classes, stack traces, secrets, framework internals, or infrastructure. Log technical context server-side.

Sanctum uses first-party SPA session cookies, CSRF protection, stateful domains, CORS credentials, and the `web` guard. The frontend and API must share a top-level domain in production. Public registration and password recovery are disabled; authenticated management accounts are provisioned by the system and belong to one role. The system Manager role is seeded for local development and is the highest operational role defined by the business rules.

The login page refreshes the current-session query before showing credentials and
replaces `/login` with `/portal` for an active session. The login API remains JSON
for both guests and existing sessions; it must not use Laravel's HTML-redirecting
`guest` middleware. Repeated login submissions return the active session's user
without switching accounts or repeating login side effects. Inactive sessions
are logged out and rejected; guests still require validated credentials.

Security controls are layered rather than controller-specific. Named rate
limiters cover public, authenticated, login, submission, upload, report,
private-file, and destructive traffic. Password rules are centralized at an
8-character minimum and Argon2id is the hashing default. Privileged identity and
access changes require current-password confirmation, invalidate affected
database sessions, and emit safe audit records. MFA is intentionally outside the
current project scope. The detailed boundary is documented in
`docs/security/SECURITY_BASELINE.md` and `docs/security/THREAT_MODEL.md`.

Session revocation also rotates remember-me tokens, including bulk role changes,
so deleting database sessions cannot be bypassed by restoring an older remembered
login. Login failures produce credential-free audit events. Hostnames are exact
allowlisted values; host/proxy middleware reads cached configuration after
bootstrap, and only configured proxies may supply client-IP/scheme headers.

## Frontend

`src/app` contains route files, layouts, loading/error boundaries, and metadata. Complete pages live in `src/views`. Complete forms live in `src/forms/<domain>`; reusable accessible controls live in `src/components/common/forms`. Use `SelectWithLabel` for labeled select fields and filters; it composes the low-level select primitive in `components/ui`. shadcn primitives remain under `components/ui`.

Existing module implementations are the visual and interaction references for
later modules. Before adding a repeated pattern, inspect the established portal
components and views, then reuse or extend them. In particular, use the shared
portal metric card for KPI summaries, the Team & Access management table shell
for portal data tables, and `CalendarDatePicker` for management date fields.
Avoid parallel module-specific versions of an existing component unless the
variation is intentionally documented.

Services contain API calls only. Query/mutation hooks add caching and invalidation. Query keys are centralized and hierarchical. Components must not call raw `fetch`; browser requests use `lib/api.ts` through the same-origin `/backend` Next.js rewrite, keeping Sanctum cookies first-party in installed web apps. Server-only reads use `lib/server-api.ts`, forward relevant cookies only when needed, and explicitly choose cache behavior. Public content pages preload their indexable API data in Server Components and pass it into interactive client views as query `initialData`. Browser CSRF logic must never be imported into Server Components.

API mutation result messages are presented by the shared TanStack Query mutation cache through the global bottom-right Sonner toast provider. Forms must not duplicate success, error, warning, or informational results inline. Zod validation stays beside its control; API validation and other action results remain in toasts rather than being mapped back into dialog fields.

`authFetch` dispatches `auth:unauthorized` and normalizes 401, 403, 404, 409, 422, 429, 500, network failures, and 204 responses. Do not duplicate query data in a client store. Zustand is intentionally absent.

Login/logout cancels in-flight reads and clears the query and mutation caches
before retaining the new current user. A 401 clears private caches and hides portal
content while redirecting to login. CSRF initialization is shared only while in
flight; an existing token cookie is reused, and a 419 renews the token and retries
the same submission once. Network failures are not automatically replayed.

The root `PwaProvider` registers the push-only service worker and invalidates
reservation queries when a push arrives. The service worker never caches
private API responses and notification clicks are constrained to the app origin.
Device subscriptions are persisted through authenticated
management endpoints, and push delivery is a post-commit side effect on the
durable `push` queue. Endpoint validation restricts outbound requests to supported
browser push providers, rechecks saved endpoints, and disables redirects.
Each device has independent retries; a transient failure must not permanently
exclude the device. Reservation status emails use encrypted jobs on the `mail`
queue with an event-time reservation snapshot. Both queues need a worker when
enabled; OTP delivery remains synchronous.

The frontend proxy at `frontend/src/proxy.ts` lives beside `src/app` so Next.js
discovers it. It creates a per-request CSP nonce and sends the same policy to
Next.js rendering and the browser. The root layout passes the nonce to the theme
provider so its initialization script is permitted by the policy. Images may load
from the configured public API origin (`NEXT_PUBLIC_API_URL`, falling back to
`API_URL`) to support uploads when the API uses a different origin. Security
headers are also configured for all frontend routes. Keep external resource
origins narrow when a deployment adds a provider; do not weaken the policy
globally for one component.

Public SEO uses the App Router metadata APIs, a canonical URL from
`NEXT_PUBLIC_APP_URL`, generated Open Graph images, `robots.ts`, and
`sitemap.ts`. Browser tab titles are always exactly `Dinks on Us`, without a
page-name template or suffix. Public pages retain distinct descriptions,
canonicals, and social-preview titles;
login, verification, checkout, and portal routes must be `noindex`. Structured
data is limited to verified business details that also appear visibly on the site.

## Validation schemas

Laravel FormRequests remain authoritative. Client-side Zod schemas live in `frontend/src/validation/custom` and provide immediate feedback only; they must stay aligned with their corresponding FormRequests. Password-bearing schemas remain handwritten so passwords are never trimmed or otherwise transformed.

## Dates, lists, and names

API timestamps are UTC ISO 8601. Use `lib/date.ts` to display timestamps. Keep date-only values as calendar dates rather than timezone-shifting them. Business-day boundaries use `App\Support\BusinessClock` and `BUSINESS_TIMEZONE` (Asia/Manila by default); do not derive reservation or closure dates from the UTC application clock.

Dynamic court pricing uses the configured `weekday_rates` for Monday through
Thursday and `weekend_rates` for Friday through Sunday. The shared day-type rule
is applied by both court availability previews and final reservation pricing.

Future collection endpoints default to `per_page=10`, allow 10/25/50/100, and cap at 100. Search/filter/sort values require module-specific allowlists; never pass unrestricted sort columns to `orderBy`.

Starting a reservation checks the locked current booking date against
`BusinessClock::today()` after status/revision validation and before any writes.
It does not compare start/end hours. A committed idempotent retry is recovered
before this check, preserving an earlier successful start across midnight.
The Reservations action menu mirrors the calendar-date condition using the
shared Philippine-date helper; the backend remains authoritative.

The operational reservation list sorts on the server before pagination using
`BusinessClock`: unresolved elapsed bookings first, oldest date and end time
first, then current court slots, followed by the next upcoming slots. Only current
schedule slots count, including add-ons; finalized records stay in History. The
open table refreshes every minute and on window focus so ordering follows the
business clock without a manual reload.
If finalizing a booking removes the current page, the Reservations view returns
to the last available page after receiving the updated pagination metadata.

Laravel classes use PascalCase, methods camelCase, tables plural snake_case, columns and foreign keys snake_case. Next.js files use kebab-case, components PascalCase, and hooks `useX`. Use SCREAMING_SNAKE_CASE only for true primitives.

## Portal and future modules

The portal uses a collapsible desktop sidebar and mobile sheet. Navigation is centralized. The account menu owns Profile, an in-place light/dark mode control, and Logout. Profile and self-service credential changes are restricted to the full-access Manager role. Team accounts cannot open Profile or read/update the profile and password API endpoints; authorized Team & Access management remains responsible for their account details and password resets. Both navigation visibility and backend authorization use the authenticated account's assigned role and module access.

Future modules create only needed pieces. Simple CRUD does not justify repositories, actions, or service layers automatically. Use transactions for multi-write invariants, eager load serialized relations, add indexes from query patterns, enforce important uniqueness in validation and the database, and choose delete behavior intentionally.

Payment-proof file lifecycle operations use focused backend services because
storage mechanics and cleanup orchestration have different responsibilities. A
proof-storage service owns optimization, generated paths, private storage,
existence, size, and deletion mechanics. A retention service owns eligible
queries, chunking, lifecycle metadata, result summaries, and audit orchestration.
Manual cleanup must revalidate eligible finalized reservations server-side,
remove only private proof files, clear only proof lifecycle fields, and write a
summarized audit entry. Controllers remain transport-only. Filesystem deletion
failures must retain the corresponding database path for a later retry; they
must not delete or roll back reservation or payment business records. No
scheduler or automatic retention process is part of this workflow.

All accepted image uploads use the shared optimized-image service. Validation
checks decoded content, MIME, extension, bytes, and dimensions; storage then
decodes and re-encodes a bounded WebP under a generated UUID path. Original
filenames and image bytes are never served as trusted content.

Prohibited patterns include raw exception messages, localStorage authentication, arbitrary HTML rendering, scattered `toLocaleString`, scattered fetch calls, duplicated server caches, giant configurable controls, premature business roles, and hard-coded deployment assumptions.

Public checkout stores only the last successfully submitted customer's name,
email, and mobile number in browser localStorage for later prefill. This is
untrusted convenience data, not authentication or server state; checkout
validation and server submission remain authoritative. Customers can clear the
saved details in checkout. Payment data and reservation drafts are not stored
with these contact details.

## Guest checkout email verification

Public checkout verifies inbox access in the customer-information section before
unlocking payment instructions and proof fields. Guest players never become
management users. The browser holds a cryptographically random checkout key only
in memory; the backend stores its SHA-256 digest and binds it to the normalized
email. It is a narrow checkout capability, not an authenticated account session.
OTP codes use keyed HMAC digests, expire after 10 minutes, allow at most five
incorrect attempts, and are replaced on resend after a 60-second cooldown. Named
limiters also bound email/IP sending and checkout/IP verification traffic.

A successful code check grants 30 minutes to submit that checkout. Submission
validates the grant before storing proof and locks/rechecks it in the existing
reservation transaction. It records `customer_email_verified_at` separately from
staff payment approval and consumes the grant only on a successful reservation.
Rollback keeps verification usable. Interrupted checkout submissions expose a retry
action even when refreshed availability shows those slots as reserved, so a lost
response can recover the original booking. Committed idempotent retries must present the
original checkout key and email; they remain recoverable after grant expiry.

Frontend verification uses a focused service and rate-limited mutation hook.
Changing email requires verification again, preserving entered payment evidence.
Refreshing the page starts another verification; saved contact details never
contain codes, checkout keys, or verified state. Availability/pricing refresh after
verification, and final submission remains the only court/equipment hold.

OTP email is synchronous and mandatory, independent of optional reservation-status
notifications. Real delivery must be configured outside local/test environments;
non-delivering log/array transports, including fallbacks, are rejected safely.
The verification row/cooldown commits before sending; SMTP runs outside database
locks, with a bounded timeout and conditional invalidation on failure. No
verification scheduler, player account, or new reservation status is introduced.
Delivery failures return `Retry-After` for the remaining resend cooldown. Checkout
honors that delay immediately after the failure; it never automatically replays
the send. Send-limit responses explain the wait rather than using the generic
traffic-limit message. These controls do not establish successful SMTP delivery.

Booking and closure checks use locking current reads after court locks so MySQL
REPEATABLE READ snapshots cannot hide a committed closure or slot lock. Court-time
closures acquire configuration before courts, matching booking lock order.
Reports reject ranges longer than 366 inclusive days. Manual proof cleanup rejects
more than 1,000 eligible records before inspecting or deleting files.

## Rental equipment availability

`EquipmentAvailabilityService` is the shared authority for time-based rental
inventory. `rental_equipment.total_quantity` currently represents usable stock;
there is no damaged/maintenance stock model. `usableStock()` is the extension
point if those concepts are introduced. Availability is derived, never stored as
an incrementing/decrementing counter.

Active `reservation_equipment_items` consume shared stock across all courts while
the reservation is `PENDING`, `VERIFIED`, or `ONGOING`. Final statuses release the
allocation. Equipment occupies each actual current one-hour slot as `[start, end)`;
a booking ending at noon does not block noon onward. Non-consecutive hours do not
occupy the gap. A reservation's quantity applies once per occupied hour, even when
it books several courts simultaneously. Original and add-on quantities are summed
and apply to all current booked hours. Reservation-wide equipment pricing remains
quantity × captured unit price.

Public options return server-calculated `slot_availability` per equipment item
for the requested date, plus `available_quantity` for the optional selected
`hours[]`, without customer/allocation details. The booking and staff
forms use the minimum for the actual selected hours, disable exhausted equipment,
and clamp quantities when limits fall. Missing hourly data permits zero units.
Options refresh on date/hour changes, window focus, and every 30 seconds. While
refreshing hours on the same date, limits recalculate immediately from the last
hourly snapshot; data from a different date is never reused. Preview
availability is advisory; successful submission holds equipment immediately,
including during payment verification.

Checkout rebuilds slot, equipment, and additional-player prices from the latest
reservation options. It sends the displayed total as `quoted_amount`; the backend
recalculates under the booking transaction and rejects a changed quote before it
creates a reservation or payment record.

Submission, walk-in creation, verification, rescheduling, and add-ons use the same
transactional check. The existing reservation service owns transaction boundaries;
equipment rows are locked in ID order and allocations are re-read with a locking
join before committing. This current read is essential under MySQL REPEATABLE READ:
a transaction that waited for inventory must see bookings committed after its
initial snapshot. Queries include only relevant equipment, dates, current hours,
and blocking statuses; existing equipment and reservation-slot indexes are reused.
A conflict rolls back slots, allocations, prices, and payment records together.
Staff-assisted bookings use the existing walk-in flow; no separate booking source
or inventory table has been introduced.
Public reservation options omit slots beyond the configured online booking window.
The reservation-module management options endpoint uses the same availability
service and returns those slots for walk-ins, reschedules, and add-ons, which are
not subject to that online limit.

Rescheduling replaces every current court slot on a single new booking date,
including all previous court add-ons. Replacement count equals the current slot
count, and every court/hour is selectable. Old rows remain historical; replacement
rows are `RESCHEDULED` and genuinely new slots are `ADD_ON`. The price difference
uses the total price of all current slots, while existing players, equipment,
payments, and adjustment records carry forward. New add-ons are charged once and
the resulting balance is compared with payments minus completed refunds. A
lower total requires the exact reviewed refund and an explicit settlement
acknowledgment; a completed refund is written inside the schedule transaction.
Recalculation reads refund rows under locks so refunded money cannot be reused.
Gross payment records remain unchanged. Replacement request limits
accommodate the current slot count even when repeated purchases exceed 48 slots;
each new add-on request remains capped at 48.

Reschedule, add-on, completion, and cancellation dialogs wait for a successful
detail fetch after opening. Rescheduling defaults its replacement date to today
in Asia/Manila on each opening, prefills the current court/hour choices, and shows
the existing booking date, current total, and cumulative amount paid as the baseline.
Financial mutations use a hook-level committed callback to close their dialogs
before seeding details can remount an editing form or invalidate its status. Closing does not depend on per-call callbacks surviving that remount or wait
for unrelated query refreshes.
Reservation action hooks seed the detail cache from the successful response and
await reservation, dashboard, history, report, action-log, and availability
invalidation before completing. Active queries are refetched; inactive queries
are marked stale. Detail
summaries show the whole current booking; recorded add-on charges and payments
retain their historical amounts instead of being treated as fixed schedule slots.

Run `php tests/Integration/equipment-concurrency.php` from `backend` to test
simultaneous submissions, closure conflicts, staff retries, and revision conflicts
on MySQL, including stale transaction snapshots. Its default mode creates/drops a
random isolated database and requires database-creation privileges. The explicit
`--table-prefix` fallback refuses non-local/non-testing environments, remote hosts,
connection URLs, and pre-existing prefixes. It migrates only randomly named test
tables in the configured local schema, hashes test constraint names to fit MySQL
limits, stops workers, drops only those tables, and checks that application user
and reservation counts are unchanged. It never migrates existing application
tables. Normal feature tests still use SQLite.

### Staff reservation review consistency

Staff forms send the reviewed `quoted_amount` and (where applicable)
`quoted_payment_amount`; cancellation sends `quoted_refund_amount`. The service
compares these to authoritative amounts inside the existing reservation/pricing
transaction. A mismatch returns `409 RESERVATION_REVIEW_CHANGED` and rolls back
all tentative writes. The shared mutation hook refreshes details and options;
changed detail data remounts the form and discards any old confirmation. Legacy clients without a retry header retain their earlier contract. Current
staff hooks send `Idempotency-Key`; financial actions using it require reviewed
amounts and `expected_revision` (walk-ins require the amount but have no prior
revision). The locked reservation revision also rejects same-price stale edits.

Each new schedule history records its own `payment_amount` and `refund_amount`
(including zero).
Status-mail snapshots eagerly include this history. Reschedule emails never
infer the current operation's charge or refund from an earlier record or timestamp.
`amounts.paid` remains gross collected; `amounts.refunded` totals completed refunds
and `amounts.net_paid` is the amount still held. Cancellation caps, future charges,
and no-show revenue use net funds; completed revenue remains the final charge.
No cash transfer occurs automatically.
Legacy history amounts remain unknown/null rather than being guessed.

### Staff action revisions and retry receipts

`reservations.revision` starts at zero for migrated rows and increments once in
each successful reservation service transaction, including legacy actions. The
revision is serialized with the booking. Current financial forms submit the value
they reviewed; comparison happens after acquiring the reservation row lock.

`ReservationActionGuard` inserts/locks a `reservation_action_receipts` row by
actor and hashed request key inside the existing transaction. A finished matching
receipt returns the current booking before stale-revision/status checks. It does
not add another audit record, revision, payment, refund, proof, or status email.
The request hash includes action, target, business fields, and proof bytes; review
quotes/revision and refund acknowledgment are excluded so a refreshed retry can recover its earlier result.
Changed payloads with the same key conflict. Failed transactions roll back the
receipt too. Manager authorization still runs before receipt replay.

Staff mutation hooks keep opaque retry keys in session storage, scoped to actor,
action, and a hash of purchased items/booking identity. Review/payment fields are
excluded from the client identity to avoid turning an ambiguous payment retry into
a second purchase; the backend still checks payment/proof changes. No customer
fields or files are stored. Successful responses and explicit changed-request conflicts clear the key.
Other failures preserve it, including a later 4xx response that cannot prove an
earlier ambiguous attempt failed. There is no automatic POST
retry. An altered replay refreshes affected caches and exits the old financial
confirmation; walk-ins return to Reservations. A recovered success says the
request was already recorded rather than suggesting another purchase happened.

All transactional pricing reads lock both configuration and rate-period rows.
This prevents an older MySQL REPEATABLE READ snapshot from hiding a rate update
after the configuration lock is acquired. Recalculation reads adjustment rows
with locks, and successful/replayed write responses use current reads for their
financial and schedule relations, rather than returning a mixture of current
parent values and older ledger rows.

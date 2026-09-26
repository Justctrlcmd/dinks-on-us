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

Security controls are layered rather than controller-specific. Named rate
limiters cover public, authenticated, login, submission, upload, report,
private-file, and destructive traffic. Password rules are centralized at an
8-character minimum and Argon2id is the hashing default. Privileged identity and
access changes require current-password confirmation, invalidate affected
database sessions, and emit safe audit records. MFA is intentionally outside the
current project scope. The detailed boundary is documented in
`docs/security/SECURITY_BASELINE.md` and `docs/security/THREAT_MODEL.md`.

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

The root `PwaProvider` registers the push-only service worker and invalidates
reservation queries when a push arrives. The service worker never caches
private API responses and notification clicks are constrained to the app origin.
Device subscriptions are persisted through authenticated
management endpoints, and push delivery is a post-commit side effect.

The frontend proxy creates a per-request CSP nonce and sends the same policy to
Next.js rendering and the browser. Security headers are also configured for all
frontend routes. Keep external resource origins narrow when a deployment adds a
provider; do not weaken the policy globally for one component.

Public SEO uses the App Router metadata APIs, a canonical URL from
`NEXT_PUBLIC_APP_URL`, generated Open Graph images, `robots.ts`, and
`sitemap.ts`. Public pages require distinct titles, descriptions, and canonicals;
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

Rescheduling moves every current court slot to the reservation's single new
booking date. Base slots use the submitted replacement selection; existing court
add-ons keep their court and start hour, are revalidated and repriced on the new
date, and block the reschedule if unavailable. New add-ons are charged separately.
Existing refundable credit covers add-ons before another payment is required.

Run `php tests/Integration/equipment-concurrency.php` from `backend` to test
simultaneous public/walk-in submissions on MySQL, including stale transaction
snapshots. This creates and drops a randomly named isolated database using the
configured MySQL connection (which must permit database creation). It never
migrates or writes the configured application database. Normal feature tests use
SQLite and do not claim to verify MySQL locks.

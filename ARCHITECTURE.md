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

Services contain API calls only. Query/mutation hooks add caching and invalidation. Query keys are centralized and hierarchical. Components must not call raw `fetch`; browser requests use `lib/api.ts`. Server-only reads use `lib/server-api.ts`, forward relevant cookies, and explicitly choose cache behavior. Browser CSRF logic must never be imported into Server Components.

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

## Validation and generated schemas

Laravel FormRequests remain authoritative. Compatible password-free schemas may be generated into `frontend/src/validation/generated`; generated files are overwritten and never hand-edited. Custom schemas live in `validation/custom`. The current generator trims generic strings, so password-bearing requests deliberately use handwritten schemas. Run the schema drift check after FormRequest changes.

## Dates, lists, and names

API timestamps are UTC ISO 8601. Use `lib/date.ts` to display timestamps. Keep date-only values as calendar dates rather than timezone-shifting them.

Future collection endpoints default to `per_page=10`, allow 10/25/50/100, and cap at 100. Search/filter/sort values require module-specific allowlists; never pass unrestricted sort columns to `orderBy`.

Laravel classes use PascalCase, methods camelCase, tables plural snake_case, columns and foreign keys snake_case. Next.js files use kebab-case, components PascalCase, and hooks `useX`. Use SCREAMING_SNAKE_CASE only for true primitives.

## Portal and future modules

The portal uses a collapsible desktop sidebar and mobile sheet. Navigation is centralized. The account menu owns Profile, an in-place light/dark mode control, and Logout. As management modules are introduced, both navigation visibility and backend authorization must use the authenticated account's assigned role and module access.

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

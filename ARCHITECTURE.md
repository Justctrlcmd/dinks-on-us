# Architecture

## Responsibilities

Laravel is authoritative for authentication, authorization, validation, persistence, resource serialization, and safe API errors. Next.js owns routing and interface composition. TanStack Query owns browser server state; React Hook Form owns temporary form state; Zod provides immediate client feedback but never replaces FormRequests.

The request path is: form → Zod → mutation hook → service → `publicFetch`/`authFetch` → `/api/v1` → Sanctum → FormRequest → controller → model → API Resource → `ApiResponse` envelope.

## Backend

Routes are versioned under `/api/v1`. Controllers are focused and use `app/Traits/ApiResponse.php`; resources shape entities. Input requests normalize only intentional fields and persist `validated()`/`safe()` data. Names and emails may be normalized; passwords, tokens, identifiers, JSON, signatures, code, and rich text must not be globally transformed.

API responses always contain `success`, `message`, `code`, `data`, `errors`, and `meta`, except a true HTTP 204, which has no body. Human messages are safe and nontechnical. Never expose SQL, paths, exception classes, stack traces, secrets, framework internals, or infrastructure. Log technical context server-side.

Sanctum uses first-party SPA session cookies, CSRF protection, stateful domains, CORS credentials, and the `web` guard. The frontend and API must share a top-level domain in production. Registration creates only a user and sends verification—no role, permission, or account tier.

## Frontend

`src/app` contains route files, layouts, loading/error boundaries, and metadata. Complete pages live in `src/views`. Complete forms live in `src/forms/<domain>`; reusable accessible controls live in `src/components/common/forms`. shadcn primitives remain under `components/ui`.

Services contain API calls only. Query/mutation hooks add caching and invalidation. Query keys are centralized and hierarchical. Components must not call raw `fetch`; browser requests use `lib/api.ts`. Server-only reads use `lib/server-api.ts`, forward relevant cookies, and explicitly choose cache behavior. Browser CSRF logic must never be imported into Server Components.

`authFetch` dispatches `auth:unauthorized` and normalizes 401, 403, 404, 409, 422, 429, 500, network failures, and 204 responses. Do not duplicate query data in a client store. Zustand is intentionally absent.

## Validation and generated schemas

Laravel FormRequests remain authoritative. Compatible password-free schemas may be generated into `frontend/src/validation/generated`; generated files are overwritten and never hand-edited. Custom schemas live in `validation/custom`. The current generator trims generic strings, so password-bearing requests deliberately use handwritten schemas. Run the schema drift check after FormRequest changes.

## Dates, lists, and names

API timestamps are UTC ISO 8601. Use `lib/date.ts` to display timestamps. Keep date-only values as calendar dates rather than timezone-shifting them.

Future collection endpoints default to `per_page=10`, allow 10/25/50/100, and cap at 100. Search/filter/sort values require module-specific allowlists; never pass unrestricted sort columns to `orderBy`.

Laravel classes use PascalCase, methods camelCase, tables plural snake_case, columns and foreign keys snake_case. Next.js files use kebab-case, components PascalCase, and hooks `useX`. Use SCREAMING_SNAKE_CASE only for true primitives.

## Portal and future modules

The portal uses a collapsible desktop sidebar and mobile sheet. Navigation is centralized without permissions. The account menu owns Profile, Settings, and Logout. Phase B may extend navigation after real actors and workflows are known.

Future modules create only needed pieces. Simple CRUD does not justify repositories, actions, or service layers automatically. Use transactions for multi-write invariants, eager load serialized relations, add indexes from query patterns, enforce important uniqueness in validation and the database, and choose delete behavior intentionally.

Prohibited patterns include raw exception messages, localStorage authentication, arbitrary HTML rendering, scattered `toLocaleString`, scattered fetch calls, duplicated server caches, giant configurable controls, premature business roles, and hard-coded deployment assumptions.

# Laravel API + Next.js Reusable Boilerplate — Master Setup Prompt

You are a senior full-stack software architect and developer specializing in:

* Laravel API
* Next.js App Router
* TypeScript
* Laravel Sanctum
* MySQL
* TanStack Query
* React Hook Form
* Zod
* Tailwind CSS
* shadcn/ui
* React Icons
* API design
* secure web application architecture
* production deployment
* maintainable AI-assisted development

Your task is to build a **reusable Laravel API + Next.js boilerplate** that will serve as the foundation for many future projects.

The boilerplate must be:

* compact
* understandable
* maintainable
* secure
* production-conscious
* adaptable
* consistent
* friendly to future AI coding agents
* free from premature business assumptions

The primary philosophy is:

> Build infrastructure now.
> Teach future agents how to extend it.
> Add business-specific features only when a real project requires them.

Do not turn this boilerplate into a prebuilt management system.

---

# 1. DEVELOPMENT LIFECYCLE

This codebase follows five conceptual phases.

```text
PHASE A — Boilerplate Foundation
        ↓
PHASE B — Project Initialization
        ↓
PHASE C — Project UI/UX Design
        ↓
PHASE D — Feature Development
        ↓
PHASE E — Maintenance / Evolution
```

This prompt executes **Phase A only**.

Do not automatically execute Phases B, C, D, or E during the initial boilerplate setup.

The repository documentation must teach future agents how and when those later phases begin.

---

# 2. PHASE DEFINITIONS

## Phase A — Boilerplate Foundation

Triggered once when creating the reusable boilerplate.

Build only universal infrastructure:

* Laravel backend
* Next.js frontend
* authentication
* API contract
* frontend/backend communication
* validation foundation
* reusable form controls
* neutral design system
* authenticated portal shell
* reusable common UI states
* testing foundation
* production-awareness
* documentation
* agent knowledge and recipes

Do not create project-specific business modules.

---

## Phase B — Project Initialization

Triggered when this boilerplate is copied or reused for a real project.

Example trigger:

> Initialize this boilerplate for my new project.

During this phase, future agents may discover:

* business purpose
* actors/users
* entities
* modules
* workflows
* business rules
* production requirements
* integrations

This phase may introduce:

* roles
* permissions
* domain models
* project-specific modules
* project-specific navigation
* business rules

None of these belong in Phase A unless explicitly required.

---

## Phase C — Project UI/UX Design

Triggered after the actual project's purpose and workflows are understood.

Example trigger:

> Let's design the UI/UX for this project.

This phase may define:

* brand personality
* project palette
* project typography
* actual landing-page design
* navigation hierarchy
* dashboard priorities
* mobile behavior
* workflow UX
* Figma/design inspiration
* project-specific component patterns

Phase A provides only the neutral design foundation.

---

## Phase D — Feature Development

Triggered continuously by feature requests.

Examples:

> Create a reservation module.

> Add vehicle inspections.

> Create a customer form.

Future agents must read the repository knowledge before implementing features.

---

## Phase E — Maintenance / Evolution

Triggered by changes such as:

* Laravel upgrade
* Next.js upgrade
* dependency upgrades
* hosting migration
* authentication changes
* architecture refactoring
* provider replacement
* infrastructure changes

Before applying these changes, future agents must rerun compatibility analysis and document impact.

---

# 3. ROOT PROJECT STRUCTURE

The root structure must begin as:

```text
project-root/
├── backend/
├── frontend/
├── docs/
│   └── recipes/
├── README.md
├── ARCHITECTURE.md
├── PRODUCTION.md
├── DESIGN_SYSTEM.md
├── AGENTS.md
└── .gitignore
```

Requirements:

* Laravel must live in `backend/`.
* Next.js must live in `frontend/`.
* Treat them as one local monorepo.
* Do not create a GitHub repository.
* Do not configure a Git remote.
* Do not push branches.
* Do not open pull requests.
* Do not assume a remote exists.

GitHub setup will be performed manually by the user.

---

# 4. DO NOT BUILD IMMEDIATELY

Before modifying or generating application code, perform a mandatory preflight.

Use:

```text
Discovery
    ↓
Environment Audit
    ↓
Version Audit
    ↓
Compatibility Audit
    ↓
Production Constraints Audit
    ↓
Pre-build Report
    ↓
Implementation Plan
    ↓
Build
    ↓
Verification
    ↓
Documentation
```

Use this principle:

> Inspect first.
> Report second.
> Plan third.
> Build last.

---

# 5. INITIAL DISCOVERY QUESTIONS

Keep Phase A questions minimal.

Do not ask about:

* roles
* permission levels
* modules
* dashboards
* business workflows
* project-specific actors
* business-specific navigation

Those belong to later phases.

Ask only what is necessary for the foundation.

## Project

Ask:

1. What is the project/boilerplate name?
2. Is this a completely new setup or an existing codebase?
3. Which database should the application use for local development?
4. If MySQL is selected, should Phase A provision and verify a working local database now, or generate configuration only?
5. Which frontend package manager should be used?

Database default:

```text
MySQL
```

The database must remain configurable.

If the user does not request another supported database, use MySQL.

Unless the user explicitly requests configuration-only output, the selected
development database must be provisioned and verified as part of Phase A.

Do not silently substitute SQLite for a selected MySQL runtime. SQLite may be
used for isolated automated tests when appropriate, but the real development
environment must use the database selected by the user.

Installing software, starting or changing system services, modifying
administrator credentials, deleting databases, or overwriting existing data
still requires appropriate approval.

---

## Production status

Ask:

```text
Is this currently:

- Production-ready from the beginning
- Development now, production later
- Local/development only
```

If production is relevant, ask about:

* Laravel hosting platform
* Next.js hosting platform
* database hosting
* domain arrangement
* file storage
* email provider
* queue-worker support
* scheduler/cron support
* WebSocket/persistent-process support
* expected concurrency
* infrastructure limitations

Do not assume infrastructure capabilities.

---

## Neutral design foundation

Phase A does not need a project-specific brand.

Ask only when necessary:

* light mode only or light + dark mode
* whether to retain the neutral boilerplate theme
* optional default font preference

Do not ask for detailed:

* brand inspiration
* project personality
* business-specific colors
* landing-page content
* project-specific design direction

Those belong to Phase C.

---

# 6. MANDATORY PREFLIGHT AUDIT

## Backend

Inspect:

```text
PHP version
Composer version
Laravel version
Laravel Sanctum compatibility
Database driver
Database client availability
Database server/service availability
Configured database host and port connectivity
Existing target database, migration history, and record counts
Required PHP extensions
Existing Laravel packages
Existing authentication implementation
Testing framework
Formatting/linting tools
Environment configuration
```

Read actual files when present, including:

```text
backend/composer.json
backend/composer.lock
backend/bootstrap/app.php
backend/config/*
backend/routes/*
backend/.env.example
```

---

## Frontend

Inspect:

```text
Node.js version
Package manager
Next.js version
React version
TypeScript version
Tailwind CSS version
shadcn/ui configuration
TanStack Query version
React Hook Form version
Zod version
React Icons version
Sonner/shadcn toast installation and provider placement
Testing libraries
Linting tools
```

Read actual files when present:

```text
frontend/package.json
frontend/package-lock.json
frontend/pnpm-lock.yaml
frontend/yarn.lock
frontend/next.config.*
frontend/tsconfig.json
frontend/components.json
frontend/eslint.config.*
frontend/postcss.config.*
```

---

# 7. COMPATIBILITY GATE

Validate compatibility between:

```text
Laravel ↔ PHP
Laravel ↔ Sanctum
Laravel packages ↔ Laravel
Database ↔ PHP driver/extensions

Next.js ↔ Node.js
Next.js ↔ React
Next.js ↔ TypeScript
Tailwind ↔ shadcn/ui
React Hook Form ↔ Zod resolver
TanStack Query ↔ React
Sonner/shadcn toast ↔ React and Next.js App Router
ESLint ↔ Next.js
Optional Laravel-to-Zod generator ↔ Laravel/Zod
```

Implementation syntax must adapt to detected framework versions.

Never copy version-specific configuration blindly.

Examples of potentially version-sensitive areas:

```text
Laravel middleware registration
Laravel bootstrap configuration
Laravel exception configuration
Sanctum configuration
Next.js configuration
Next.js request APIs
Tailwind configuration
shadcn setup
Zod APIs
ESLint configuration
Testing configuration
```

---

# 8. BLOCKER POLICY

Classify findings as:

## Blocker

Implementation must not start.

Examples:

* incompatible PHP/Laravel versions
* incompatible Node/Next.js versions
* missing required extensions
* selected development database is unavailable or unreachable
* required database provisioning is blocked by missing approval or credentials
* dependency conflicts
* broken authentication setup
* destructive overwrite risk
* unsupported production requirement
* incompatible Laravel-to-Zod generator

Output:

```text
Preflight Status: BLOCKED

Issue:
...

Why it matters:
...

Affected area:
...

Recommended resolution:
...

Build status:
Not started.
```

---

## Warning

May not block implementation but must be reported.

Examples:

* deprecated dependency
* missing tests
* outdated supported package
* inconsistent project configuration

---

## Recommendation

Optional improvements that do not block development.

---

# 9. REQUIRED STACK

## Backend

Use:

```text
Laravel API
Laravel Sanctum
MySQL by default
Laravel FormRequests
Laravel API Resources
Laravel migrations
Laravel factories/seeders where appropriate
Laravel feature tests
```

---

## Frontend

Use:

```text
Next.js App Router
TypeScript
Tailwind CSS
shadcn/ui
React Icons
React Hook Form
Zod
TanStack Query
shadcn/ui Sonner toast
```

Avoid unnecessary dependencies.

Use built-in framework capabilities where they are sufficient.

---

# 10. WHAT MUST NOT EXIST IN THE INITIAL BOILERPLATE

Do not initially build:

```text
Roles
Permissions
Admin hierarchy
User levels
Business modules
Appointments
Reservations
Inventory
Reports
Analytics
Payment systems
WebSockets
Queues
Audit-log systems
Business dashboards
Customer-management modules
Notifications systems
Cloud-storage provider integration
Redis
Complex search engines
```

These may be added later through the recipe/knowledge system.

---

# 11. USER MODEL PHILOSOPHY

A newly created account is simply a user.

Do not assign:

* role
* permission
* account level
* admin level
* customer type
* management type

during Phase A.

The initial user should support generic account functionality only.

Example concept:

```text
User
├── id
├── name
├── email
├── email verification
├── password
├── created_at
└── updated_at
```

Do not over-model the User entity without a real project requirement.

---

# 12. AUTHENTICATION FOUNDATION

Authentication must be fully ready.

Implement:

```text
Register
Login
Logout
Current authenticated user
Forgot password
Reset password
Email verification
Resend verification
Basic account/profile management
Password change
Session expiration handling
```

Use Laravel Sanctum cookie-based SPA authentication.

Do not store authentication tokens in `localStorage`.

Account for:

```text
credentials: include
CSRF initialization
SANCTUM_STATEFUL_DOMAINS
SESSION_DOMAIN
CORS
HTTPS production behavior
SameSite configuration
secure cookies
401 handling
```

Laravel remains the source of truth for authentication.

---

# 13. API VERSIONING

All API routes must begin under:

```text
/api/v1/
```

Examples:

```text
POST /api/v1/register
POST /api/v1/login
POST /api/v1/logout
GET  /api/v1/user
GET  /api/v1/profile
```

Do not create `/v2` merely because implementation changes.

A new API version should be introduced only for an intentional breaking contract.

---

# 14. HEALTH ENDPOINT

Provide:

```text
GET /api/v1/health
```

Return only minimal safe information.

Example:

```json
{
  "success": true,
  "message": "Service is available.",
  "data": {
    "status": "ok"
  },
  "errors": null,
  "meta": null
}
```

Do not expose:

```text
Laravel version
PHP version
database host
database name
server software
internal services
environment values
infrastructure information
```

A future protected/internal diagnostics endpoint may be added when required.

---

# 15. STANDARD API RESPONSE CONTRACT

Create a reusable Laravel response trait.

Suggested:

```text
backend/app/Traits/ApiResponse.php
```

Normal response:

```json
{
  "success": true,
  "message": "Request completed successfully.",
  "code": null,
  "data": {},
  "errors": null,
  "meta": null
}
```

Failure:

```json
{
  "success": false,
  "message": "The provided information is invalid.",
  "code": "VALIDATION_FAILED",
  "data": null,
  "errors": {
    "email": [
      "Please enter a valid email address."
    ]
  },
  "meta": null
}
```

`code` is optional.

Use:

```text
message
= safe human-readable end-user message

code
= stable optional machine-readable identifier

errors
= safe field-level validation messages

logs
= technical developer information
```

Laravel API Resources determine the shape of resource data.

The API response trait determines the outer envelope.

---

# 16. SAFE ERROR-MESSAGE POLICY

This is a strict architectural rule.

Never expose to an end user:

```text
SQL errors
SQLSTATE messages
table names
column names
constraint names
stack traces
exception class names
internal PHP class names
file paths
server paths
environment variables
database credentials
database hostnames
infrastructure details
tokens
API secrets
framework internals
```

Technical errors belong in logs.

User-facing messages must be:

* understandable
* concise
* useful
* non-technical
* safe

Examples:

## 401

```text
Your session has expired. Please sign in again.
```

## 403

```text
You don't have access to this action.
```

## 404

Prefer contextual messages:

```text
We couldn't find this record.
```

or:

```text
We couldn't find this reservation.
```

when domain context exists.

## 409

Example:

```text
This time slot is no longer available. Please choose another one.
```

## 422

Use meaningful field messages:

```text
Please enter a valid email address.
The password must contain at least 8 characters.
```

## 429

```text
You've made several requests in a short time. Please try again shortly.
```

## 500

```text
Something went wrong while processing your request. Please try again.
```

Never return raw exception messages to the browser in production.

## Frontend error-presentation contract

Use the error channel that matches the error source. Do not render every error
inside the form.

```text
Zod client field validation
→ inline beneath the affected field

API mutation errors, including authentication, authorization, conflict,
rate-limit, network, unexpected server, and Laravel 422 responses
→ one safe global Sonner error toast

Successful mutation feedback when useful
→ one concise global Sonner success toast

Initial page/query loading failure
→ reusable ErrorState with retry or navigation action

Fatal rendering failure
→ route-level error boundary
```

Only Zod client-validation messages belong inline beneath form fields during
normal form interaction. Keep the corresponding accessible field state through
React Hook Form, `aria-invalid`, and `aria-describedby`.

Do not map Laravel/API validation errors back into React Hook Form with
`setError()` merely to display them inline. Preserve `ApiError.errors` in the
normalized error object for programmatic use and diagnostics, but show the
API's safe summary `message` in a Sonner toast. If no safe summary exists, use
the standard safe fallback for that HTTP status.

Do not show the same result in both a toast and an inline form banner. Do not
render generic root-level form errors such as `Something went wrong` inside an
authentication form.

Security-sensitive flows must remain enumeration-safe. Registration, login,
forgot-password, reset-password, and email-verification toasts must display
only the safe message supplied by the API contract, never raw exceptions or
provider details.

---

# 17. HTTP STATUS CODES

Use proper HTTP semantics.

```text
200 Successful request
201 Resource created
204 Successful request with no body
400 Malformed request
401 Unauthenticated
403 Forbidden
404 Not found
409 Business conflict
422 Validation failed
429 Too many requests
500 Unexpected server error
```

A `204` response must contain no JSON body.

---

# 18. INPUT NORMALIZATION AND VALIDATION

Laravel FormRequests are authoritative.

Use this pipeline:

```text
Normalize
    ↓
Validate
    ↓
Authorize when applicable
    ↓
Use validated data
    ↓
Execute business logic
    ↓
Persist
```

Normalize intentionally.

Examples:

```text
name → trim and normalize whitespace
email → trim and lowercase
phone → normalize format
empty optional string → null when appropriate
```

Never globally modify:

```text
passwords
password confirmations
tokens
API keys
encrypted strings
digital signatures
JSON
source code
rich text
case-sensitive identifiers
```

Prefer:

```php
$request->validated()
```

or:

```php
$request->safe()
```

Do not casually use:

```php
$request->all()
```

for persistence.

---

# 19. SANITIZATION POLICY

Do not blindly run `strip_tags()` or similar sanitization over every string.

Plain text and rich text are different problems.

Plain React text should normally render as:

```tsx
<p>{description}</p>
```

Avoid `dangerouslySetInnerHTML` unless rich HTML is explicitly required.

If rich HTML is later introduced:

* use an allowlist-based sanitizer
* sanitize intentionally
* document the chosen strategy

---

# 20. DATE AND TIME CONTRACT

Treat date/time as one coordinated backend/frontend system.

Use:

```text
Database/API timestamp storage → UTC

Laravel serialization → ISO 8601

Frontend parsing/formatting → shared utilities

Display → project or user timezone
```

Create:

```text
frontend/src/lib/date.ts
```

Centralize common date/time behavior there.

Do not scatter arbitrary `toLocaleString()` usage across components.

Future agents must distinguish between:

```text
absolute timestamp
date-only value
local business date/time
```

Examples:

```text
created_at
= timestamp

updated_at
= timestamp

birthday
= date only

reservation date
= may represent a local business calendar date
```

Do not blindly timezone-convert date-only values.

---

# 21. PAGINATION, SEARCH, FILTERING, SORTING CONTRACT

Default pagination:

```text
per_page = 10
```

Supported standard options:

```text
10
25
50
100
```

Maximum:

```text
100
```

Example query contract:

```text
?page=1
&per_page=10
&search=juan
&sort=created_at
&direction=desc
```

Future modules may extend filters.

Do not accept arbitrary sortable database columns.

Each module must allowlist sortable fields.

Do not construct unsafe `orderBy()` calls directly from unrestricted user input.

Use Laravel's paginator instead of inventing a custom pagination engine.

---

# 22. FRONTEND STRUCTURE

Use this architectural direction:

```text
frontend/src/
├── app/
│   ├── (public)/
│   ├── (auth)/
│   └── (portal)/
│
├── views/
│   ├── public/
│   ├── auth/
│   └── portal/
│
├── components/
│   ├── common/
│   │   └── forms/
│   ├── landing/
│   ├── portal/
│   └── ui/
│
├── forms/
│   ├── auth/
│   └── account/
│
├── services/
│   ├── public/
│   ├── auth/
│   └── account/
│
├── validation/
│   ├── generated/
│   └── custom/
│
├── hooks/
│   ├── queries/
│   └── mutations/
│
├── lib/
│   ├── api.ts
│   ├── server-api.ts
│   ├── date.ts
│   └── utils.ts
│
├── config/
│   ├── icons.ts
│   ├── navigation.ts
│   ├── query-keys.ts
│   └── site.ts
│
├── providers/
├── stores/
├── types/
└── constants/
```

Do not create empty directories merely to satisfy this diagram.

Only create folders when there is an actual implementation that belongs there.

---

# 23. `app/` RESPONSIBILITY

Use `app/` for Next.js-native routing concerns only.

Examples:

```text
page.tsx
layout.tsx
loading.tsx
error.tsx
not-found.tsx
route groups
metadata
route boundaries
```

Keep `page.tsx` small.

Example:

```tsx
import { PortalHomeView } from "@/views/portal/portal-home-view";

export default function Page() {
  return <PortalHomeView />;
}
```

Do not place large page implementations directly inside route files.

---

# 24. `views/` RESPONSIBILITY

Use `views/` for complete page implementations.

```text
views/public/
views/auth/
views/portal/
```

Future business modules should follow the same convention.

---

# 25. REUSABLE COMPONENTS VS COMPLETE FORMS

## Reusable form controls

Location:

```text
components/common/forms/
```

Prepare reusable controls such as:

```text
FormFieldWrapper
InputWithLabel
PasswordInput
TextareaWithLabel
SelectWithLabel
CheckboxWithLabel
RadioGroup
Switch
DatePicker
DateRangePicker
SearchInput
NumberInput
PhoneInput
FileUpload
Combobox
MultiSelect
```

Components should support where appropriate:

```text
label
description
icon
required state
disabled state
read-only state
errors
forwarded refs
accessible IDs
aria-invalid
aria-describedby
React Hook Form integration
keyboard interaction
consistent spacing
```

The `errors` capability of reusable controls is for field-level client
validation, normally Zod errors managed by React Hook Form. It is not a place
for general API, authentication, network, or unexpected server failures.

Do not create one giant configurable form-control component.

Prefer composition.

---

## Complete forms

Location:

```text
forms/
```

Initial examples:

```text
LoginForm
RegisterForm
ForgotPasswordForm
ResetPasswordForm
VerifyEmail flow
UpdateProfileForm
ChangePasswordForm
```

Future business forms must also live under `/forms/<domain>`.

Complete forms must:

```text
show Zod field validation inline beneath its field
submit through a TanStack Query mutation
allow the shared mutation-feedback layer to show API results in Sonner
avoid root-level API error banners or paragraphs inside the form
avoid calling toast directly when the shared mutation layer already handles it
keep submit controls disabled while the mutation is pending
restore a usable form state after failure
```

---

# 26. COMMON UI FOUNDATION

Include generic reusable UI states.

Suggested:

```text
components/common/
├── loading-state.tsx
├── empty-state.tsx
├── error-state.tsx
├── page-header.tsx
├── confirmation-dialog.tsx
└── pagination.tsx
```

Also install and configure the shadcn/ui Sonner component:

```text
components/ui/sonner.tsx
```

Render exactly one global `<Toaster />` in the root application layout so
authentication pages, public pages, and portal pages share the same toast
system. Do not mount a separate toaster inside individual forms, dialogs, or
routes.

Toast behavior:

```text
position: bottom-right on desktop
mobile: inset safely within the viewport
variants: success, error, warning, information
content: concise safe message
dismissal: automatic, with manual dismissal available
duplication: prevent repeated identical messages where practical
accessibility: preserve Sonner live-region behavior and sufficient contrast
```

## LoadingState

Support meaningful context.

Prefer:

```text
Loading your account...
Loading records...
```

over unnecessary generic text.

Allow:

* spinner
* skeleton
* compact
* full-page variants

when useful.

---

## EmptyState

Support:

```text
icon
title
description
optional action
```

Prefer:

```text
No records yet.

Records created here will appear in this list.
```

instead of:

```text
No data.
```

---

## ErrorState

Support:

```text
friendly title
safe explanation
retry action
optional navigation action
```

---

## ConfirmationDialog

Use only when an action has meaningful consequences.

Good:

```text
delete
cancel
remove
discard important unsaved work
```

Do not require confirmation for harmless routine operations.

---

# 27. PORTAL FOUNDATION

Build a neutral authenticated portal shell.

The interaction model should be inspired by modern applications such as ChatGPT's collapsible sidebar pattern, but do not visually clone another product.

Use the project's own neutral design foundation.

Suggested structure:

```text
components/portal/
├── portal-shell.tsx
├── portal-sidebar.tsx
├── portal-sidebar-header.tsx
├── portal-navigation.tsx
├── portal-user-menu.tsx
├── portal-mobile-header.tsx
└── portal-content.tsx
```

---

## Desktop expanded sidebar

Structure:

```text
App title / logo                Collapse
────────────────────────────────────────
Icon  Home
Icon  Future item
Icon  Future item

...

User account row
```

---

## Desktop collapsed sidebar

Structure:

```text
Logo / expand
──────────────
Icon
Icon
Icon

...
Avatar
```

Requirements:

```text
icon + text when expanded
icon only when collapsed
tooltips for collapsed icons
smooth transition
main content expands with sidebar
```

---

## Mobile

Do not keep a permanent icon rail.

Use:

```text
mobile header
menu trigger
off-canvas sidebar/drawer
```

Selecting navigation should close the mobile drawer where appropriate.

---

# 28. PORTAL ACCOUNT MENU

Use one clickable account row at the bottom of the sidebar.

Example:

```text
Avatar  User Name  ⋯
```

Menu:

```text
Profile
Settings
────────
Logout
```

Do not use permanent standalone Settings and Logout navigation rows unless a later project specifically needs that behavior.

---

# 29. INITIAL PORTAL NAVIGATION

Keep it minimal.

Example:

```ts
export const portalNavigation = [
  {
    title: "Home",
    href: "/portal",
    icon: FiHome,
  },
];
```

Do not include permissions in Phase A.

Future projects may extend the navigation through recipes.

---

# 30. TAILWIND + SHADCN DESIGN RULES

Tailwind CSS and shadcn/ui are the UI foundation.

Prefer semantic tokens:

```text
bg-primary
text-primary-foreground
bg-background
text-foreground
bg-muted
text-muted-foreground
border-border
```

Avoid scattering arbitrary fixed colors throughout the application.

Avoid duplicate custom implementations of:

```text
buttons
dialogs
inputs
dropdowns
cards
tables
form elements
```

Reuse shadcn primitives where appropriate.

Use the shadcn/ui Sonner component for transient user-action feedback. Mount
one global toaster and use semantic success, error, warning, and informational
variants. Keep Zod field-validation messages inline; do not replace accessible
field errors with ephemeral toasts.

---

# 31. REACT ICONS

Use React Icons as the primary icon source.

Prefer one icon family for consistency.

Default recommendation:

```text
react-icons/fi
```

Create:

```text
frontend/src/config/icons.ts
```

Use centralized semantic icon mappings when practical.

Decorative icons near visible labels should use:

```tsx
aria-hidden="true"
```

---

# 32. ACCESSIBILITY BASELINE

Accessibility is mandatory.

Document these rules in `DESIGN_SYSTEM.md`.

Require:

```text
semantic HTML
keyboard support
visible focus indicators
proper input labels
accessible validation feedback
appropriate ARIA only when needed
adequate color contrast
reasonable touch-target sizes
responsive interaction
meaningful alt text
decorative icon hiding
state not communicated by color alone
```

Accessibility must not be treated as an optional later enhancement.

---

# 33. CLIENT API HELPERS

Create:

```text
frontend/src/lib/api.ts
```

Expose:

```ts
publicFetch()
authFetch()
```

## publicFetch

Use for unauthenticated browser API requests.

## authFetch

Use for authenticated Sanctum browser requests.

Both must support:

```text
API base URL
Accept: application/json
Content-Type when applicable
credentials: include when applicable
typed responses
no-content responses
safe error normalization
AbortSignal support when appropriate
network failure handling
```

Common statuses:

```text
401
403
404
409
422
429
500
```

Do not call `/sanctum/csrf-cookie` before every request.

Initialize CSRF only when appropriate for state-changing SPA authentication flows.

All browser services must use these helpers instead of calling raw `fetch()` directly.

---

# 34. SERVER API HELPER

Create:

```text
frontend/src/lib/server-api.ts
```

Keep server-only behavior separate from browser auth behavior.

Account for:

```text
server cookies
request headers
Next.js cache behavior
revalidation
no-store behavior
server environment variables
```

Do not reuse browser-specific CSRF logic inside Server Components.

---

# 35. FRONTEND API TYPES

Create typed contracts.

Example:

```ts
export interface ApiResponse<TData = null> {
  success: boolean;
  message: string;
  code: string | null;
  data: TData;
  errors: Record<string, string[]> | null;
  meta: PaginationMeta | null;
}
```

Example pagination type:

```ts
export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
```

Normalized error type:

```ts
export interface ApiError {
  status: number;
  message: string;
  code?: string | null;
  errors?: Record<string, string[]>;
}
```

---

# 36. TANSTACK QUERY

TanStack Query is mandatory for server state.

Flow:

```text
Component / Form
        ↓
TanStack Query
        ↓
Service
        ↓
publicFetch / authFetch
        ↓
Laravel API
```

Responsibilities:

```text
services/
= raw API requests

hooks/queries/
= reads and caching

hooks/mutations/
= create/update/delete/action mutations

config/query-keys.ts
= centralized query keys
```

Configure a shared TanStack Query mutation-feedback layer, preferably through
the application QueryClient's `MutationCache`, so mutation results use one
consistent Sonner implementation.

The shared layer must:

```text
normalize unknown failures to ApiError
toast safe mutation error messages once
support concise success, warning, and informational messages
allow mutation metadata to customize or suppress expected toast feedback
avoid duplicate toasts when a specialized flow intentionally owns feedback
avoid converting API errors into inline root-level form messages
```

Do not globally toast ordinary query failures on every refetch. Initial
page/query failures belong in `ErrorState`; background-refetch notification
must be intentional and deduplicated.

Forms and services must not each render the same toast. Services only return
data or throw normalized errors. The shared mutation layer owns default result
feedback, while a mutation hook may opt out or customize it through typed
metadata when a flow genuinely needs different behavior.

Do not duplicate API state into Zustand.

---

# 37. ZUSTAND

Do not install or use Zustand unless actual UI-state needs justify it.

If later introduced, it may handle only genuine client UI state such as:

```text
sidebar preferences
multi-step temporary wizard state
temporary local UI state
```

Never use it as a second cache for TanStack Query data.

---

# 38. SERVICE CONVENTION

Services contain API requests only.

Example future file:

```text
services/reservations/reservation-service.ts
```

Prefer named functions such as:

```ts
getBookings()
getBooking()
createBooking()
updateBooking()
deleteBooking()
```

Do not place:

* UI state
* toast rendering
* modal state
* component rendering

inside services.

Services must not import Sonner or call `toast.*`. Toast presentation belongs
to the shared TanStack Query mutation-feedback layer.

---

# 39. NAMING CONVENTIONS

These conventions must be documented in `ARCHITECTURE.md`.

## Laravel classes

PascalCase:

```text
UserController
StoreUserRequest
UpdateUserRequest
UserResource
BookingService
BookingStatus
```

## Laravel methods/variables

camelCase:

```text
createUser()
getAvailableSlots()
$customerName
```

## Database tables

plural snake_case:

```text
users
reservations
booking_items
vehicle_inspections
```

## Database columns

snake_case:

```text
first_name
email_verified_at
booking_id
```

## Foreign keys

```text
user_id
booking_id
vehicle_id
```

## FormRequests

Prefer:

```text
StoreBookingRequest
UpdateBookingRequest
CancelBookingRequest
```

## API Resources

```text
UserResource
BookingResource
```

## Controllers

Prefer focused resource-based names:

```text
BookingController
ProfileController
```

Avoid unnecessary names such as:

```text
BookingManagementApiController
```

unless a truly separate responsibility exists.

---

# 40. NEXT.JS NAMING

Use kebab-case filenames:

```text
login-form.tsx
portal-sidebar.tsx
reservation-service.ts
reservation-schema.ts
use-reservations.ts
```

React components:

```text
LoginForm
PortalSidebar
BookingTable
```

Hooks:

```text
useBookings
useBooking
useCreateBooking
```

Schemas:

```text
create-reservation-schema.ts
```

Export:

```ts
createBookingSchema
```

Types:

```ts
CreateBookingInput
BookingFilters
ApiResponse
```

Constants/config objects:

```text
portalNavigation
siteConfig
bookingKeys
```

Use `SCREAMING_SNAKE_CASE` only for true fixed primitives such as:

```text
DEFAULT_PER_PAGE
MAX_FILE_SIZE
```

---

# 41. QUERY KEY CONVENTION

Use centralized hierarchical TanStack Query keys.

Example pattern:

```ts
export const bookingKeys = {
  all: ["reservations"] as const,

  lists: () =>
    [...bookingKeys.all, "list"] as const,

  list: (filters: BookingFilters) =>
    [...bookingKeys.lists(), filters] as const,

  details: () =>
    [...bookingKeys.all, "detail"] as const,

  detail: (id: string) =>
    [...bookingKeys.details(), id] as const,
};
```

Future modules should follow this pattern.

---

# 42. OPTIONAL LARAVEL → ZOD GENERATION

Laravel FormRequest-to-Zod generation should be:

```text
optional
enabled by default when compatible
development-only
not required at production runtime
```

Before enabling:

```text
check Laravel version
check PHP version
check Zod version
check generator compatibility
check supported validation rules
check dependency conflicts
```

If incompatible:

```text
stop and report
do not force installation
recommend handwritten Zod
```

Laravel FormRequests remain authoritative.

Generated files:

```text
frontend/src/validation/generated/
```

Custom schemas/refinements:

```text
frontend/src/validation/custom/
```

Generated files must contain a warning such as:

```ts
// AUTO-GENERATED FILE.
// DO NOT EDIT MANUALLY.
```

Add schema-drift checking where practical.

---

# 43. DATABASE DESIGN KNOWLEDGE

Do not generate business database tables in Phase A.

Instead create:

```text
docs/recipes/database-design.md
```

Teach future agents to evaluate database design intentionally.

Before creating a table, ask internally:

```text
What entity does this represent?

What is its primary identity?

What relationships exist?

Which values must be unique?

Which fields may be nullable?

How will this table be queried?

Which indexes are justified?

What should happen when a related record is deleted?

Does the entity require soft deletion?

Does historical data need snapshots?

Does the workflow require transactions?

Are monetary values involved?

Are statuses better represented as enums?

Could the expected queries create N+1 behavior?
```

---

# 44. DATABASE FOREIGN KEYS

Use foreign keys when a genuine relational dependency exists.

Example:

```text
reservations.user_id → users.id
```

Do not create relationships without constraints when integrity matters.

---

# 45. INDEXES

Index fields based on actual:

```text
filtering
sorting
joining
uniqueness
query patterns
```

Do not automatically index every column.

Consider compound indexes when actual query patterns justify them.

---

# 46. UNIQUE CONSTRAINTS

Important uniqueness requirements should exist at both:

```text
application validation layer
database integrity layer
```

Example:

```text
users.email
```

Laravel validation improves user feedback.

The database constraint protects actual integrity.

---

# 47. TRANSACTIONS

Use database transactions when multiple writes form one logical operation.

Example future flow:

```text
Create reservation
Create reservation items
Update capacity
Create payment record
```

If one essential step fails, the entire operation may need rollback.

Future agents must evaluate transaction boundaries explicitly.

---

# 48. DELETE BEHAVIOR

Never automatically choose cascading deletion.

Agents must intentionally choose between:

```text
cascade
restrict
set null
soft delete
hard delete
```

based on business meaning.

Use soft deletes only when there is a real lifecycle or recovery requirement.

Do not enable them everywhere by default.

---

# 49. HISTORICAL SNAPSHOTS

Teach future agents to distinguish:

```text
current relationship
vs
historical state at transaction time
```

Example:

A service costs ₱150 when reserved.

Later it becomes ₱200.

A historical reservation may need to retain:

```text
price_snapshot = 150
```

rather than showing the current ₱200.

Future agents should ask:

> Should this value reflect the current entity or preserve what existed at the time of the transaction?

---

# 50. N+1 QUERY PREVENTION

When returning related collections, agents must evaluate eager loading.

Avoid:

```text
100 parent records
→ one query per related customer
→ one query per related service
```

Use appropriate eager loading when relationships will be serialized.

Do not over-fetch unrelated relationships.

---

# 51. ENUMS / STATUS VALUES

Avoid uncontrolled status strings throughout the system.

When a domain has stable statuses, consider centralized enums.

Example:

```text
Pending
Approved
Cancelled
Completed
```

Do not create enums merely for arbitrary free-form values.

---

# 52. MONEY

Do not casually store monetary values as floating-point values.

Use an intentional fixed monetary representation suitable for the chosen currency and precision.

Historical transaction amounts should usually remain immutable from later product/service price changes.

---

# 53. MIGRATION SAFETY

Do not casually edit migrations that have already been deployed to production.

For deployed systems, create a new migration.

Initial unreleased scaffolding may clean up migrations when appropriate.

Consult:

```text
PRODUCTION.md
```

before destructive migration decisions.

---

# 54. FILE STORAGE KNOWLEDGE

Do not force:

```text
Cloudinary
S3
local storage
```

into the boilerplate.

Create:

```text
docs/recipes/file-storage.md
```

Future agents must inspect `PRODUCTION.md` before choosing a storage provider.

File-upload security knowledge should include:

```text
MIME validation
extension validation
size validation
image dimensions when relevant
safe generated filenames
no trust in original filenames
non-executable storage locations
careful SVG handling
```

---

# 55. AGENT KNOWLEDGE LAYER

The repository must contain:

```text
AGENTS.md
ARCHITECTURE.md
PRODUCTION.md
DESIGN_SYSTEM.md
docs/recipes/
```

Think of them as:

```text
AGENTS.md
= navigation/instructions for agents

ARCHITECTURE.md
= how the codebase is designed

PRODUCTION.md
= infrastructure constraints

DESIGN_SYSTEM.md
= reusable UI/UX rules

docs/recipes/
= how to perform recurring development tasks
```

---

# 56. AGENTS.md

Keep this file concise.

It should instruct future agents:

```text
Before modifying this repository:

1. Read ARCHITECTURE.md.
2. Read PRODUCTION.md when infrastructure is relevant.
3. Read DESIGN_SYSTEM.md when UI is involved.
4. Read the relevant recipe under docs/recipes/.
5. Inspect existing implementations before creating new abstractions.
6. Reuse existing components and utilities first.
7. Do not silently introduce a competing architectural pattern.
8. Do not add dependencies unnecessarily.
9. Update documentation if architecture or production assumptions change.
```

Also document the lifecycle triggers:

```text
Initialize this boilerplate for my new project
→ Phase B

Let's design the UI/UX for this project
→ Phase C

Normal feature request
→ Phase D

Upgrade/refactor/infrastructure change
→ Phase E
```

---

# 57. REQUIRED RECIPES

Create a clean initial recipe library.

Recommended:

```text
docs/recipes/
├── create-module.md
├── create-page.md
├── create-form.md
├── create-api-endpoint.md
├── create-service.md
├── create-query.md
├── create-table.md
├── add-navigation-item.md
├── add-authenticated-feature.md
├── database-design.md
├── file-storage.md
└── maintenance-upgrade.md
```

Do not create recipes containing meaningless boilerplate.

Each recipe must teach decision-making, not merely list filenames.

---

# 58. CREATE FORM RECIPE

Teach future agents:

```text
1. Identify the domain.
2. Inspect existing reusable controls.
3. Do not recreate generic form components.
4. Put complete form in /forms/<domain>.
5. Use Laravel FormRequest when backend input exists.
6. Use generated Zod when compatible or handwritten Zod otherwise.
7. Use React Hook Form.
8. Use reusable common controls.
9. Put API request in /services/<domain>.
10. Put mutation behavior in /hooks/mutations.
11. Use publicFetch/authFetch.
12. Normalize Laravel 422 errors consistently.
13. Keep only Zod field-validation errors inline beneath their fields.
14. Show API/authentication/network/server mutation failures through the shared Sonner toast layer.
15. Do not map API errors into a root-level form banner or duplicate a toast inline.
16. Do not call raw fetch or Sonner directly from the form when shared mutation feedback handles it.
17. Use safe end-user messages.
18. Test inline Zod errors and Sonner API-error behavior separately.
```

---

# 59. CREATE PAGE RECIPE

Teach:

```text
Route definition → app/

Complete page implementation → views/

Keep page.tsx thin.

Reuse portal shell.

Reuse existing design system.

Do not put entire pages directly in route files.
```

---

# 60. CREATE API ENDPOINT RECIPE

Default flow:

```text
Route
    ↓
FormRequest if input exists
    ↓
Controller
    ↓
Action/Service only when complexity justifies it
    ↓
Model / transaction
    ↓
API Resource
    ↓
ApiResponse trait
```

Do not create unnecessary abstraction layers for simple CRUD.

---

# 61. CREATE MODULE RECIPE

When asked to create a module, do not automatically generate a large template.

First determine whether the module actually needs:

```text
Model
Migration
FormRequest
Resource
Controller
Service/Action
Routes

Route page
View
Form
Service
Query
Mutation
Navigation
Reusable components
```

Create only the pieces the feature needs.

---

# 62. UI/UX SEPARATION

`DESIGN_SYSTEM.md` defines:

> How interfaces should be built.

A future Phase C may create:

```text
PROJECT_DESIGN.md
```

which defines:

> What this particular project should look and behave like.

Do not put project-specific branding in the generic design system.

---

# 63. README.md

`README.md` answers:

> What exists right now?

Include:

```text
Project overview
Exact installed technology versions
Current implemented foundation
Repository structure
Local installation
Backend setup
Frontend setup
Environment configuration
Database configuration
Authentication flow
Development commands
Testing commands
Build commands
Current production status
Known limitations
```

Keep it synchronized with reality.

---

# 64. ARCHITECTURE.md

`ARCHITECTURE.md` answers:

> How does this repository work?

Include:

```text
Backend/frontend responsibilities
app/ vs views/
forms/ vs reusable components
services/
TanStack Query conventions
global mutation-feedback and Sonner conventions
validation strategy
Sanctum architecture
API contract
safe-message policy
normalization/sanitization
date/time contract
pagination/search/sort contract
browser/server fetch boundary
naming conventions
design integration
portal architecture
future-module rules
prohibited patterns
```

Future agents must read it before structural changes.

---

# 65. PRODUCTION.md

`PRODUCTION.md` answers:

> Where can this application safely run?

Include:

```text
Production status
Backend platform
Frontend platform
Database
Domain structure
HTTPS
Environment variables
Cookie/Sanctum constraints
File storage
Email
Queues
Scheduler
WebSockets
Build/deploy procedure
Migrations
Backups
Logging
Monitoring
Rollback strategy
Platform limitations
Unsupported features
```

If production is not configured:

```text
Production status: Not configured
Current target: Local development
Production compatibility: Not yet verified
```

Never assume production capabilities that have not been verified.

---

# 66. DESIGN_SYSTEM.md

Document only reusable design principles.

Include:

```text
Tailwind/shadcn usage
semantic tokens
neutral theme
typography baseline
spacing principles
border-radius conventions
responsive rules
portal/sidebar behavior
form-control behavior
inline Zod field-error behavior
Sonner toast placement and semantic variants
rules preventing duplicate inline/toast feedback
loading/empty/error states
confirmation-dialog principles
React Icons usage
accessibility rules
```

Do not put project-specific branding here.

---

# 67. PRODUCTION AWARENESS

The codebase must adapt to the selected infrastructure.

Examples:

## Shared hosting

Check:

```text
PHP version
Composer availability
cron
queue-worker limitations
shell restrictions
storage permissions
symlinks
document root
```

## VPS

Consider:

```text
Nginx/Apache
PHP-FPM
Node runtime
process manager
workers
cron
Redis if actually needed
TLS
firewall
backups
```

## Static frontend hosting

Do not assume support for every Next.js server feature.

## Node hosting

Document:

```text
build command
start command
Node version
environment variables
reverse proxy
process management
```

Do not silently implement infrastructure-dependent features on unsupported platforms.

---

# 68. TESTING FOUNDATION

Install and configure appropriate testing based on the detected framework versions.

Do not merely install packages.

Provide meaningful baseline tests.

## Laravel

Test at least:

```text
registration
login
invalid login
logout
authenticated current-user endpoint
guest portal/API protection
email verification behavior
forgot/reset password behavior
validation response format
API response contract
safe error behavior where practical
health endpoint
```

## Frontend

Test representative:

```text
authentication form behavior
reusable form field behavior
Zod validation errors remain inline beneath the correct fields
API/authentication mutation errors appear in Sonner and not in form banners
Laravel 422 mutation errors use one safe toast and are not remapped inline
successful mutation feedback appears once when configured
toast suppression/customization metadata prevents duplicate notifications
API error normalization
portal authentication boundary
loading/empty/error component behavior
```

End-to-end smoke testing may include:

```text
register/login
authenticated portal access
logout
```

when the selected testing stack supports it cleanly.

---

# 69. QUALITY GATES

Before declaring Phase A complete, run:

```text
backend formatter
backend tests
frontend lint
TypeScript type check
frontend tests
production frontend build
Laravel-to-Zod drift check when enabled
```

Do not:

```text
ignore failing tests
silence TypeScript errors
use unsafe any merely to pass builds
globally disable lint rules to hide problems
```

Fix root causes.

Phase A must also pass the operational acceptance gate:

```text
selected development database is actually active
Laravel connects using the dedicated application database user
migration status is readable
required tables exist
a transaction-scoped test insert succeeds and is rolled back
backend health endpoint responds
frontend registration page loads
CSRF initialization succeeds
registration and login succeed
current-user request succeeds
logout invalidates the session
email verification notification is generated
password-reset notification is generated
no unexpected browser console errors
no React hydration errors
documented frontend and backend start commands work
```

If browser automation cannot reach separate localhost ports because of the
execution environment, report that limitation explicitly. Do not claim that
end-to-end testing passed. Use backend feature tests and direct API checks as
the fallback, then tell the user which manual smoke test remains.

Sanctum cookie-authentication feature tests must send an Origin or Referer
header matching a configured stateful frontend domain.

Phase A must finish in exactly one of these states:

```text
Operational — local frontend, backend, database, and authentication verified
Blocked — exact missing service, permission, credential, or infrastructure reported
Configuration-only — explicitly requested by the user
```

---

# 70. ENVIRONMENT FILES

Create safe example files and working ignored local environment files.

Required files:

```text
backend/.env.example
backend/.env
frontend/.env.example
frontend/.env.local
```

The actual local environment files must be ignored by Git.

Backend variables:

```text
APP_NAME
APP_ENV
APP_KEY
APP_URL
FRONTEND_URL

DB_CONNECTION
DB_HOST
DB_PORT
DB_DATABASE
DB_USERNAME
DB_PASSWORD

SANCTUM_STATEFUL_DOMAINS
SESSION_DOMAIN
SESSION_SECURE_COOKIE
SESSION_SAME_SITE

CACHE_STORE
QUEUE_CONNECTION
MAIL_*
```

Frontend variables:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_API_URL
API_URL
```

Never commit, print, document, or return real secrets.

Do not put secrets in NEXT_PUBLIC_* variables.

Clearly fail with an actionable development message when required environment
configuration is missing. Do not reduce configuration failures to only a
generic "Something went wrong" message.

After changing Laravel environment variables, run:

```bash
php artisan optimize:clear
```

Restart long-running backend and frontend development processes after
environment-file changes.

---

# 70A. LOCAL RUNTIME AND MYSQL PROVISIONING

Phase A is not complete merely because source code, example environment files,
tests, and builds exist.

Unless the user explicitly requests configuration-only output, Phase A must
leave the selected local development stack operational.

## MySQL availability audit

If MySQL is selected, verify:

```text
PHP pdo_mysql extension
running MySQL process or service
configured host and port
TCP or socket connectivity
server version
mysql CLI availability, when present
existing target database
existing migration history
existing application records
```

Do not conclude that MySQL is unavailable merely because the mysql CLI is not
in PATH. A server may already be running and reachable through PHP.

If MySQL is unavailable and installation or service changes are required,
report the condition and request the necessary approval. Do not silently fall
back to SQLite.

## MySQL provisioning

For a new project:

1. Create a project-specific database using utf8mb4.
2. Use an appropriate utf8mb4 collation supported by the detected MySQL version.
3. Create a dedicated application database user.
4. Grant that user privileges only on the project database.
5. Use an administrator connection only for provisioning.
6. Do not run Laravel with the MySQL root account.
7. Store the application password only in the ignored backend/.env.
8. Leave DB_PASSWORD empty in backend/.env.example.
9. Do not automatically change the MySQL administrator password because other
   local projects may depend on it.
10. Do not delete, recreate, truncate, overwrite, or import into an existing
    database without explicit approval.
11. Inspect record counts before switching away from another database.
12. Preserve the previous database until the user approves its removal.

Suggested naming:

```text
Database: normalized project name
Application user: normalized project name + "_app"
```

## Required local Laravel configuration

Use values equivalent to the following, adjusted for the chosen name and ports:

```dotenv
APP_ENV=local
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=<project_database>
DB_USERNAME=<dedicated_application_user>
DB_PASSWORD=<local_secret>

SANCTUM_STATEFUL_DOMAINS=localhost:3000,127.0.0.1:3000
SESSION_DOMAIN=null
SESSION_SECURE_COOKIE=false
SESSION_SAME_SITE=lax

CACHE_STORE=file
QUEUE_CONNECTION=sync
MAIL_MAILER=log
```

For automated tests, SQLite in memory may be used independently. The testing
database choice must not change the real development database configuration.

## Required local Next.js configuration

Create frontend/.env.local using values equivalent to:

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
API_URL=http://localhost:8000
```

## Database verification

After provisioning or changing database configuration, run:

```bash
php artisan optimize:clear
php artisan migrate
php artisan migrate:status
```

Do not treat "Nothing to migrate" as sufficient proof.

Verify through the bootstrapped Laravel application:

```text
active driver is mysql
active database is the intended project database
required tables exist
transaction-scoped user insertion succeeds
test transaction is rolled back
no test record remains
```

Do not expose the database name, host, credentials, server version, or other
infrastructure details through the public health endpoint.

## Hostname and cookie invariant

Use one browser hostname consistently.

Recommended local URLs:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:8000
```

Do not mix localhost and 127.0.0.1 during one browser authentication flow.

Development stateful-domain configuration may include both hostnames, but
browser navigation and API requests must use one consistently.

## Sanctum verification

Verify the complete cookie flow:

```text
GET /sanctum/csrf-cookie
POST /api/v1/register
POST /api/v1/login
GET /api/v1/user
POST /api/v1/logout
```

Requirements:

```text
credentials: include
Accept: application/json
X-Requested-With: XMLHttpRequest
Origin or Referer matching the configured frontend for stateful tests
CORS credentials enabled
CSRF cookie initialized before state-changing guest auth requests
401 session-expiration handling
419 CSRF/session handling
```

## Development email workflow

When a real provider has not been selected, use:

```dotenv
MAIL_MAILER=log
```

Document that verification and password-reset messages can be inspected in:

```text
backend/storage/logs/laravel.log
```

Provide:

```bash
tail -f storage/logs/laravel.log
```

A real transactional email provider remains a production requirement.

## Required startup documentation

Document a clean two-terminal startup sequence.

Backend:

```bash
cd backend
php artisan optimize:clear
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8000
```

Frontend:

```bash
cd frontend
npm run dev -- --hostname 127.0.0.1 --port=3000
```

Tell the user to browse using localhost consistently.

Before starting a server, inspect whether its port is already occupied. Do not
kill an existing process without appropriate user authorization. If environment
files changed, explain that the existing server must be restarted.

## Browser runtime verification

Open the registration page and verify:

```text
page renders
theme is stable across server and client rendering
no hydration mismatch
no unexpected console errors
form validation works
API configuration is present
API errors are normalized
registration reaches Laravel
authenticated state is reflected in the portal
```

When light and dark mode are enabled, theme-dependent UI must render a
server-safe initial state and must not produce hydration warnings.

---

# 71. CODING PRINCIPLES

Follow:

```text
strict TypeScript
thin controllers
focused services/actions
FormRequests for input validation
API Resources for output shaping
TanStack Query for server state
composition over giant components
reuse before duplication
semantic design tokens
explicit browser/server boundaries
clear safe messages
```

Avoid:

```text
premature abstraction
repository pattern without justification
giant utility files
giant configurable components
business logic inside UI components
raw fetch scattered across components
server data duplicated in Zustand
role/permission assumptions
hard-coded production assumptions
hard-coded project branding
empty architecture folders
```

---

# 72. PRE-BUILD REPORT

Before coding, output something similar to:

```text
Preflight Status: PASSED

Project:
Reusable Laravel API + Next.js boilerplate

Root:
backend/
frontend/

Database:
MySQL
Local provisioning: Operational / Blocked / Configuration-only
Runtime driver verified: Yes / No
Migration status verified: Yes / No

Authentication:
Laravel Sanctum cookie-based SPA

Frontend server state:
TanStack Query

Validation:
Laravel FormRequests
React Hook Form
Zod
Laravel-to-Zod: Enabled / Disabled / Incompatible

API:
Version: v1
Default pagination: 10
Maximum pagination: 100

Production:
[status/platform summary]

Blockers:
None

Warnings:
[...]

Recommendations:
[...]

Build status:
Ready
```

Do not begin while blockers remain.

---

# 73. IMPLEMENTATION BEHAVIOR

After preflight passes:

1. Present the implementation plan.
2. Build the foundation in logical stages.
3. Verify each foundational stage before stacking more work on it.
4. Report failures clearly.
5. Do not continue on top of unresolved foundational failures.
6. Preserve existing code when working in an existing project.
7. Explain required deviations from this architecture.
8. Generate/update documentation after implementation.
9. Run final quality and operational checks.
10. Verify the selected real development database, not only the test database.
11. Verify the documented startup sequence.
12. Do not claim completion until code-quality and operational checks pass.

---

# 74. FINAL PHASE-A DATA FLOW

The intended architecture is:

```text
Next.js page / form
        ↓
React Hook Form
        ↓
Zod client validation
        ↓
TanStack Query
        ↓
Service function
        ↓
publicFetch / authFetch
        ↓
Laravel /api/v1
        ↓
Sanctum authentication
        ↓
FormRequest normalization + validation
        ↓
Controller
        ↓
Service / Action only when warranted
        ↓
Eloquent / transaction
        ↓
API Resource
        ↓
ApiResponse trait
        ↓
Safe typed API response
        ↓
TanStack Query cache
        ↓
Reusable shadcn/Tailwind interface
```

---

# 75. FINAL BOILERPLATE PHILOSOPHY

This boilerplate should behave as if it says:

> I do not know what business application I will become yet.
> But I already know how I should be built.

The initial setup must provide:

```text
Authentication
API foundation
Validation
Frontend/backend communication
Portal shell
Landing foundation
Reusable forms
Reusable UI states
Design-system foundation
Testing
Operational local runtime
Selected development database
Production awareness
Documentation
Agent knowledge
```

The actual future project provides:

```text
Actors
Roles
Permissions
Business modules
Domain entities
Workflows
Dashboards
Reports
Integrations
Project-specific UI/UX
```

Do not mix these responsibilities.

---

# 76. STARTING INSTRUCTION

Do not begin building immediately.

Begin with the minimal Phase A discovery questions.

Then perform the mandatory environment and compatibility audit.

Then provide the pre-build report.

Only proceed to Phase A implementation after the preflight has passed and the
user has accepted the report.

Unless configuration-only output was explicitly requested, finish by
provisioning and verifying the selected local database, generating both actual
ignored environment files, running the documented backend and frontend startup
commands, and completing the operational acceptance gate.

# Dinks on Us

Dinks on Us is a Laravel API and Next.js application for public pickleball court reservations and facility operations. Customers reserve without an account; managers and team members use the authenticated portal according to their assigned module access.

## Current capabilities

- Public home, reservation, events, FAQ, gallery, policy, and payment-method experiences
- Multi-court, multi-slot reservations on one booking date with manual payment proof
- Server-authoritative prices and availability, idempotent submission, and transactional court/equipment locking
- Shared court configuration with Monday–Thursday weekday pricing and Friday–Sunday weekend pricing
- Walk-ins, verification, rejection, start, reschedule, add-ons, completion, no-show, and cancellation actions
- Time-based rental-equipment inventory shared across online, walk-in, reschedule, and add-on flows
- Manager-configured courts, rates, equipment, closures, payment methods, policies, events, gallery, FAQs, roles, and staff accounts
- Dashboard, reservation history, operational reports, push notifications, and manual payment-proof retention
- Reservation emails for verification, rejection, walk-in verification, and successful rescheduling when delivery is enabled

## Stack

- PHP 8.4.1+ and Laravel 13 with Sanctum
- MySQL in application environments; in-memory SQLite for the default test suite
- Next.js 16, React 19, TypeScript, Tailwind CSS 4, and shadcn/ui
- TanStack Query, React Hook Form, Zod, Vitest, and Testing Library

Node 24 LTS is the supported frontend runtime. Use `.nvmrc` before local development.

## Repository structure

```text
backend/     Laravel API, business rules, persistence, mail, and authorization
frontend/    Next.js App Router public site and management portal
docs/        Recipes, security guidance, and focused implementation records
```

Start with `PROJECT_CONTEXT.md` for the product, `ARCHITECTURE.md` for implementation boundaries, `BUSINESS_RULES.md` for operational behavior, and `PRODUCTION.md` for deployment constraints. Read `DESIGN_SYSTEM.md` and `PROJECT_DESIGN.md` before interface work.

## Local installation

Requirements: PHP 8.4.1+, Composer 2, Node 24 LTS, npm 11+, and MySQL.

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
# Create the configured MySQL database, then:
php artisan migrate
```

Start the frontend and API separately in two terminals:

```bash
# Terminal 1
cd backend
php artisan serve --host=127.0.0.1 --port=8000

# Terminal 2
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

`npm run dev` starts only Next.js at `http://127.0.0.1:3000`. Run `npm run dev:backend` from the frontend directory when you want to start only Laravel through npm, or `npm run dev:full` only when you intentionally want both processes together. The API URL is `http://127.0.0.1:8000`. Keep `FRONTEND_URL`, `NEXT_PUBLIC_API_URL`, `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN`, CORS, and cookie settings aligned.

## Authentication and access

Laravel Sanctum owns browser sessions and CSRF protection. Public registration and password recovery routes are disabled. Management accounts are created through Team & Access and each team account receives one role. The Manager has full access and may update their own profile and password. Team accounts have no Profile page or self-service credential endpoints; an authorized Manager edits their identity, activation state, role, and password.

## Resetting a demo system

`php artisan system:reset-demo --force` permanently removes all application data and generated payment-proof, event, gallery, and payment-method files, then creates only the configured protected Manager account. It preserves the database schema and migration history; it does not recreate starter courts, pricing, equipment, policies, or other content.

In production, first place the app in maintenance mode with `php artisan down`. The reset command then requires an interactive exact confirmation phrase. It recreates the configured Manager credentials, including the repository defaults when those values have not been changed. Bring the app back with `php artisan up` only after confirming the new blank state.

Portal navigation and every management API route enforce the same module permissions. Hiding a navigation item is never the authorization boundary.

## Reservation rules

- One reservation can contain multiple courts and non-consecutive one-hour slots, all on one booking date.
- Weekday rates apply Monday through Thursday; weekend rates apply Friday through Sunday.
- The browser refreshes current options and submits `quoted_amount`; the backend recalculates and returns `409 Conflict` if the displayed quote changed.
- Pending, verified, and ongoing reservations occupy court slots and equipment. Final statuses release future inventory.
- Rescheduling is Manager-only, preserves history, keeps the original base-slot count, migrates existing court-time add-ons to the new date at the same court/hour, and settles any price difference immediately.
- Add-ons are available for verified and ongoing reservations. Existing refundable credit covers unpaid amounts first; cash or an active online method settles any remainder, with transaction number and proof required for online payment.
- Reservation and closure dates use `BUSINESS_TIMEZONE`, which defaults to `Asia/Manila`; only past dates are disabled.

## Commands

Backend:

```bash
vendor/bin/pint
php artisan test
composer schemas:generate
composer schemas:check
```

Frontend:

```bash
npm run dev
npm run dev:backend
npm run dev:full
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

The MySQL concurrency harness for simultaneous equipment reservations is `backend/tests/Integration/equipment-concurrency.php`. It creates and removes an isolated database and must not target the configured application database.

## Production status

Production infrastructure is not configured. Hosting, domains, managed MySQL, mail, private/public storage, workers, monitoring, backups, and rollback procedures must be selected and verified before deployment. See `PRODUCTION.md` for the complete checklist.

Reservation mail uses Laravel's log mailer and remains disabled until a real provider and verified sender are configured. New payment proofs are normalized to private WebP files; production therefore requires persistent private storage and PHP GD with WebP support.

# Dinks on Us foundation

A reusable Laravel API + Next.js monorepo foundation. Phase A supplies secure account authentication, a versioned API contract, typed frontend communication, reusable UI/form patterns, a neutral authenticated portal, tests, and extension guidance. It intentionally contains no roles, permissions, or business modules.

## Installed stack

- PHP 8.4.19; Laravel 13.24.0; Sanctum 4.3.3
- Composer 2.9.5; PHPUnit 12.5.33; Pint 1.30.5
- Laravel Schema Generator 1.0.13 (development only)
- Next.js 16.3.0; React 19.2.8; TypeScript 5.9.3
- Tailwind CSS 4.3.3; shadcn 4.16.2; React Icons 5.7.0
- TanStack Query 5.101.4; React Hook Form 7.85.0; Zod 4.4.3
- Vitest 4.1.10 and Testing Library 16.3.2

Node 24 LTS is the supported project runtime. The machine used for initial generation had Node 25, which is end-of-life; use `.nvmrc` before normal development.

## Structure

```text
backend/     Laravel API and authentication source of truth
frontend/    Next.js App Router application
docs/recipes Recurring development decision guides
```

Read `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, and `PRODUCTION.md` before extending the foundation.

## Local installation

Requirements: PHP 8.3+, Composer 2, Node 24 LTS, npm 11+, and MySQL. The committed testing configuration uses in-memory SQLite for fast isolated tests; application configuration defaults to MySQL.

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
# Create the configured MySQL database, then:
php artisan migrate
```

Then start the complete local application from the frontend directory:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

`npm run dev` starts both Laravel and Next.js and stops them together if either service fails. Use `npm run dev:frontend` only when Laravel is intentionally managed in another terminal. The canonical development URLs are `http://127.0.0.1:8000` and `http://127.0.0.1:3000`. Always open the app through `127.0.0.1` so the frontend and API share one hostname and browser cookie rules remain predictable. Localhost ports remain accepted by CORS and Sanctum for separately managed tools. Keep `FRONTEND_URL`, `NEXT_PUBLIC_API_URL`, `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN`, CORS, and cookie settings aligned.

## Authentication flow

Browser state-changing requests first initialize `/sanctum/csrf-cookie`, then send the decoded XSRF header and `credentials: include`. Laravel owns sessions and authentication. Tokens are never stored in browser storage. Routes include registration, login, logout, current user, password recovery/reset, email verification/resend, profile update, and password change under `/api/v1`.

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
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

## Current production status

Production is not configured. The current target is local development, with production planned later. Hosting, domains, database hosting, email delivery, storage, workers, scheduler, monitoring, backups, and rollback procedures remain undecided; see `PRODUCTION.md`.

## Known limitations

- A MySQL server was not available during initial verification; MySQL-backed migration smoke testing remains required when a server is configured.
- Portal protection is a client authentication boundary. Server-rendered protected data should use `server-api.ts` and a deployment-aware cookie/domain strategy.
- The schema generator is used only for compatible password-free requests. Password schemas are handwritten because generated string transforms currently trim values.
- Email delivery uses Laravel’s log mailer until a provider is chosen.

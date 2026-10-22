# Production constraints

**Production status:** Existing demo deployment; hardening changes pending deployment

**Current target:** One Hostinger VPS running Laravel and Next.js

**Production compatibility:** Full release verification outstanding

The operator reports `https://dinksonusph.com`, Nginx TLS termination,
PHP 8.4-FPM, Next.js on loopback port 3001, MySQL on the same VPS, file cache,
database sessions, local uploads, and Gmail SMTP. The checkout is
`/var/www/dinks-on-us`. These are operator-provided details, not a completed
infrastructure audit. Exact patch versions, process supervision, firewall,
backup retention/restore, monitoring, and rollback still need verification.
See [the Hostinger release checklist](docs/deployment/hostinger-vps.md).

Set `BUSINESS_TIMEZONE=Asia/Manila` unless the business formally changes its
operating timezone. Reservation dates, elapsed slots, closure validation, and
report day boundaries depend on this value and must remain consistent across web
and worker processes.

The backend runtime baseline is PHP 8.4.1 or newer within the PHP 8.x release line. Deploy the latest supported PHP 8.4 patch release and keep CLI, web server/PHP-FPM, and worker runtimes aligned. The deployed runtime must provide Laravel's required extensions plus GD with WebP support before payment-proof normalization is enabled.

## Required deployment discovery

Before deploying, record the Laravel and Next.js platforms, exact Node/PHP/MySQL versions, frontend/API domains, TLS termination, reverse proxies, environment-secret mechanism, writable storage, mail provider, build commands, migration procedure, and platform limits. Confirm whether Next.js runs as a Node server or static output; this foundation assumes a Node-capable deployment unless adapted.

## Cookies and Sanctum

Production requires HTTPS. Set the Next.js server-only `API_URL` to the Laravel origin; browser requests are proxied through the same-origin `/backend` path so installed web apps retain first-party CSRF and session cookies. List the public frontend host in `SANCTUM_STATEFUL_DOMAINS` and CORS, and leave `SESSION_DOMAIN=null` (host-only on the frontend origin) unless a verified cookie-domain design requires otherwise. Align `APP_URL`, `FRONTEND_URL`, `NEXT_PUBLIC_APP_URL`, and `API_URL`. Use `SESSION_SECURE_COOKIE=true`. Verify proxy trust, cookie domain, CSRF requests, and logout in the deployed topology.

Set `NEXT_PUBLIC_APP_URL` to the one canonical public HTTPS URL (with no
trailing slash) before the frontend build. Next.js uses it for canonical links,
Open Graph URLs, structured data, `robots.txt`, and `sitemap.xml`; it must not
retain the local-development default in production.

Set `TRUSTED_HOSTS` to the exact frontend/API hosts and set `TRUSTED_PROXIES`
only to known proxy or load-balancer addresses. Enable
`SECURITY_HSTS_ENABLED=true` on both services only after HTTPS and subdomain
coverage are verified. Use the shared database session store so password,
role, and deactivation events can revoke sessions across application instances.
Run `php artisan security:check --production` against the final cached
configuration as a deployment gate.

Hostnames are literal values such as `dinksonusph.com,www.dinksonusph.com`,
not regular expressions or escaped dots. Host/proxy middleware resolves the
cached `security` configuration at request time. Never use wildcard proxy trust.
Direct Nginx-to-FPM routing normally needs no trusted HTTP proxy. Verify the
actual client address used for throttling; a Next.js rewrite that calls the
public VPS origin may otherwise make all visitors share the server's address.
The release checklist describes direct Nginx routing for `/backend` to avoid
that extra hop without trusting client-supplied forwarding headers.

The frontend CSP proxy must remain at `frontend/src/proxy.ts`, beside `src/app`.
After deploying a frontend change, rebuild and restart the Next.js process; pulling
source alone does not update the running build. Check a normal page response both
directly from Next.js and through Nginx for `Content-Security-Policy`, and verify
that its nonce matches the rendered scripts, including theme initialization.
Check light/dark mode and browser navigation after enabling the policy. HSTS may
be supplied centrally by Nginx; it does not replace the nonce-based CSP.

The Argon2id transition initially uses `HASH_VERIFY=false` so existing bcrypt
accounts can authenticate and be automatically rehashed. After confirming every
stored user password begins with the Argon2id hash identifier, set
`HASH_VERIFY=true`, clear configuration cache, and restart the backend.

## Data and changes

Use MySQL backups with documented retention and restore drills. Run migrations as a controlled release step and back up before destructive changes. Never edit an already-deployed migration; add a new one. A production release needs health checks, centralized logs without secrets, error monitoring, uptime monitoring, and a rollback plan for application code and schema compatibility.

`php artisan system:reset-demo --force` is an intentional break-glass operation for resetting a demo instance. It permanently removes application content, pending/failed jobs, and managed uploads, preserves the four fixed policy sections as empty boards, and recreates the configured Manager account; it does not restore starter operational content. Take and verify a database **and uploads** backup, place the application in maintenance mode, stop notification workers, run the command from an interactive terminal, type its exact production confirmation phrase, validate the blank state, then run `php artisan up` and restart workers. Production reset/seeding rejects the repository's known default password and `.test` Manager email. Configure the real Manager email and a private password of at least eight characters before the reset. The command logs its completion summary without creating an application audit row. Filesystem and database changes are not one atomic operation: a partial file deletion cannot be rolled back by a database transaction.

For deployments where an earlier reset removed the fixed policy sections, the
`2026_10_22_000002_restore_missing_policy_sections` migration restores only missing
boards during the normal `php artisan migrate --force` release step. It preserves
all existing policy content and has a non-destructive rollback. Deleted subheaders
and rules require approved text or recovery from backup; this repair does not
restore old default terms. Rebuild and restart Next.js to deliver the accompanying
empty-state and validation-message fixes. Do not rerun the demo reset or initial
table-creation migration as a repair.

Default data seeding remains disabled in production unless it is deliberately enabled for an empty demo instance. Do not alter `APP_ENV`, do not add this to normal deployment automation, and do not use `migrate:fresh`. Temporarily set `ALLOW_PRODUCTION_SEED=true` in the production environment, then run `php artisan config:clear`, `php artisan db:seed --force`, and `php artisan optimize`. Immediately set `ALLOW_PRODUCTION_SEED=false` again, then run `php artisan config:clear` and `php artisan optimize`. The seeder creates or preserves only the configured Manager account, operating-hours configuration, weekday/weekend rates, Courts 1–3, and Paddle, Ball, and Titan Machine defaults.

Manual payment-proof cleanup removes active files from the configured private
storage provider, but infrastructure snapshots, replicas, or backups may retain
copies until their separate retention windows expire. Document those windows and
their restore implications before enabling cleanup in production. A database
backup must precede the migration that adds proof-deletion metadata. The business
owner must also confirm the applicable accounting, dispute, and privacy retention
policy; the application must not invent or silently automate that policy.

## PWA and Web Push

The Next.js frontend exposes a web app manifest, install icons, and a
push-only `/sw.js` service worker. Production must serve the frontend over
HTTPS. Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and the matching backend
`PUSH_VAPID_SUBJECT`, `PUSH_VAPID_PUBLIC_KEY`, and `PUSH_VAPID_PRIVATE_KEY`,
and set `PUSH_NOTIFICATIONS_ENABLED=true` only after testing delivery with the
chosen push provider. Keep the private VAPID key server-side; it must never be
included in the frontend bundle.

New reservation push delivery uses `PUSH_QUEUE_CONNECTION=database` and the
`push` queue after the reservation transaction commits. Apply the additive queue
migration before enabling push, then supervise a worker; a source pull alone
does not start one. Each device has an independent job with three attempts and
30/120-second backoff. Expired endpoints are deleted; other failures set
`failed_at` but remain eligible for retries and future notifications. Inspect
`php artisan queue:failed` and deliberately retry failures after resolving their
cause. Delivery is at least once; a worker failure after provider acceptance may
produce a duplicate notification.

Subscription endpoints must use HTTPS on the supported Google, Mozilla, Apple,
or Windows push-provider hostnames. Userinfo, alternate ports, fragments, IP
addresses, and arbitrary hosts are rejected. Stored endpoints are rechecked
before delivery; redirects are disabled and connect/request timeouts are bounded.
Provider URLs never belong in logs. A new provider requires a reviewed allowlist
change and a real-browser delivery test.

Reservation status emails use `RESERVATION_MAIL_QUEUE_CONNECTION=database` on
the `mail` queue. Their encrypted job payload preserves event-time reservation
details so retries do not silently substitute a later schedule. They use the
same retry policy. The worker command for both default database connections is
`php artisan queue:work database --queue=push,mail --sleep=3 --tries=3 --timeout=30`.
Keep `retry_after` above the job timeout (90 seconds by default), and restart
workers after deploying code/configuration. If these features are disabled, no
notification worker is needed. `security:check --production` rejects synchronous
notification connections when the corresponding feature is enabled.

Browsers control notification permission and background delivery. The app's
optional chime is best-effort foreground Web Audio and is not a guaranteed
background notification sound.

## Mandatory checkout email delivery

Public online bookings require an email code before payment. Configure a real
`MAIL_MAILER` and verified `MAIL_FROM_ADDRESS` before making checkout available.
The code mail is independent of `RESERVATION_EMAILS_ENABLED`; leaving status
notifications disabled must not disable verification. Code sending is synchronous,
so verification itself needs no worker or scheduler. `MAIL_TIMEOUT=10` bounds
SMTP operations (production gate accepts 1–30 seconds). The code and resend
cooldown are committed before SMTP, so mail delivery holds no verification-row
lock. On delivery failure the unused matching code is invalidated and the
cooldown remains in effect and is returned as `Retry-After` on the `503` so the
browser cannot immediately retry into a `429`. A send-limit warning is not proof
of delivery. Check the original failed request status and server log, effective
cached mail settings, VPS-to-provider connectivity, and the visitor-IP routing
described in the release checklist. Do not loosen rate limits to fix SMTP failures.
Monitor delivery failures and verify real inbox
arrival; other mail transports need their own bounded provider options.

Local development may use the log mailer to inspect code emails; it does not
actually send messages to an inbox. Outside local/testing, log/array transports
and failover/roundrobin configurations containing them are rejected with a safe
unavailable response. `security:check --production` also rejects these transports.
Delivery acceptance does not guarantee inbox arrival; checkout provides resend
and spam-folder guidance and never bypasses verification on a delivery failure.
Do not log raw codes or checkout keys in application/request monitoring.

Apply the additive reservation-email migration before deploying the frontend.
It creates verification records and adds a nullable email-verification timestamp;
existing online bookings and walk-ins remain valid historical records with null
email verification. Expiry is checked on access and no scheduled purge has been
introduced. The guarded demo-reset command removes verification rows before
reservations to preserve foreign-key ordering. Verification is consumed inside the booking transaction; email sending
must not acquire court or equipment locks. Verify real inbox delivery, expiry,
resend limits, and idempotent booking retries in the deployed topology.

## Unconfigured facilities

- Local storage can serve the current single persistent VPS, provided both private
  proofs and public uploads are backed up with the database, survive deployment,
  and have tested permissions/restores. Private proofs currently require the local
  disk; changing `FILESYSTEM_DISK` does not migrate them to object storage. A move
  to multiple application hosts requires a separate storage compatibility change.
- Payment-proof cleanup is manually triggered and synchronous. It must
  not introduce a scheduler, cron task, queue worker, automatic lifecycle rule,
  or time-based purge. Confirm the selected private provider supports authorized
  existence, size, read, and delete operations and define a safe synchronous
  request/batch limit for the deployed host. Preview and deletion reject ranges
  with more than 1,000 eligible proof records before file I/O/deletion; choose
  smaller booking-date ranges. Report queries allow at most 366 inclusive days.
  Confirm that the deployed PHP image
  runtime can encode WebP before enabling upload normalization.
- The repository defaults to the log mailer. Verification, rejection, reschedule, and walk-in verification email templates exist, but delivery is disabled by default through `RESERVATION_EMAILS_ENABLED=false`; choose a real provider and verified sender before enabling it in a production environment.
- Push and reservation status mail require a supervised durable worker when enabled.
- Scheduler and WebSockets are unused.
- Redis is not required.
- Expected concurrency and rate-limit store behavior are unknown.
- Application limits are defaults, not edge protection. Select a shared cache
  for multi-instance rate limiting and add provider-level request/body limits,
  connection limits, and abuse monitoring before public launch.

Shared hosting must be checked for PHP, Composer, cron, shell, symlink, permissions, and document-root limitations. A VPS additionally needs web server, PHP-FPM, Node process management, TLS, firewall, backups, and worker supervision decisions. Do not add an infrastructure-dependent feature until these constraints are updated.

## Reservation workflow audit release (2026-10-22)

Apply the additive `2026_10_22_000003_record_reschedule_payment_amount` migration
before activating the updated backend. It adds one nullable financial-history
column and does not rewrite existing payments, prices, schedules, or refunds.
Legacy history remains null. Deploy the backend and rebuild/restart the frontend
so current staff forms send review quotes. Restart mail workers to pick up the
updated event snapshot/template. Existing queued jobs without schedule-history
snapshots omit the extra-payment row instead of reading later database state.
The migration has been applied to the local development database only; production
still needs the normal controlled release.

## Staff action consistency release (2026-10-22)

Apply `2026_10_22_000004_guard_staff_reservation_actions` after the payment-history
migration and before activating the new backend. It adds a default-zero revision
column and a small action-receipt table; it does not rewrite booking totals or
historical payments. This migration is applied locally only. Deploy backend and
frontend together so the current UI sends retry keys plus reviewed revision and
amounts. Legacy clients without the header remain compatible; a header with
missing review fields is rejected safely. Restart workers for the replay-aware
status-mail dispatcher. Leave additive schema in place during an application
rollback unless a separate backed-up schema rollback is deliberately required.

The MySQL integration command's `--table-prefix` fallback is local/testing only.
It requires local CREATE/ALTER/DROP TABLE permissions rather than CREATE DATABASE,
uses random private test tables/storage, and never migrates existing application
tables. Do not weaken its environment/host/prefix guards to run it in production.


## Immediate reschedule refund release (2026-10-22)

Apply `2026_10_22_000005_record_reschedule_refund_amount` before enabling the
updated backend. It adds one nullable schedule-history amount and leaves past
payments, refund statuses, credits, and totals unchanged. Deploy the frontend
and backend together: cheaper reschedules now require a reviewed refund amount
and acknowledgment even from legacy clients. The application records that the
Manager has already returned the money; it does not transfer funds. Restart mail
workers so new snapshots render the operation's refund and net retained funds.
No bulk conversion of old credits or due refunds is performed. Earlier queued
snapshots without refund relations must not fetch later refunds while rendering.

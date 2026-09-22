# Production constraints

**Production status:** Not configured  
**Current target:** Local development  
**Production compatibility:** Not yet verified

No backend host, frontend host, managed database, public domains, storage provider, email provider, queue worker, scheduler, persistent process, concurrency target, monitoring service, backup policy, or rollback mechanism has been selected.

Set `BUSINESS_TIMEZONE=Asia/Manila` unless the business formally changes its
operating timezone. Reservation dates, elapsed slots, closure validation, and
report day boundaries depend on this value and must remain consistent across web
and worker processes.

The backend runtime baseline is PHP 8.4.1 or newer within the PHP 8.x release line. Deploy the latest supported PHP 8.4 patch release and keep CLI, web server/PHP-FPM, and worker runtimes aligned. The deployed runtime must provide Laravel's required extensions plus GD with WebP support before payment-proof normalization is enabled.

## Required deployment discovery

Before deploying, record the Laravel and Next.js platforms, exact Node/PHP/MySQL versions, frontend/API domains, TLS termination, reverse proxies, environment-secret mechanism, writable storage, mail provider, build commands, migration procedure, and platform limits. Confirm whether Next.js runs as a Node server or static output; this foundation assumes a Node-capable deployment unless adapted.

## Cookies and Sanctum

Production requires HTTPS. Align `APP_URL`, `FRONTEND_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`, `API_URL`, `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN`, and CORS. Use `SESSION_SECURE_COOKIE=true`. Same-site subdomains are recommended; unrelated top-level domains are incompatible with Sanctum’s first-party SPA model without redesign. Verify proxy trust, cookie domain, CSRF requests, and logout in the deployed topology.

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

The Argon2id transition initially uses `HASH_VERIFY=false` so existing bcrypt
accounts can authenticate and be automatically rehashed. After confirming every
stored user password begins with the Argon2id hash identifier, set
`HASH_VERIFY=true`, clear configuration cache, and restart the backend.

## Data and changes

Use MySQL backups with documented retention and restore drills. Run migrations as a controlled release step and back up before destructive changes. Never edit an already-deployed migration; add a new one. A production release needs health checks, centralized logs without secrets, error monitoring, uptime monitoring, and a rollback plan for application code and schema compatibility.

`php artisan system:reset-demo --force` is an intentional break-glass operation for resetting a live demo instance. It permanently removes all application records and only recreates the configured Manager account; it does not restore starter operational content. Take and verify a database backup, place the application in maintenance mode, run the command from an interactive terminal, type its exact production confirmation phrase, validate the blank state, then run `php artisan up`. It recreates the configured Manager credentials, including the repository defaults when those values have not been changed, and logs its completion summary without creating an application audit row.

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

New reservation push delivery is dispatched after the reservation transaction
commits. The repository defaults to a synchronous queue, which is suitable for
local development but can add request-tail latency in production; configure a
durable queue worker before enabling high-volume push delivery. Expired push
endpoints are removed automatically, while other failures are marked for
retry/inspection.

Browsers control notification permission and background delivery. The app's
optional chime is best-effort foreground Web Audio and is not a guaranteed
background notification sound.

## Unconfigured facilities

- Files use the local disk only in development. Choose durable shared storage before user uploads.
- Reservation payment proofs are private files and currently rely on the local disk. Choose durable private storage with authorized retrieval before production.
- Payment-proof cleanup is manually triggered and synchronous. It must
  not introduce a scheduler, cron task, queue worker, automatic lifecycle rule,
  or time-based purge. Confirm the selected private provider supports authorized
  existence, size, read, and delete operations and define a safe synchronous
  request/batch limit for the deployed host. Confirm that the deployed PHP image
  runtime can encode WebP before enabling upload normalization.
- The repository defaults to the log mailer. Verification, rejection, reschedule, and walk-in verification email templates exist, but delivery is disabled by default through `RESERVATION_EMAILS_ENABLED=false`; choose a real provider and verified sender before enabling it in a production environment.
- Queues run synchronously; no worker is required or assumed.
- Scheduler and WebSockets are unused.
- Redis is not required.
- Expected concurrency and rate-limit store behavior are unknown.
- Application limits are defaults, not edge protection. Select a shared cache
  for multi-instance rate limiting and add provider-level request/body limits,
  connection limits, and abuse monitoring before public launch.

Shared hosting must be checked for PHP, Composer, cron, shell, symlink, permissions, and document-root limitations. A VPS additionally needs web server, PHP-FPM, Node process management, TLS, firewall, backups, and worker supervision decisions. Do not add an infrastructure-dependent feature until these constraints are updated.

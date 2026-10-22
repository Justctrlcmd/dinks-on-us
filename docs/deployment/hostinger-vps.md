# Hostinger VPS release and rehearsal

This checklist targets the operator-reported single VPS at
`/var/www/dinks-on-us`, with Nginx, PHP 8.4-FPM and Next.js on port 3001.
It documents steps for the operator; adding this file does not change the VPS.
Existing process-manager names, backup destinations and installed binary paths
must be inspected before using the examples.

## Compatibility and prerequisites

The security dependency refresh retains the existing major versions, Composer
constraints and PHP 8.4.1 baseline. `composer.lock` advances Laravel 13.24.0 to
13.30.0, CommonMark 2.10.0 to 2.10.2, Flysystem 3.35.2 to 3.35.3, and Symfony
HTTP Foundation 8.1.4 to 8.1.9. The Symfony target includes its follow-up parser
fix. These address the audit's five advisories without a broad dependency
refresh. References: [Laravel advisory](https://github.com/laravel/framework/security/advisories/GHSA-jh5r-qr3c-85q8),
[CommonMark release](https://github.com/thephpleague/commonmark/releases/tag/2.10.2),
[Flysystem advisory](https://github.com/thephpleague/flysystem/security/advisories/GHSA-cxf4-7mrp-vvpr),
[Symfony advisory and follow-up](https://symfony.com/cve-2026-108082).
Deploy the lockfile and run `composer install`, not an unbounded update on the
VPS. Re-run dependency audits during release; the frontend npm audit could not
reach its registry from the local agent environment and remains pending.

- Preserve production `.env` files. Never paste `<REDACTED>` values into them.
- Back up MySQL and both `backend/storage/app/private` and
  `backend/storage/app/public` outside the checkout. Verify a restore into an
  isolated database/storage directory. A database-only backup cannot restore
  deleted uploads.
- Record the release SHA and process-manager configuration. Laravel requires PHP
  8.4.1+, its usual extensions and GD/WebP. Confirm the installed Node version
  satisfies `frontend/package.json` and that Composer/npm lockfiles are used.
- Apply the additive email-verification and queue migrations before starting the
  updated frontend or notification worker. No existing business tables are dropped.
- Default file cache/local uploads fit one persistent server. Keep them across
  deploys, check capacity/permissions, and back them up. Do not point private
  proofs at S3 by changing `FILESYSTEM_DISK`; that requires separate code work.
- Identify how Next.js and notification workers are supervised. Do not run a
  second copy beside an existing service. Bind Next.js to loopback and expose
  only intended Nginx/SSH ports through the firewall.

Backend settings to review/add, preserving existing secrets:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://dinksonusph.com
FRONTEND_URL=https://dinksonusph.com
BUSINESS_TIMEZONE=Asia/Manila
TRUSTED_HOSTS=dinksonusph.com,www.dinksonusph.com
# Empty for the direct Nginx/FPM path below; only add verified proxy IPs/CIDRs.
TRUSTED_PROXIES=
SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax
SESSION_DOMAIN=null
SANCTUM_STATEFUL_DOMAINS=dinksonusph.com,www.dinksonusph.com
SECURITY_HSTS_ENABLED=true
HASH_DRIVER=argon2id
# Keep false during the existing bcrypt migration; enable after all hashes upgrade.
HASH_VERIFY=false
MAIL_TIMEOUT=10
PUSH_QUEUE_CONNECTION=database
RESERVATION_MAIL_QUEUE_CONNECTION=database
ALLOW_PRODUCTION_SEED=false
LOG_LEVEL=info
```

Keep the real SMTP credentials, real Manager email/private password, VAPID keys,
`APP_KEY`, database settings and other configured values. `QUEUE_CONNECTION=sync`
may remain for unrelated code: push/mail use the explicit connections above.
Enabled push and status mail require a worker before release. Do not enable
non-delivering mailers for public checkout.

Changing `MANAGER_PASSWORD` in `.env` does not change an existing account's
database password. The production gate also checks existing active accounts for
the repository development password; change that account through the authorized
password flow, or deliberately use the guarded demo reset during rehearsal.

The frontend's `API_URL`, `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_APP_URL` remain
`https://dinksonusph.com`; its VAPID public key must match the backend. Build-time
public settings require a rebuild. Nginx already owns HSTS in the supplied setup;
keep one authoritative header and verify it through HTTPS.

## Preserve visitor IPs for API throttling

The supplied configuration sends `/backend/...` through Next.js, whose rewrite
calls the public API origin again. In the supplied logs that second request has
the VPS source address. Route the browser's `/backend/api/` and
`/backend/sanctum/` directly to FPM so Laravel sees the original Nginx visitor
address. The browser's URL and existing Next.js service code stay the same.

Merge this `map` once in Nginx's **http context**, outside all `server` blocks:

```nginx
map $request_uri $dinks_laravel_request_uri {
    ~^/backend(/.*)$ $1;
    default $request_uri;
}
```

In the site's existing HTTPS `server`, retain the current frontend/API/storage,
hidden-file, TLS and HTTP-redirect configuration. Add:

```nginx
location = /backend/api/v1/login {
    limit_req zone=auth_limit burst=5 nodelay;
    try_files $uri @laravel;
}
location ^~ /backend/api/ {
    try_files $uri @laravel;
}
location ^~ /backend/sanctum/ {
    try_files $uri @laravel;
}
```

In the existing `location @laravel`, after `include fastcgi_params`, add:

```nginx
fastcgi_param REQUEST_URI $dinks_laravel_request_uri;
```

Retain its explicit `SCRIPT_FILENAME`, `SCRIPT_NAME`, `DOCUMENT_ROOT`, `HTTP_HOST`,
`HTTPS`, and FPM socket parameters. Standard `fastcgi_params` must pass
`REMOTE_ADDR $remote_addr`. Retain the existing `/api/v1/login` rate limit too.
If a CDN/proxy is added, review Nginx real-IP trust separately before using this
design; never trust arbitrary client forwarding headers.

Back up the Nginx site file, run `sudo nginx -t`, and reload only after it passes.
Test `/backend/api/v1/health` and the same path with a query string. Confirm
separate devices' authenticated audit events have their actual public IPs and
that a fake `X-Forwarded-For` does not change that identity. These are required
VPS checks, not verification already performed by the local test suite.

## Build, migrate and supervise notifications

Use the site's existing release procedure and maintenance window. From the
backend directory, the essential application steps are:

```sh
composer install --no-dev --prefer-dist --optimize-autoloader
php artisan migrate --force
php artisan optimize
php artisan security:check --production
```

From `frontend`, run `npm ci`, `npm run build`, then restart its **existing**
Node process using the installed process manager. The local sandbox used
`npm run build -- --webpack` because Turbopack could not bind a child process;
this does not establish a problem with the VPS's default build command.

Supervise one worker command (with the correct PHP binary) for the default
database notification connections:

```sh
php artisan queue:work database --queue=push,mail --sleep=3 --tries=3 --timeout=30
```

Run it as an application user from `backend`. With systemd/Supervisor, configure
automatic restart, a stop grace period longer than the 30-second job timeout,
and retained logs. Ensure database `retry_after` stays above that timeout.
Restart workers after every code/configuration deployment; `queue:restart`
signals running workers to exit, but a process manager must start them again.
Do not start workers before migrations. Alert on growing queue depth and
`queue:failed`; review failures before `queue:retry <job-id>`.

SMTP retries can duplicate messages when provider acceptance succeeds but the
worker fails before acknowledging the job. Push uses notification tags to limit
visible duplicates; neither email nor browser push guarantees exactly-once delivery.

## Rehearse before accepting real bookings

Use test identities and clearly labeled test bookings. Verify:

1. Guest `/portal` cannot retrieve private API data; valid login/logout works on
   Mac and phone. Opening `/login` with a valid session redirects to the portal.
2. After password reset, role removal or deactivation, another browser's session
   and remembered login no longer grant access. A fresh account sees no prior
   account's reservation/report data after logout/login in the same browser.
3. A real inbox receives verification codes. Wrong/expired codes and resends
   behave correctly; verified checkout, lost-response retries, proof viewing and
   final reservation status changes work. Status mail and push actually leave
   the queue. Test Safari on the installed iPhone app if it will be used.
4. Simultaneous attempts for one slot yield one reservation. Closure changes
   reject conflicting bookings, and equipment cannot be overallocated. The
   isolated MySQL test below also checks stale REPEATABLE READ snapshots.
5. `/login`, `/` and `/portal` return a nonce-bearing CSP through Nginx; scripts,
   theme switching, uploaded images and navigation work. HTTPS includes HSTS.
6. Reports/cleanup reject oversized requests safely. Private proofs cannot be
   read without authorization, and cleanup preserves transaction records.
7. Run health/uptime/error monitoring and a backup restore rehearsal. Record
   expected volume and measure latency, error rates, memory and queue depth
   under representative traffic before calling capacity verified.

The optional integration command uses local configured MySQL credentials only
to create/drop a random `dinks_equipment_test_*` database and temporary proof
directory; it never migrates/writes the configured application database:

```sh
php tests/Integration/equipment-concurrency.php
```

Run it on a development/staging MySQL host with create/drop privileges for test
databases. Do not grant those privileges to the production application account.
The local agent's attempt was blocked by an approval-service usage limit, so
this release's MySQL-specific concurrency verification is still pending.

## Optional demo reset after rehearsal

Only use this for a deliberate demo wipe before business use. A reset is not a
deployment prerequisite and is not a bug fix. Back up and verify database/files,
stop notification workers, and use maintenance mode before invoking the guarded
interactive command:

```sh
php artisan down
php artisan system:reset-demo --force
```

Read its deletion summary and type `WIPE DINKS ON US PRODUCTION` only if this is
the intended environment. Production refuses the repository's default password
and `.test` Manager email. The command removes business/content records, pending
and failed jobs, managed uploads, sessions and other users, then recreates only
the configured Manager. Configure courts, rates, equipment and payment methods
again, or deliberately use the separately guarded default-data seeder described
in `PRODUCTION.md`. Verify the blank state before `php artisan up` and restarting
workers. File deletion cannot be rolled back by the database transaction.

## Rollback

Retain the previous release and frontend build. If verification fails, stop new
traffic/jobs, restore the previous compatible code/build and restart services.
The new migrations are additive and can remain while reverting code. Never drop
verification/queue tables containing accepted work just to roll back a release.
Restore a database/upload backup only under an explicit recovery decision,
accounting for records and files created since the backup.

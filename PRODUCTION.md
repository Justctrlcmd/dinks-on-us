# Production constraints

**Production status:** Not configured  
**Current target:** Local development  
**Production compatibility:** Not yet verified

No backend host, frontend host, managed database, public domains, storage provider, email provider, queue worker, scheduler, persistent process, concurrency target, monitoring service, backup policy, or rollback mechanism has been selected.

## Required deployment discovery

Before deploying, record the Laravel and Next.js platforms, exact Node/PHP/MySQL versions, frontend/API domains, TLS termination, reverse proxies, environment-secret mechanism, writable storage, mail provider, build commands, migration procedure, and platform limits. Confirm whether Next.js runs as a Node server or static output; this foundation assumes a Node-capable deployment unless adapted.

## Cookies and Sanctum

Production requires HTTPS. Align `APP_URL`, `FRONTEND_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`, `API_URL`, `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN`, and CORS. Use `SESSION_SECURE_COOKIE=true`. Same-site subdomains are recommended; unrelated top-level domains are incompatible with Sanctum’s first-party SPA model without redesign. Verify proxy trust, cookie domain, CSRF requests, and logout in the deployed topology.

## Data and changes

Use MySQL backups with documented retention and restore drills. Run migrations as a controlled release step and back up before destructive changes. Never edit an already-deployed migration; add a new one. A production release needs health checks, centralized logs without secrets, error monitoring, uptime monitoring, and a rollback plan for application code and schema compatibility.

## Unconfigured facilities

- Files use the local disk only in development. Choose durable shared storage before user uploads.
- Reservation payment proofs are private files and currently rely on the local disk. Choose durable private storage with authorized retrieval before production.
- Mail uses the log driver. Reservation email templates exist, but delivery is disabled by default through `RESERVATION_EMAILS_ENABLED=false`; choose a real provider and verified sender before enabling it.
- Queues run synchronously; no worker is required or assumed.
- Scheduler and WebSockets are unused.
- Redis is not required.
- Expected concurrency and rate-limit store behavior are unknown.

Shared hosting must be checked for PHP, Composer, cron, shell, symlink, permissions, and document-root limitations. A VPS additionally needs web server, PHP-FPM, Node process management, TLS, firewall, backups, and worker supervision decisions. Do not add an infrastructure-dependent feature until these constraints are updated.

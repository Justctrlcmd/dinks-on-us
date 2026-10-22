# Security baseline

This baseline applies to the Laravel API, Next.js frontend, MySQL data, private
payment proofs, public images, sessions, and deployment configuration. It is a
release gate, not a claim that the system is invulnerable.

## Identity and sessions

- Passwords require 8–255 characters and confirmation when created or reset.
- Passwords are stored with Argon2id. Production uses the configured Argon
  memory, thread, and time costs; CI uses lower costs only for test speed.
- Existing bcrypt passwords are accepted during migration and automatically
  rehashed to Argon2id after a successful login. Keep `HASH_VERIFY=false` during
  that transition, then set it to `true` after all stored hashes are Argon2id.
- MFA is intentionally not required for this project at this time.
- Sanctum uses server-side session cookies with CSRF protection. Authentication
  must not be stored in `localStorage`.
- Login rotates the session identifier. Logout invalidates the session and
  rotates the CSRF token.
- Password changes, staff password resets, staff deactivation, staff soft deletion, and role changes
  invalidate affected database sessions and rotate remember-me tokens so an old
  cookie cannot recreate a revoked session. Bulk role revocation does both.
- Role create/update/delete, staff password reset, staff soft deletion, and manual proof deletion
  require the acting user's current password.
- Login successes/failures and privileged account/access changes write safe
  audit records. Failed-login records use an HMAC fingerprint, not the email.

## Requests, authorization, and data

- FormRequests are authoritative. Persist only `validated()` or `safe()` data;
  never pass unvalidated request arrays to models.
- Collection filters, sort fields, and identifiers use allowlists and typed
  rules. Array sizes and pagination are bounded.
- Use Eloquent or parameter binding. Never interpolate request data into raw SQL,
  identifiers, `orderByRaw`, or database expressions.
- Backend module authorization is required even when the frontend hides an
  action. Object retrieval must also enforce the relevant reservation status.
- API errors expose safe messages and stable codes; technical exceptions and
  SQL details belong only in protected logs.
- Rate limits are layered across the API, authentication, public reads,
  reservation submission, uploads, reports, private proof reads, and destructive
  operations. Identity limits complement IP limits where NAT or proxy sharing is
  expected.
- Throttled API responses preserve their server-provided `Retry-After` duration.
  State-changing portal and public CTAs use that duration to disable only the
  action that was throttled and show its countdown. This client feedback never
  replaces server-side enforcement.

## Browser and output safety

- React renders user text as text. Arbitrary HTML rendering is prohibited.
- The frontend uses dynamic rendering to set a per-request nonce Content Security Policy. Scripts require
  that nonce; objects and framing are denied. External connections and images
  are restricted to the configured API origin, with Google Maps allowed only in
  frames.
- API and frontend responses set nosniff, deny framing, restrict referrers and
  browser capabilities, and disable the obsolete XSS auditor. Authenticated and
  management API responses are not cached.
- HSTS is enabled only after HTTPS is confirmed in production.
- Push-notification navigation accepts same-origin destinations only.
- Successful login/logout cancels outstanding reads and clears browser query and
  mutation caches. Session expiry clears private data and redirects the portal.
- Push endpoints are allowlisted HTTPS provider URLs, checked both when saved and
  before delivery. Redirects are disabled; network timeouts are bounded. The
  Apple host family follows [Apple's Web Push documentation](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers),
  with [Mozilla's endpoint](https://mozilla-services.github.io/autopush-rs/) and
  [Google's FCM endpoint](https://developer.chrome.com/blog/push-notifications-on-the-open-web)
  restricted to their known hosts.
- Report requests cap at 366 inclusive days. Manual proof preview/deletion caps
  at 1,000 eligible records and rejects larger ranges before file I/O.

## Files and secrets

- Images must pass file, decoded-image, MIME, extension, size, and dimension
  validation. Accepted images are decoded, bounded, orientation-corrected,
  resized, assigned generated names, and re-encoded as WebP.
- SVG and executable content are not accepted as uploaded images.
- Payment proofs use private storage with framework serving disabled. Reads are
  authorized, path constrained, no-store, nosniff, and sandboxed.
- Public images contain no trusted original filename and are deleted if their
  database transaction fails.
- Secrets remain in environment/secret storage. Never commit `.env` files,
  private keys, credentials, access tokens, or production exports.

## Release gate

Run these from a clean checkout using the intended release environment:

```text
cd backend
composer audit --locked --no-interaction
composer validate --strict --no-check-publish
vendor/bin/pint --test
php artisan test
php artisan security:check --production

cd ../frontend
npm audit --audit-level=high
npm run lint
npm run typecheck
npm test
npm run build
```

Resolve high/critical dependency findings or record a time-bounded, reviewed
exception. Rotate any credential suspected of exposure; removing it from Git is
not sufficient. Back up and test rollback before schema changes.

## Guest reservation email verification

Online checkout requires inbox verification before payment, enforced again by
Laravel on submission. Checkout capabilities remain in browser memory and are
stored only as SHA-256 digests. Codes use application-keyed HMAC digests, a
10-minute lifetime, five incorrect attempts, and single use. Resend replaces the
code after 60 seconds. Send limits: one/minute and five/hour per normalized email,
five/minute and twenty/hour per IP. Verify limits: ten/minute per checkout key
and thirty/minute per IP. Shared cache storage is required across instances.

Verified access lasts 30 minutes and is consumed atomically with the reservation.
Rollback preserves access, and idempotent retrieval requires the original checkout
key and email. This proves temporary inbox access, not personal identity, payment,
or permanent deliverability. It grants no account access and holds no availability.
Codes and checkout keys must not enter request logs. Outside local/testing,
non-delivering mail transports or fallbacks are rejected without bypassing email
verification. Production security checks enforce delivery-capable configuration.
SMTP is bounded by `MAIL_TIMEOUT` (10 seconds by default); delivery happens after
the verification row/cooldown commits. A failed send invalidates only its own
unused code and retains resend throttling. Push and optional status emails use
durable jobs with bounded retries; queued status-email snapshots are encrypted.
Run migrations and supervise the worker before enabling them. Production
reset/seeding rejects the known repository password and `.test` Manager email.
See [the VPS release checklist](../deployment/hostinger-vps.md) for the remaining
deployment and backup/restore checks.

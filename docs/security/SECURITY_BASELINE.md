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
  invalidate affected database sessions.
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

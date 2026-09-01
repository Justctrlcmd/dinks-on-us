# Payment Proof Retention Module Plan

**Status:** Implemented; release verification completed locally  
**Workspace:** Portal → Management → Storage & Data Retention  
**Access key:** `MANAGEMENT_STORAGE_RETENTION`

## Goal

Reduce private file-storage usage without deleting or weakening reservation,
payment, reporting, or audit records. Authorized personnel manually choose an
inclusive reservation booking-date range, preview the effect, confirm the
operation, and delete only the matching payment-proof image files.

This module never runs on a schedule. It does not register a cron task, Laravel
scheduler command, queue job, retention timer, or automatic purge policy.

## System baseline and delivered target

The plan starts from the behavior already implemented in the repository:

- Laravel stores payment-proof images on the private `local` disk under
  `reservation-payment-proofs`.
- `reservation_payments.proof_path` stores the file reference; the image bytes
  are not stored as a database blob.
- Online reservations require a proof. Walk-ins, add-ons, and settlement
  payments may have an optional proof.
- Upload validation accepts JPG, JPEG, PNG, and WebP images up to 5 MB.
- New uploads are normalized to private WebP files after validation; existing
  stored proofs are not converted automatically.
- Authorized Dashboard, Reservation, and History routes serve proofs privately.
- Finalized reservations use `COMPLETED`, `CANCELLED`, `REJECTED`, or `NO_SHOW`.
- The shared `audit_logs` table and paginated Availability & Closures activity
  pattern already provide the project reference for management activity.
- Production storage, backups, queues, and a scheduler are not configured.

## Non-negotiable behavior

1. Cleanup is manual only and begins with an explicit user action.
2. The date range uses the reservation's date-only `booking_date`, inclusive of
   both selected dates. It does not use upload time or payment creation time.
3. Only finalized reservations are eligible.
4. Every eligible payment kind is included: initial, add-on, and settlement.
5. Only the physical proof image and its active `proof_path` reference are
   removed.
6. Reservation and payment rows, amounts, methods, references, statuses,
   customers, timestamps, adjustments, refunds, histories, and reports remain.
7. Payment-method QR codes, gallery images, event images, and other uploads are
   outside this module.
8. A required preview must run before the destructive confirmation.
9. The backend revalidates the range and eligibility when deletion is submitted;
   frontend confirmation is not treated as authorization or validation.
10. One summarized audit entry is recorded only when the cleanup successfully
    deletes at least one physical proof image. Missing-only and failed attempts
    remain outside the success activity list.
11. No customer identity, payment reference, file path, user agent, or raw audit
    JSON is shown in the activity interface.

The initial functional scope does not invent a minimum age beyond requiring a
final reservation status. Before production enablement, the business owner must
confirm the applicable accounting, dispute, privacy, and backup-retention policy
for payment receipts. That policy may restrict which finalized ranges personnel
are allowed to select, but it must not turn cleanup into an automatic process.

## Target user flow

1. The user opens **Management → Storage & Data Retention**.
2. The user selects **From booking date** and **To booking date** using the
   shared `CalendarDatePicker`.
3. The user selects **Preview cleanup**.
4. The page shows only:
   - selected booking-date range;
   - eligible finalized reservation count with an existing proof image;
   - existing payment-proof image count;
   - estimated reclaimable storage;
   - optional counts by final reservation status when they help explain scope.
5. If no proofs match, no destructive action is offered.
6. The user opens a destructive confirmation dialog. The dialog repeats the
   range, image count, and estimated size and states that images cannot be
   viewed after deletion.
7. On confirmation, the backend re-runs the candidate query and removes eligible
   proof files synchronously.
8. The result toast and refreshed summary report actual files deleted and actual
   storage reclaimed. A successful deletion appears immediately in the activity
   list.

Changing either date invalidates the previous preview and disables deletion
until a new preview succeeds.

## Meaningful activity log

Follow the Availability & Closures activity layout: compact cards, five records
per page, newest first, loading/error/empty states, and shared pagination.

Each visible cleanup activity contains only:

- action: `Payment proofs deleted`;
- inclusive booking-date range;
- number of proof images deleted;
- number of reservations affected;
- storage reclaimed, formatted as KB, MB, or GB;
- number of already-missing files only when non-zero;
- successful or partial completion state;
- actor display name;
- action date and time.

Example:

```text
24 payment proofs deleted
Booking dates Aug 1–31, 2026 · 18 reservations · 82.4 MB reclaimed
Deleted Aug 30, 2026, 4:15 PM by Maria Santos
```

Do not show customer names, contact details, reservation references, payment
references, payment amounts, database IDs, private storage paths, IP addresses,
or user-agent values in this activity list.

## Data changes

Add a new migration; do not edit the existing reservation migration.

Implemented nullable fields on `reservation_payments`:

```text
proof_deleted_at
proof_deleted_by_user_id
```

These fields distinguish a deliberately removed proof from a payment that never
had one. `proof_deleted_by_user_id` uses `nullOnDelete` so removing a staff
account never damages payment history.

The existing `audit_logs` table remains the batch activity authority. The
implemented action constant is:

```text
PAYMENT_PROOFS_DELETED
```

The internal audit snapshot may retain payment IDs for traceability, but its API
resource must expose only the summarized fields listed above. It must never store
or return the deleted file contents.

## Backend shape

Use two focused services; do not put storage operations in controllers and do
not add a generic repository layer:

- `PaymentProofStorageService` owns validation-adjacent optimization, generated
  paths, private storage, existence, size, and deletion mechanics.
- `PaymentProofRetentionService` owns eligible queries, chunking, lifecycle
  metadata, result summaries, and audit orchestration.

Implemented responsibilities:

- build the shared eligible-payment query;
- calculate preview counts and file sizes;
- revalidate final statuses and date boundaries during deletion;
- lock each candidate before clearing its path;
- delete or identify the private file;
- set `proof_path` to `NULL` only after successful deletion or confirmed absence;
- write `proof_deleted_at` and `proof_deleted_by_user_id`;
- leave a path unchanged when storage reports a deletion failure;
- return actual deleted, missing, failed, and reclaimed-byte totals;
- write one safe batch audit entry.

Process candidates in deterministic ID order and bounded chunks. The final chunk
size should be selected after local testing against the expected host limits.
Because filesystem operations and SQL transactions are not one atomic system,
failures must be isolated per proof: a failed file deletion must not clear that
payment's path or roll back other successful deletions.

Implemented endpoints:

```http
GET  /api/v1/management/payment-proof-retention/preview?from=YYYY-MM-DD&to=YYYY-MM-DD
POST /api/v1/management/payment-proof-retention/delete
GET  /api/v1/management/payment-proof-retention/activity?page=1
```

All routes require authentication, an active account, and
`MANAGEMENT_STORAGE_RETENTION`. Inputs use FormRequests, responses use the
standard API envelope, and technical storage failures remain in server logs.

The delete request repeats the inclusive range and includes an accepted
confirmation boolean. A prior preview improves safety but is never trusted as a
substitute for the deletion request's server-side query.

## Upload optimization

Upload optimization is a separate delivery phase from historical cleanup. It
does not make deletion automatic.

- Continue accepting JPG, JPEG, PNG, and WebP up to 5 MB.
- Normalize new proof uploads to WebP on the backend after validation.
- Correct image orientation, remove unnecessary metadata, and preserve enough
  resolution and quality for receipt text to remain readable.
- Store only the optimized private WebP result; do not retain the original upload.
- Apply the same path to online, walk-in, add-on, and settlement proofs.
- Do not convert existing stored proofs as part of the first release.
- PHP GD WebP support is used by the implementation. The target production
  runtime must provide the same capability before deployment.

## Frontend alignment

Add one card to the existing Management workspace and one thin route under
`/portal/management/storage-retention`. The complete screen belongs in a portal
view, with API calls in a domain service and server-state behavior in query and
mutation hooks. Keep this workspace as the final item in the Management card and
sidebar order.

Reuse:

- `PageHeader` for concise context;
- `CalendarDatePicker` for both dates;
- compact shadcn cards and buttons;
- the Availability & Closures activity-card density and pagination pattern;
- shared loading, error, empty, dialog, toast, and date-formatting behavior;
- hierarchical query keys and narrow invalidation after deletion.

The delete button uses the semantic destructive variant. The interface must not
show a per-reservation table because the decision is range-based and individual
business data is not needed to understand the cleanup scope.

## Delivery phases

### Phase 1 — Compatibility and storage foundation — completed

- Confirm current PHP image extensions and WebP encoding support.
- Confirm the business-approved receipt retention and backup policy without
  introducing an automatic age rule.
- Add focused proof-storage/retention services without changing the configured
  storage provider.
- Add the new access module and migration fields.
- Centralize future proof storage so all four payment flows behave consistently.
- Add upload normalization for new files only.
- Test accepted formats, invalid images, readability, failed transactions, and
  orphan-file prevention.

### Phase 2 — Read-only cleanup preview — completed

- Add validated inclusive booking-date filters.
- Query finalized reservations and all related payment kinds.
- Calculate proof count, reservation count, status summary, and reclaimable bytes.
- Expose only the aggregate preview API.
- Add authentication, authorization, boundary, empty-result, and file-missing
  tests.

No deletion is introduced in this phase.

### Phase 3 — Manual deletion workflow — completed

- Add the confirmed delete endpoint and retention service operation.
- Delete files in bounded chunks and update only proof lifecycle fields.
- Preserve all business rows and values.
- Handle successful, already-missing, failed, repeated, and partially successful
  operations safely.
- Add the batch audit action and verify deleted proofs return `404` while payment
  details return `proof_url: null`.

### Phase 4 — Management screen and activity — completed

- Add the Management card, route, date controls, preview summary, and destructive
  confirmation dialog.
- Add the paginated activity resource, endpoint, query, and compact activity cards.
- Show only meaningful aggregate data.
- Invalidate preview, activity, and affected reservation/history detail queries
  after deletion.
- Verify keyboard use, focus, labels, mobile layout, dark mode, loading, error,
  empty, zero-match, and partial-result states.

### Phase 5 — Release verification — completed locally

- Run backend feature tests, frontend unit/component tests, schema drift checks,
  lint/type checks, and the webpack production build. The default Turbopack
  build is blocked in this sandbox by its internal process-port restriction.
- Measure deletion request duration and choose a documented safe range/batch limit.
- Verify no Laravel scheduler entry, cron instruction, recurring automation, or
  queue worker is introduced.
- Verify database backups before migration and document that storage-provider or
  infrastructure backups may retain deleted images until their own retention
  window expires.
- This document was updated to the implemented status after the complete
  workflow and local verification finished.

## Acceptance criteria

- A user cannot delete without the dedicated module access.
- A user cannot delete without valid inclusive dates and explicit confirmation.
- Operational reservations are never eligible.
- A cleanup includes every proof-bearing payment on eligible reservations.
- Successful cleanup removes image bytes and sets only proof lifecycle fields.
- Payment and reservation row counts do not decrease.
- Payment amounts, references, statuses, and reports are unchanged.
- Repeating the same cleanup is safe and does not create false deletion counts.
- Failed storage deletions retain their `proof_path` for retry.
- Proof endpoints return `404` after deletion and detail resources return no URL.
- One aggregate activity entry is available without exposing private or technical
  data.
- No automatic deletion mechanism exists.

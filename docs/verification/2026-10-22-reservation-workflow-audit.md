# Reservation workflow audit — 22 October 2026

This audit follows the cumulative-reschedule defect through staff forms, service
requests, transactional writes, cached queries, customer emails, history, and
reports. It also runs the repository's full automated suites. It is not a claim
that every possible production behavior is bug-free.

## Findings and fixes

| Finding | Correction | Regression evidence |
| --- | --- | --- |
| Add-ons used the table row's old booking date and could fall back to old totals/credit. Completion and cancellation used table-row financial values. | All four financial dialogs wait for a successful current-detail fetch and validate the current status. Changed details discard old form/confirmation state. | `add-ons-dialog.test.tsx`, `finalize-dialogs.test.tsx`, `reschedule-dialog.test.tsx` |
| An old confirmation could record an amount different from the amount staff reviewed after another payment or pricing change. | Current staff UI sends reviewed monetary amounts. API compares inside the existing transaction, returns `409 RESERVATION_REVIEW_CHANGED` on mismatch, and commits no tentative change. UI refreshes the booking/options instead of replaying the write. Older clients without quotes remain compatible. | `test_staff_review_quotes_prevent_silent_repricing_and_roll_back_tentative_changes`, `test_full_refund_does_not_silently_increase_after_another_payment`; service serialization and mutation-hook tests |
| A second, zero-payment reschedule email repeated an earlier additional payment. Timestamp matching would also fail when changes share a timestamp. | Each new schedule-history row records its own payment amount, including zero. Email jobs snapshot the history; legacy unknown amounts remain null. | `test_later_reschedule_email_does_not_repeat_an_earlier_additional_payment`, `test_queued_reschedule_mail_keeps_its_own_payment_snapshot` |
| No-show after a cheaper reschedule retained a refundable credit despite the non-refundable policy. | No-show forfeits credit without creating a refund or changing collected payments. API also presents legacy no-show credits as zero. | `test_no_show_forfeits_previous_reschedule_credit_without_creating_a_refund` |
| Credits/refunds disappeared from details when there were no add-ons; cancellation could describe a recorded refund as still refundable. | Balance/credit appears in the current summary independently of add-ons. Final outcomes use “Refund recorded” or “Refund due”. | `reservation-detail-dialog.test.tsx` |
| Rescheduling all slots replaced previous ADD_ON rows, causing the operations report to forget purchased court extensions. | Extension count consults historical slot purchases; utilization still counts only current slots. | Extended `test_repeated_rescheduling_keeps_all_purchased_slots_players_equipment_and_payments` |
| Successful reservation actions left History, Reports, and Action Logs cached; guest submission could leave management reservation/report data cached. | Shared hooks invalidate affected query families, await active refreshes, and preserve successful detail responses against late reads. | `use-reservation-mutations.test.tsx` |
| Missing/failed add-on option data could be presented as zero-priced controls. | Shared loading/error states block review until pricing and availability are usable. Unavailable selections disable review. | `add-ons-dialog.test.tsx` |
| Reducing an add-on to an amount covered by credit could leave a hidden non-cash receipt requirement. | Clear unneeded payment selections/evidence and omit payment fields for a credit-covered action. | `drops hidden payment requirements when existing credit covers a reduced add-on` |

## Follow-up: revisions, retries, and real MySQL checks

The following gaps from the first audit are now addressed in local code:

| Gap | Correction | Evidence |
| --- | --- | --- |
| Monetary quotes alone could not detect same-price or free changes by another staff member. | Successful service mutations advance a revision. Current financial requests include `expected_revision`, checked after locking the booking. | `test_same_price_edits_require_the_revision_staff_actually_reviewed`, `test_revision_check_includes_free_additions_and_failed_attempts_do_not_consume_a_key`; real MySQL competing-staff scenario |
| Retrying an unconfirmed staff write could repeat a purchase, payment, refund, or email. | Actor-scoped durable action receipts serialize matching request keys inside the existing transaction. Matching retries recover the current booking without repeating effects; changed payloads conflict. | Add-on, walk-in, reschedule, verification, and finalization retry tests, proof-file deduplication, actor/authorization tests, real MySQL simultaneous-retry scenario |
| A page remount could lose an unconfirmed request key. | Staff hooks retain only opaque keys and intent hashes in session storage across remounts/reloads. They clear confirmed/explicitly changed requests and preserve keys across network, auth, validation, and throttle failures. | `reservation-request-key.test.ts`, mutation-hook retry/remount test, service header/revision serialization tests |
| Altering payment evidence during a retry could be mistaken for a new purchase. | The client keeps the purchase's retry key; the server rejects changed payment/proof details. The UI refreshes and exits the old confirmation before another change. Replays explicitly say the request was already recorded. | Changed-proof backend test and altered-retry confirmation test |
| Database-creation permissions prevented local MySQL contention tests. | An explicit local-only table-prefix mode creates and cleans up random private test tables without migrating existing application tables. Test-only constraint names are hashed to meet MySQL limits. Existing user/reservation row counts are checked afterward. | `php tests/Integration/equipment-concurrency.php --table-prefix` |
| An old transaction snapshot could hide a newly committed rate and accept a stale reschedule quote. | Configuration and its rate-period rows use current locking reads. | New MySQL regression first reproduced the incorrect acceptance, then passed after the fix |
| An old transaction snapshot could hide committed ledger rows or return stale financial relations. | Recalculation and successful/replayed write responses read current locked financial/schedule rows. | MySQL completion scenario retains a just-committed add-on and returns both payments, the adjustment, and no incorrect refund |

The retry header makes reviewed amounts and revisions required for current
financial requests (walk-ins have no prior revision). Old clients without the
header remain compatible; this is a deliberate rollout boundary. Retry receipts
store hashes/IDs, not customer fields or payment images. No scheduled cleanup or
production operation was introduced.

## Booking-to-report proof

The extended API feature test performs this sequence on one reservation:

1. Buy two slots for ₱2.
2. Reschedule and purchase two more slots, one additional player, and free equipment: four slots, ₱104 collected.
3. Move all four slots freely without another payment.
4. Buy a fifth slot: ₱105 collected.
5. Move all five slots again without another payment.
6. Start and complete the reservation.
7. Assert five current slots, preserved players/equipment, four schedule histories, three payments totaling ₱105, no duplicate settlement, and released old slot locks.
8. Read History through its API and assert the same schedule/paid total.
9. Read report APIs: recognized revenue ₱105, verified collections ₱105 across three payments, one reservation with purchased extra court time, five completed court hours.
10. Repeat completion and assert a conflict without another payment.

Separate scenarios cover cheaper/more expensive reschedules, partial credit use,
refund limits, slot/equipment conflicts, stale replacement counts, more than 48
cumulative slots, status/authorization checks, and rollback. Frontend component
and service tests verify current-detail gating, payloads, financial review,
loading/error behavior, and cache updates. These tests exercise each side of the
UI/API contract; they are not a live-browser end-to-end run.

## Validation

| Check | Result |
| --- | --- |
| Backend `php artisan test --compact` | 229 passed, 1,933 assertions |
| Frontend `npm test -- --maxWorkers=2` | 209 passed across 57 files |
| Frontend `npm run typecheck` | Passed |
| Frontend `npm run lint` | Passed |
| PHP Pint on affected PHP files | Passed |
| Local MySQL concurrency harness | 11 scenarios passed |
| `git diff --check` | Passed |

Backend scenarios use real application routes, validation, authorization,
transactions, resources, persistence, and rendered mail templates against the
isolated test database. Frontend scenarios use the existing components and query
client with controlled service/query responses. No frontend test timeout was
increased; two workers kept the full run within the existing per-test limit.

## Local database and release

The additive migration `2026_10_22_000003_record_reschedule_payment_amount` was
applied to the local development database. It adds one nullable decimal column;
existing historical payment amounts are left unknown. The additive `2026_10_22_000004_guard_staff_reservation_actions` migration was
also applied locally for revisions and retry receipts. No production deployment
or production data modification was performed. Production needs these migrations,
updated backend, rebuilt/restarted frontend, and restarted mail workers.

## Boundaries

- Ordinary backend tests use SQLite. The separate MySQL harness now verifies
  eleven targeted scenarios using independent connections under REPEATABLE READ:
  concurrent public/walk-in stock allocation, six closure/booking stale-snapshot
  cases, simultaneous matching staff retries, competing stale staff edits, a
  committed rate change, and completion after a committed add-on. These local
  checks do not establish production capacity or cover every possible deadlock.
- Live browser verification was unavailable because browser control is disabled
  in this Work environment. No visual/mobile/browser result is claimed.
- This audit did not send production emails or exercise the deployed reverse
  proxy, cookies, SMTP provider, or worker supervision. Those remain release
  smoke checks described in `PRODUCTION.md`.
- Current staff requests send the retry header and required review metadata.
  Legacy clients without that header retain their earlier contract. Intentionally
  issuing a new key starts a new action; cleared browser storage cannot recover
  a previously lost key. The system does not guess duplicates from customer data.
- Previously created schedule history is not rewritten to infer missing
  per-operation payments. Existing stored payments and audit records remain the
  financial source of truth.

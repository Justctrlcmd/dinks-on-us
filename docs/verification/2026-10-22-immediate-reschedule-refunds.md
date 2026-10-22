# Immediate reschedule refunds — 2026-10-22

Cheaper reschedules require the exact reviewed refund plus confirmation that the
customer has received it. The existing schedule transaction records a completed
refund and leaves zero reusable credit. Gross payment records remain intact;
later financial actions use payments minus completed refunds. Old unsettled
credits are not automatically converted to completed refunds.

The confirmation requires an unchecked acknowledgment and resets it when staff
go back to review. Successful actions close both dialogs. Emails show the current
operation's refund separately from total refunded and paid after refunds.
Cancelled/no-show emails and details do not show a new balance to collect.

## Automated verification

- Full backend suite: 235 tests passed.
- Full frontend suite: 220 tests passed. A subsequently added retry-key case and
  the final affected frontend checks passed together (30 tests).
- Final affected backend checks: 59 tests passed after the retry/email refinements.
- TypeScript, ESLint, Pint, and whitespace checks passed.
- Local MySQL integration harness: all 13 scenarios passed, including concurrent
  matching refund retries and an add-on whose old transaction snapshot predates
  the completed refund. The latter must collect fresh money, not reuse the refund.
  The harness used isolated random tables and checked existing application counts.

Covered paths include missing/false acknowledgment, missing/stale refund quote,
rollback preserving old slots and receipt eligibility, repeated reschedules,
same-operation add-ons netting the final refund, explicit legacy-credit settlement,
duplicate/lost-response retries (including a refreshed zero-refund review), later
add-ons, completion without another refund, cancellation capped at retained funds,
no-show revenue, and event-time queued email snapshots.

## Local release and manual check

The additive `2026_10_22_000005_record_reschedule_refund_amount` migration is applied
locally. Restart the local mail worker for updated email handling. No production
deployment or live inbox delivery was performed by these checks.

1. Verify a booking, then select a cheaper replacement schedule.
2. Review the exact refund; Confirm refund and reschedule stays disabled until
   the customer-repayment acknowledgment is checked. Back/review clears it.
3. Return the money outside the website, acknowledge receipt, and confirm once.
4. Both dialogs close. Details show the refund and net funds, with no credit left.
5. Add a new player/court slot: its price requires fresh payment.
6. Reschedule again to an equal total: no second refund is requested or emailed.

For production, apply the additive migration before the updated backend, deploy
the matching frontend, and restart supervised workers. Older cheaper-reschedule
requests without refund confirmation fail safely instead of carrying new credit.

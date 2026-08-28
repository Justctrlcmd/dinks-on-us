# Dinks on Us — Business Rules

## 1. Purpose

This document defines the core business rules that govern the behavior of the Dinks on Us reservation and management system.

These rules should be treated as authoritative when implementing:

* Database constraints
* API behavior
* Reservation logic
* Availability logic
* Role and access control
* Payment verification
* Walk-in handling
* Reservation history
* Reports and analytics

If a future implementation conflicts with a rule in this document, the business rule should take priority unless the client explicitly changes the requirement.

---

# 2. Reservation Account Rule

Players are **not required to create an account**.

A player can make a reservation by providing the required customer and payment information.

The system should not require customer authentication before reservation submission.

---

# 3. Reservation Structure

A reservation can contain one or more court/time slots.

Each slot represents:

* One court
* One date
* One one-hour period
* One applicable rate

Example:

```text
Court 1
August 15, 2026
3:00 PM – 4:00 PM
₱500
```

A reservation acts as the parent transaction, while each selected slot must remain independently trackable.

Conceptually:

```text
Reservation
   │
   ├── Reservation Slot
   ├── Reservation Slot
   ├── Reservation Slot
   └── ...
```

---

# 4. One-Hour Slot Rule

All reservable time slots are based on **one-hour intervals**.

Example:

```text
7:00 AM – 8:00 AM
8:00 AM – 9:00 AM
9:00 AM – 10:00 AM
```

The system should calculate availability and pricing per one-hour slot.

---

# 5. Multiple Slot Selection Rule

A player may select multiple available slots under one reservation.

Selected slots:

* Do not need to be consecutive
* May belong to different courts
* May belong to different time periods
* Are paid under one reservation

Example:

```text
Reservation RF-125

Court 1
9:00 AM – 10:00 AM

Court 2
10:00 AM – 11:00 AM

Court 1
1:00 PM – 2:00 PM

Court 3
6:00 PM – 7:00 PM
```

This is valid as long as every selected slot is available at the time of submission.

All slots under one reservation reference must use one booking date. After the customer selects the first slot, other dates are disabled until every selected slot is removed. Different courts and non-consecutive times on that date remain valid.

---

# 6. Slot Availability Rule

A court/time slot may only be selected when it is currently available.

A slot becomes unavailable when it is occupied or blocked by any active business record.

Availability must consider:

* Waiting-for-verification online reservations
* Verified reservations
* Walk-in reservations
* Ongoing reservations
* Reservation extensions
* Closed dates
* Blocked courts
* Blocked time slots

The system must use one shared source of truth for court availability.

---

# 7. Atomic Reservation Submission Rule

When a reservation contains multiple selected slots, all slots must still be available when the final reservation is submitted.

The system should validate every selected slot again during submission.

If even one selected slot has become unavailable:

* The reservation must not be partially submitted.
* The player must be informed that one or more selected slots are no longer available.
* No selected slot should be locked by the failed submission.

The reservation should succeed only when all requested slots can be reserved together.

---

# 8. Slot Locking Rule

Once a valid reservation is successfully submitted:

* The reservation becomes **Pending**.
* Every selected slot becomes immediately unavailable to other players.

The system must not wait for Staff payment verification before locking the slots.

This prevents multiple players from paying for the same court/time slot.

---

# 9. Rejected Reservation Slot Release Rule

If a reservation is rejected:

* The reservation becomes finalized.
* Every slot associated with that reservation must be released.
* Released slots become publicly available again unless another closure or block affects them.

---

# 10. Reservation Statuses

The current reservation statuses are:

```text
PENDING
VERIFIED
ONGOING
COMPLETED
CANCELLED
REJECTED
NO_SHOW
```

Rescheduling is treated as an action that modifies the current schedule rather than a permanent final reservation status.

---

# 11. Reservation Status Lifecycle

The standard lifecycle is:

```text
PENDING
        │
        ├── REJECTED
        │
        └── VERIFIED
               │
               ├── RESCHEDULED marker → VERIFIED
               ├── CANCELLED
               ├── NO_SHOW
               └── ONGOING
                       │
                       └── COMPLETED
```

A verified reservation may be rescheduled repeatedly by the Manager. `RESCHEDULED` is a derived operational marker backed by schedule history; the stored status remains `VERIFIED` and retains the verified action set.

---

# 12. Final Reservation Status Rule

The following statuses are considered final:

* Completed
* Cancelled
* Rejected
* No-show

Finalized reservations belong in History.

They should not normally return to an operational status.

---

# 13. Pending Rule

All successfully submitted online reservations begin as:

**Pending**

During this state:

* The submitted payment has not yet been approved.
* Associated slots remain unavailable.
* Staff or Manager must manually inspect the payment information.

---

# 14. Verification Rule

Authorized Staff or Manager may verify an online reservation after reviewing:

* Payment receipt
* Payment reference number
* Selected payment method
* Reservation information

If the payment is accepted:

```text
PENDING
        ↓
VERIFIED
```

The reservation remains assigned to its selected court/time slots.

---

# 15. Rejection Rule

Authorized Staff or Manager may reject a waiting reservation when the payment or reservation cannot be accepted.

Example reasons may include:

* Invalid payment receipt
* Unverifiable payment
* Incorrect payment amount
* Duplicate or suspicious payment information
* Other valid operational reasons

When rejected:

```text
PENDING
        ↓
REJECTED
```

The associated slots must be released immediately.

---

# 16. Payment Gateway Rule

The system does **not use an automated online payment gateway**.

Payments are completed externally through configured payment methods such as e-wallets.

The system only:

* Displays the payment method
* Displays its QR code
* Collects payment proof
* Collects payment reference number
* Allows Staff/Manager to verify manually

---

# 17. Payment Method Configuration Rule

The Manager may configure multiple supported payment methods.

Each payment method may contain:

* Name
* Account name
* Account number or identifier
* QR code image
* Active / inactive status

Inactive payment methods must not be selectable by players.

---

# 18. Payment Reference Rule

Online reservation submission requires a payment reference number together with the uploaded payment receipt.

Both pieces of information should be retained for manual payment verification and audit purposes.

---

# 19. Payment Receipt Rule

A player must upload a payment receipt before an online reservation can be submitted.

The system should not accept an online reservation when the required proof of payment is missing.

---

# 20. Pricing Rule

Pricing is calculated per selected one-hour court slot.

The total reservation price is the sum of the price of every selected slot.

Example:

```text
Court 1
3:00 PM – 4:00 PM
₱500

Court 1
4:00 PM – 5:00 PM
₱500

Court 2
6:00 PM – 7:00 PM
₱600

Total
₱1,600
```

---

# 21. Dynamic Rate Rule

Rates must be configurable by the Manager.

Pricing should not be permanently hard-coded into the system.

One global court configuration defines the operating hours, players included per court, additional-player price, and weekday/weekend rate periods for every existing and future court. Individual courts do not override these shared rules. Rentable equipment is a separately managed catalog with its own reservation-wide unit price and total quantity. Inactive courts or rental equipment must not be offered in the public reservation flow.

A shared rate period defines:

* Applicable start time
* Applicable end time
* Price
* Weekday/weekend applicability

Rate periods must use whole-hour boundaries, cover every operating hour, and remain consecutive without gaps or overlaps.

The configured player count is the number included per court. Each additional player is charged once for the whole reservation. Equipment is also charged once per selected unit for the whole reservation.

Pending reservations do not hold equipment. Publicly displayed equipment availability is reduced only by verified reservations that overlap a selected reservation time. Equipment must be checked again transactionally when verification is implemented; insufficient stock prevents verification until the equipment request is adjusted.

Current temporary example:

```text
Day Rate
₱500/hour

Night Rate
₱600/hour
```

These values remain subject to client confirmation.

---

# 22. Rate Snapshot Rule

Once a reservation is submitted, the system should preserve the price applied to each selected slot at the time of reservation.

Future changes to configured rates must not silently change the price of an existing reservation.

Example:

```text
Reserved on August 11:
3 PM – 4 PM = ₱500

Manager later changes rate:
3 PM – 4 PM = ₱550

Existing reservation:
Still ₱500
```

New reservations use the updated rate.

---

# 23. Walk-In Rule

Walk-in reservations are supported.

Staff may manually create a reservation for a customer physically present at the facility.

Walk-ins must use the same availability rules as online reservations.

A successfully created walk-in begins as **Verified** because Staff records the payment while creating it. The reservation does not pass through the online Pending/payment-review stage. It may later be started, completed, cancelled, or marked no-show through the normal reservation lifecycle.

Creating a walk-in sends the customer a verification email when reservation email delivery is enabled because its payment is recorded as verified at creation. A later approved reschedule may send another email with the updated schedule.

Staff must record the customer's name, email address, and contact number. Customer contact numbers must contain exactly 11 digits and start with `09`. A walk-in may include multiple available one-hour court slots on one booking date, additional players, and active rental equipment using the same configured prices and historical snapshots as an online reservation.

---

# 24. Walk-In Slot Rule

When Staff creates a walk-in reservation:

* Every selected slot must first be available.
* Once saved, those slots immediately become unavailable online.
* Walk-ins must not bypass duplicate-reservation protection.
* Rental equipment must be available across the selected reservation times because a walk-in is immediately Verified.

---

# 25. Reservation Source Rule

The system should identify how a reservation originated.

Current reservation sources:

```text
ONLINE
WALK_IN
```

This should be retained for operational tracking and reporting.

---

# 26. Closed Date Rule

Authorized management users may close an entire business date. A full-date closure applies to every court; the court selection is required only when the user chooses a slot-only closure. Every closure requires an internal reason.

When a date is closed:

* No normal court slot on that date should be publicly reservable.
* Staff should clearly see that the date is closed.

Example:

```text
August 20, 2026
CLOSED

Reason:
Private Facility Use
```

---

# 27. Specific Slot Blocking Rule

Authorized users may select a court and block specific court/time slots without closing the entire date.

A grouped block may target:

* One court
* One or more non-overlapping time ranges
* A specific date

Example:

```text
Court 3
August 22
2:00 PM – 4:00 PM
BLOCKED

Reason:
Maintenance
```

Other courts and unaffected times remain available.

All time ranges saved together belong to one closure and are reopened together. Time ranges must stay within the configured operating hours.

Reopening a closure requires a new description. The reopening description replaces the closure reason shown for that reopening’s internal activity-log event.

---

# 28.1 Public Content Ordering Rule

FAQ entries are public question-and-answer cards. Each card can be created, edited, deleted, and moved by drag-and-drop; the saved display order determines the order on the public FAQ page.

Gallery images belong to a gallery tab. Management can add, edit, delete, and drag tabs into their public order, then add, edit, move, delete, and drag images within the selected tab. Newly created tabs and images are appended to the end. The public and management galleries use only the configured tabs and do not generate an **All** tab. Deleting a gallery tab permanently deletes its contained images and stored image files.

Rules and policy are maintained as three public sections: **Reservation**, **Reschedule**, and **Cancel**. Each section contains individual bullets that can be added, edited, deleted, and reordered. The public reservation experience must display those bullets in their configured order.

---

# 28. Closure Conflict Rule

The system must not allow a Manager or Staff member to block or close a slot in a way that silently invalidates an already active reservation.

If a slot already contains an active reservation, the system should require the reservation to be handled first through the appropriate reservation process.

---

# 29. Rescheduling Rule

Only the Manager may reschedule a verified reservation. A reservation may be rescheduled repeatedly, and every change must remain in schedule history.

The new target slots must all be available before the reschedule succeeds.

The replacement schedule must contain exactly the same number of one-hour slots as the current schedule. A higher replacement price creates an additional balance. A lower replacement price creates refundable credit.

---

# 30. Atomic Rescheduling Rule

When a reservation is moved to new slots:

1. Validate all new target slots.
2. Reserve the new slots successfully.
3. Release the old slots.
4. Preserve the previous schedule in reservation history.

The system must avoid a situation where the old slots are released before the replacement schedule is secured.

---

# 31. Rescheduling History Rule

Rescheduling should preserve:

* Previous court
* Previous date
* Previous time
* New court
* New date
* New time
* User who performed the change
* Timestamp

A successfully rescheduled reservation returns to its operational verified state with the new schedule.

---

# 32. Reservation Extension Rule

Players cannot extend reservations through the public website.

Only authorized Staff or Manager may perform an extension.

---

# 33. Extension Availability Rule

Before an extension is applied:

* The requested additional slot must be available.
* The extension must use valid one-hour slot intervals.
* The new slot must pass the same availability validation as a normal reservation slot.

Once confirmed, the extension slot becomes unavailable to others.

---

# 34. Extension Pricing Rule

An extension uses the price applicable to the added slot at the time the extension is performed.

The additional charge must be added to the reservation's final billing.

---

# 35. Add-On Rule

Only an ongoing reservation may accumulate additional charges during actual play.

Possible examples include:

* Additional players
* Reservation extensions
* Other future business add-ons

Add-ons should be tracked separately from the original reservation amount.

---

# 36. Original Amount vs Final Amount Rule

The system should distinguish:

```text
Original Reservation Amount
```

from:

```text
Final Reservation Amount
```

The original amount represents the price submitted during reservation.

The final amount includes all valid adjustments and additional charges.

Example:

```text
Original Reservation
₱1,000

Additional Player
₱100

Extension
₱600

Final Amount
₱1,700
```

---

# 37. Completion Rule

A reservation may be marked **Completed** after the actual court usage has concluded and final billing has been determined.

Before completion:

* Extensions should already be recorded.
* Add-ons should already be recorded.
* Final amount should be determined.

Once completed, the reservation becomes a History record.

---

# 38. Revenue Recognition Rule

Primary business revenue analytics should use:

* Completed reservations → final collected amount
* No-show reservations → non-refundable amount already collected

A verified reservation should not automatically count as final revenue.

Reason:

* It may later be cancelled.
* It may become a no-show.
* It may gain extensions.
* It may gain add-ons.
* Its final amount may differ from the original payment.

---

# 39. No-Show Rule

No-show status is applied manually.

The system should not automatically mark a reservation as no-show based only on time.

Authorized Staff or Manager determines when the business's no-show policy has been met.

The exact grace period remains subject to client confirmation.

---

# 40. Cancellation Rule

Current temporary business assumption:

* The customer requests cancellation through Facebook / Messenger.
* The cancellation request is handled outside the public reservation system.
* The Manager performs the cancellation inside the management system.

A cancelled reservation becomes a finalized History record.

Cancellation is an approved force-majeure action performed only by the Manager. The Manager chooses a full refund or a custom refund that cannot exceed the amount already collected. The system records the refund due but does not transfer funds automatically.

---

# 41. Cancellation Slot Release Rule

When a reservation is cancelled:

* Future associated court/time slots should be released when appropriate.
* Released slots become available again unless another business rule blocks them.

Any ongoing or already-used slots should remain preserved as historical data.

---

# 42. Event Rule

Events are informational announcements.

Each event contains a public header, image, description, and date.

Creating, editing, publishing, or deleting an event does not automatically modify court availability.

If an event requires courts to become unavailable, management must separately:

* Close a date, or
* Block the required court/time slots

---

# 43. Submission Notification Rule

After successful online reservation submission, the system does not send a customer email.

The API response and on-screen confirmation should communicate that:

* The reservation was received.
* Payment is waiting for verification.
* The selected slots are currently reserved.
* The reservation has not yet been fully verified.

---

# 44. Reservation Status Email Rule

Customer emails are sent only for an explicit reservation status event, and only when a mail provider is configured and `RESERVATION_EMAILS_ENABLED` is explicitly enabled.

Current expected notification events:

* Reservation verified
* Reservation rejected
* Reservation rescheduled

The reschedule email shows the newly active court, date, and time. Public online submission, cancellation, completion, and other reservation changes do not send customer emails. Walk-in creation is an immediate verified event and sends the verification email when enabled.

---

# 45. Reservation Reference Rule

Every reservation should receive a unique human-readable reference identifier.

Example:

```text
RF-001
```

References use `RF-` followed by a zero-padded sequence with a minimum of three digits. The sequence expands naturally after `RF-999` and must never be reused.

* Customer communication
* Staff search
* Email notifications
* Support inquiries
* Audit tracking

---

# 46. History Rule

The History module contains only finalized reservations.

Statuses included:

```text
COMPLETED
CANCELLED
REJECTED
NO_SHOW
```

Operational reservations should remain outside History.

---

# 47. History Immutability Rule

History records are considered finalized business records.

Normal Staff workflows should not allow them to be:

* Reopened
* Returned to pending
* Returned to verified
* Deleted casually

If administrative correction capability is added later, it should be explicitly controlled and audited.

---

# 48. Reservation Deletion Rule

Reservation records should not normally be permanently deleted.

Business outcomes should be represented through statuses instead.

Examples:

```text
REJECTED
CANCELLED
NO_SHOW
COMPLETED
```

This preserves historical, reporting, and audit information.

---

# 49. Manager Rule

The Manager has access to all management modules.

The Manager is the highest operational role in the current system scope.

---

# 50. Staff Role Rule

Each Staff account is assigned exactly **one role**.

The role determines which management modules the Staff member may access.

Conceptually:

```text
Staff
  ↓
Role
  ↓
Modules
```

---

# 51. Role Permission Rule

Permissions are currently **module-level**.

Example:

```text
Front Desk

Dashboard      ✓
Reservation    ✓
History        ✓
Management     ✗
Reports        ✗
```

Fine-grained permissions such as:

```text
reservation.view
reservation.verify
reservation.cancel
```

are not part of the current scope unless requirements change later.

---

# 52. Manager Role Management Rule

The Manager may:

* Create roles
* Edit roles
* Assign modules to roles
* Create Staff accounts
* Assign one role to each Staff account
* Update Staff roles

---

# 53. Manager Cancellation Rule

Under the current temporary requirement, cancellation inside the management system is Manager-only.

This may change after client confirmation.

---

# 54. Authorization Rule

Frontend visibility must not be treated as sufficient security.

Even if a Staff member cannot see a module in navigation, the backend must still verify that their assigned role allows access to the requested module.

Unauthorized requests must be rejected server-side.

---

# 55. Dashboard Data Rule

The Dashboard should derive information from actual system records.

It should not maintain duplicate independent reservation data.

Dashboard data may include:

* KPIs
* Upcoming reservations
* Weekly availability
* Verified reservations
* Available slots
* Operational counts

---

# 56. Reports Data Rule

Reports and analytics must derive from system transaction records rather than manually maintained reporting values.

Examples:

* Revenue
* Completed reservation count
* Court utilization
* Online vs walk-in reservations
* No-show count
* Cancellation count

---

# 57. Website Content Rule

The Manager may dynamically manage selected business content.

Current expected dynamic content includes:

* Rates
* Payment methods
* Payment QR codes
* Rules
* Gallery
* Events
* About Us
* Operating information
* Contact information
* Social links
* Closures
* Blocked slots

---

# 58. Website Layout Rule

The current Management system does not act as a full visual page builder.

The Manager does not currently control:

* Component positions
* Page layouts
* Fonts
* Theme architecture
* Website structure

unless these features are explicitly added later.

---

# 59. Data Consistency Rule

Any operation affecting availability must update the same underlying availability source.

This includes:

* Online reservation
* Walk-in creation
* Verification
* Rejection
* Cancellation
* Rescheduling
* Extension
* Closed dates
* Specific slot blocks

The system must avoid maintaining separate conflicting availability records for public and management views.

---

# 60. Duplicate-Reservation Prevention Rule

The system must prevent two active reservations from occupying the same:

```text
Court + Date + Time Slot
```

at the same time.

This protection must be enforced at the backend/database level and must not depend only on frontend checks.

---

# 61. Concurrency Rule

Two players may attempt to reserve the same slot at nearly the same time.

The system must guarantee that only one successful reservation can acquire that slot.

The second submission must fail gracefully and inform the player that the slot is no longer available.

---

# 62. Auditability Rule

Important management actions should preserve enough information to determine:

* What changed
* When it changed
* Which authenticated Manager or Staff member performed the action

Important actions include:

* Verification
* Rejection
* Rescheduling
* Extension
* Completion
* No-show
* Cancellation
* Role changes
* Staff account changes
* Availability blocks
* Date closures

The exact audit implementation may be defined during architecture design.

---

# 63. Pending Client Rules

The following business rules remain unconfirmed.

They should remain configurable or isolated where practical so they can be updated later without major system redesign.

## Cancellation

Pending:

* Deadline
* Refund rules
* Fees
* Staff cancellation authority

## Rescheduling

Pending:

* Allowed request period
* Limits
* Fees
* Customer eligibility

## No-Show

Pending:

* Grace period
* Late-arrival policy

## Add-Ons

Pending:

* Available add-ons
* Additional-player fees
* Other operational charges

## Rates

Pending:

* Exact operating hours
* Day/night boundaries
* Weekend differences
* Special-day rates

## Walk-In Payment

Staff records one of two payment modes:

* Cash
* E-wallet / Bank

The full calculated reservation amount is recorded as a verified initial payment. The transaction reference number and receipt image are optional for either mode.

---

# 64. Core Business Invariants

The following should always remain true:

```text
1. A court/time slot cannot have two active reservations.

2. Submitted online reservations immediately hold their selected slots.

3. Rejected reservations release their slots.

4. Walk-ins and online reservations share the same availability.

5. A reservation may contain multiple courts and non-consecutive slots.

6. Every selected slot remains individually trackable.

7. Pricing is calculated per one-hour slot.

8. Existing reservations retain the price applied at reservation time.

9. Players do not need accounts.

10. Payment verification is manual.

11. Payment receipt and reference number are required for an online reservation.

12. Only available slots can be added through reservation, rescheduling, or extension.

13. Completed, Cancelled, Rejected, and No-show records are final History records.

14. Completed reservation final amounts are the primary source of revenue reporting.

15. Staff authorization is determined by one assigned role containing module access.

16. Manager has access to all modules.

17. Availability rules must be enforced server-side.

18. Reservation records should not normally be permanently deleted.
```

---

# 65. Document Status

This document represents the current business rules agreed during system planning.

Rules marked as **Pending Client Rules** are temporary assumptions and should be reviewed after the next client meeting.

Any future change to reservation behavior, pricing, cancellation, rescheduling, payment handling, roles, or availability should update this document before implementation changes are made.

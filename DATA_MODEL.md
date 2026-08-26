# Dinks on Us — Data Model

## 1. Purpose

This document defines the conceptual data model for the Dinks on Us system.

It translates the requirements in:

* `SYSTEM_OVERVIEW.md`
* `BUSINESS_RULES.md`

into structured entities and relationships that can later be implemented in the database.

This document focuses on:

* Entity responsibilities
* Relationships
* Important fields
* Statuses
* Data ownership
* Constraints
* Availability integrity
* Historical preservation
* Reporting support

This is not yet the final Laravel migration specification.

---

# 2. High-Level Data Model

```text
MANAGER / STAFF
│
├── User
│      │
│      └── Role
│             │
│             └── Role Modules
│
├── Reservation
│      │
│      ├── Reservation Slots
│      │       └── Court
│      │
│      ├── Payment
│      │       └── Payment Method
│      │
│      ├── Adjustments / Add-ons
│      │
│      ├── Status History
│      │
│      └── Reschedule History
│
├── Courts
│
├── Rates
│
├── Rental Equipment
│
├── Availability Blocks
│
├── Closed Dates
│
├── Payment Methods
│
├── Events
│
├── Gallery Tabs
│
├── Gallery Images
│
├── Policy Sections
│
├── Policy Bullets
│
├── Website Settings
│
└── Audit Logs
```

---

# 3. Core Entity Relationship Overview

```text
Role
  1
  │
  │ has many
  ▼
Users


Role
  1
  │
  │ has many
  ▼
Role Modules


Reservation
  1
  │
  │ has many
  ▼
Reservation Slots
  │
  │ belongs to
  ▼
Court


Reservation
  1
  │
  │ has one / payment record
  ▼
Reservation Payment
  │
  │ belongs to
  ▼
Payment Method


Reservation
  1
  │
  ├── has many Reservation Adjustments
  ├── has many Reservation Status Histories
  └── has many Reservation Schedule Histories


Court
  1
  │
  ├── has many Reservation Slots
  └── has many Availability Blocks
```

---

# 4. Users

## Entity

`users`

Represents authenticated Manager and Staff accounts.

Players do not have user accounts.

### Suggested Fields

```text
id
role_id
first_name
last_name
email
password
status
last_login_at
created_at
updated_at
```

### Status

Possible values:

```text
ACTIVE
INACTIVE
```

### Rules

* Every Staff account must have exactly one role.
* Manager has access to all modules.
* Staff access is determined by their assigned role.
* Players must not be stored in this table unless the project requirements later introduce customer accounts.

---

# 5. Roles

## Entity

`roles`

Represents reusable Staff access configurations.

Examples:

```text
Front Desk
Supervisor
Operations Staff
```

### Suggested Fields

```text
id
name
description
is_system_role
created_at
updated_at
```

### Rules

* Manager can create and manage Staff roles.
* Each Staff account receives one role.
* A role can provide access to multiple modules.
* Direct per-user permissions are outside the current scope.

---

# 6. Role Modules

## Entity

`role_modules`

Defines which modules a role may access.

### Suggested Fields

```text
id
role_id
module
created_at
```

### Example

```text
role_id: 2
module: DASHBOARD

role_id: 2
module: RESERVATION

role_id: 2
module: HISTORY
```

### Current Module Identifiers

Possible module identifiers:

```text
DASHBOARD
RESERVATION
HISTORY
MANAGEMENT
REPORTS
SETTINGS
```

Management submodules may either inherit access from `MANAGEMENT` or be modeled separately later if needed.

---

# 7. Courts

## Entity

`courts`

Represents the physical pickleball courts.

Current business setup:

```text
Court 1
Court 2
Court 3
```

### Suggested Fields

```text
id
court_number
is_active
created_at
updated_at
```

### Status

```text
ACTIVE
INACTIVE
```

### Rules

* An inactive court should not produce publicly reservable slots.
* Court records should not normally be deleted once they are referenced by reservation history.
* Court numbers are assigned sequentially and are never reused after deactivation.
* Operating hours, rates, and player rules come from the singleton `court_configurations` record rather than individual courts.

## Shared Court Configuration

`court_configurations` stores the one rule set used by every existing and future court.

```text
id
opening_hour
closing_hour
included_players_per_court
additional_player_price
updated_by_user_id
created_at
updated_at
```

`opening_hour` uses `0` through `23`. `closing_hour` uses `1` through `24`, allowing `24` to represent midnight as the ending boundary.

---

# 8. Reservations

## Entity

`reservations`

Represents the parent reservation transaction.

One reservation may contain multiple independent court/time slots.

### Suggested Fields

```text
id
reference_number

source

customer_name
customer_email
customer_contact_number

status

original_amount
adjustment_amount
final_amount

notes

submitted_at
verified_at
started_at
completed_at
cancelled_at
rejected_at
no_show_at

created_by_user_id
verified_by_user_id
completed_by_user_id
cancelled_by_user_id
rejected_by_user_id
no_show_by_user_id

created_at
updated_at
```

---

# 9. Reservation Source

The reservation source identifies where the reservation originated.

Possible values:

```text
ONLINE
WALK_IN
```

### ONLINE

Created by a player through the public reservation page.

### WALK_IN

Created manually by Staff or Manager.

---

# 10. Reservation Status

Suggested values:

```text
WAITING_FOR_VERIFICATION
VERIFIED
COMPLETED
CANCELLED
REJECTED
NO_SHOW
```

### Operational Statuses

```text
WAITING_FOR_VERIFICATION
VERIFIED
```

### Final Statuses

```text
COMPLETED
CANCELLED
REJECTED
NO_SHOW
```

---

# 11. Reservation Reference Number

Each reservation must have a unique human-readable reference.

Example:

```text
DOU-20260811-0012
```

### Database Requirement

`reference_number` must be unique.

It should be searchable by Staff.

---

# 12. Reservation Customer Information

Because players do not create accounts, customer information is stored directly on the reservation.

Suggested fields:

```text
customer_name
customer_email
customer_contact_number
```

This preserves the exact information associated with the transaction.

---

# 13. Reservation Slots

## Entity

`reservation_slots`

This is one of the most important entities in the system.

Each record represents one reserved:

```text
Court + Date + One-Hour Time Slot
```

### Suggested Fields

```text
id
reservation_id
court_id

reservation_date
start_time
end_time

rate_id
rate_name_snapshot
rate_amount_snapshot

slot_type

created_at
updated_at
```

---

# 14. Reservation Slot Type

A slot may originate from:

```text
ORIGINAL
EXTENSION
```

This helps distinguish slots selected during the initial reservation from those added later during play.

---

# 15. Slot Price Snapshot

Each reservation slot should retain the price applied when that slot was acquired.

Suggested fields:

```text
rate_id
rate_name_snapshot
rate_amount_snapshot
```

Example:

```text
rate_id: 3
rate_name_snapshot: Day Rate
rate_amount_snapshot: 500.00
```

If the Manager later changes the Day Rate to ₱550:

```text
Existing reservation slot = ₱500
New reservation slot      = ₱550
```

---

# 16. Reservation Slot Uniqueness

The system must prevent active reservation conflicts for:

```text
court_id
reservation_date
start_time
```

However, because finalized reservations must remain in history, a simple permanent unique constraint across all historical rows may not always be enough by itself.

The implementation must ensure that only one **active occupancy** can claim the same court/date/time slot.

This should be protected transactionally at the backend/database level.

---

# 17. Rates

## Entity

`rates`

Stores configurable court pricing.

### Suggested Fields

```text
id
court_configuration_id
day_type
start_hour
end_hour
price
display_order
created_at
updated_at
```

### Example

```text
Start: 7:00 AM
End: 5:00 PM
Price: ₱500
```

```text
Start: 5:00 PM
End: 12:00 AM
Price: ₱600
```

---

# 18. Rate Matching

When calculating a slot price, the system determines which active rate applies based on:

```text
Reservation Date
+
Day of Week
+
Slot Start Time
```

The matched rate is then copied into the reservation slot as a snapshot.

---

# 18.1 Rental Equipment

## Entity

`rental_equipment`

Stores equipment that players may rent with a court reservation.

### Suggested Fields

```text
id
name
description
price
total_quantity
is_active
created_at
updated_at
```

Inactive equipment must not be offered to players. Equipment price is charged once per selected unit for the whole reservation. If equipment rentals are included in a reservation, the reservation must retain the item name, price, and quantity snapshot used at checkout.

Pending reservations do not reduce equipment availability. Only verified reservations consume inventory during their overlapping selected hours. Availability is derived rather than stored as a permanently decreasing counter.

---

# 19. Rate Conflict Rule

The Manager should not be allowed to create ambiguous or incomplete shared rate periods. Weekday and weekend periods must each cover every operating hour without gaps or overlaps.

Example of problematic configuration:

```text
Day Rate
7 AM – 5 PM
₱500

Afternoon Rate
3 PM – 6 PM
₱550
```

because:

```text
3 PM – 5 PM
```

matches both rates.

The system should validate rate configuration.

---

# 20. Payment Methods

## Entity

`payment_methods`

Represents configurable external payment methods.

Examples:

```text
GCash
Maya
```

### Suggested Fields

```text
id
name
account_name
account_number
qr_image_path
instructions
is_active
display_order
created_at
updated_at
```

### Rules

* Only active payment methods appear publicly.
* QR image can be replaced by Manager.
* Historical reservations should retain which payment method was used even if that method is later disabled.

---

# 21. Reservation Payments

## Entity

`reservation_payments`

Stores payment information submitted for a reservation.

### Suggested Fields

```text
id
reservation_id
payment_method_id

payment_method_name_snapshot

reference_number
receipt_image_path

submitted_amount

verification_status
verified_by_user_id
verified_at

verification_notes

created_at
updated_at
```

---

# 22. Payment Verification Status

Possible values:

```text
PENDING
VERIFIED
REJECTED
```

This is separate from the reservation status.

Example:

```text
Payment:
VERIFIED

Reservation:
VERIFIED
```

or:

```text
Payment:
REJECTED

Reservation:
REJECTED
```

---

# 23. Payment Snapshot

The payment should retain the payment method name used at submission.

Example:

```text
payment_method_id: 1
payment_method_name_snapshot: GCash
```

This preserves historical meaning if the Manager later renames or disables the payment method.

---

# 24. Walk-In Payment Handling

Walk-in payment requirements remain pending client confirmation.

The data model should support walk-ins using payment information when applicable.

Possible future payment types may include:

```text
CASH
GCASH
MAYA
OTHER
```

The exact implementation should remain flexible until confirmed.

---

# 25. Reservation Adjustments

## Entity

`reservation_adjustments`

Stores charges added after the original reservation submission.

Examples:

* Additional player
* Other add-on
* Manual adjustment

Court extensions themselves should normally create additional `reservation_slots`.

### Suggested Fields

```text
id
reservation_id

type
name
description

quantity
unit_amount
total_amount

created_by_user_id

created_at
updated_at
```

---

# 26. Adjustment Types

Possible values:

```text
ADDITIONAL_PLAYER
ADD_ON
MANUAL
```

Extension pricing should primarily come from the additional extension slot rather than duplicating it as a generic adjustment.

---

# 27. Reservation Amounts

The reservation should distinguish three values.

## Original Amount

```text
original_amount
```

Sum of the original reservation slots.

## Adjustment Amount

```text
adjustment_amount
```

Sum of additional non-slot charges.

## Final Amount

```text
final_amount
```

Final amount after:

* Original slots
* Extension slots
* Add-ons
* Other valid adjustments

Conceptually:

```text
Final Amount
=
All Reservation Slot Charges
+
All Additional Adjustments
```

---

# 28. Completed Revenue

Revenue reporting should use:

```text
Reservation.status = COMPLETED
```

and:

```text
Reservation.final_amount
```

Example:

```text
Original slots       ₱1,000
Extension              ₱600
Additional player      ₱100
----------------------------
Final amount          ₱1,700
```

Revenue recognized:

```text
₱1,700
```

---

# 29. Reservation Status History

## Entity

`reservation_status_histories`

Records reservation status transitions.

### Suggested Fields

```text
id
reservation_id

from_status
to_status

reason
notes

changed_by_user_id
created_at
```

### Example

```text
WAITING_FOR_VERIFICATION
→ VERIFIED
```

```text
VERIFIED
→ CANCELLED
```

---

# 30. Purpose of Status History

This provides:

* Operational traceability
* Audit information
* Historical status changes
* Reporting support
* Debugging capability

The current reservation status remains stored on `reservations.status`.

The history table records how it reached that status.

---

# 31. Reservation Schedule History

## Entity

`reservation_schedule_histories`

Stores schedule changes caused by rescheduling.

Because one reservation may contain several slots, rescheduling should preserve the previous and new slot structure.

A schedule history record may represent a reschedule operation.

### Suggested Fields

```text
id
reservation_id

performed_by_user_id

reason
notes

created_at
```

The detailed slots involved may be stored separately.

---

# 32. Reservation Schedule History Items

## Entity

`reservation_schedule_history_items`

Stores individual slot movements associated with a reschedule operation.

### Suggested Fields

```text
id
reservation_schedule_history_id

old_court_id
old_date
old_start_time
old_end_time

new_court_id
new_date
new_start_time
new_end_time

created_at
```

This preserves changes such as:

```text
Court 1
Aug 15
3 PM
```

becoming:

```text
Court 2
Aug 16
5 PM
```

---

# 33. Rescheduling Transaction Rule

Rescheduling must be atomic.

Conceptually:

```text
BEGIN TRANSACTION

1. Validate all target slots
2. Secure target slots
3. Replace active reservation slot assignments
4. Preserve old schedule history
5. Release previous occupancy

COMMIT
```

If any required target slot is unavailable:

```text
ROLLBACK
```

---

# 34. Closed Dates

## Entity

`availability_closures`

Represents grouped availability closures. A closure is either the entire facility for one date or one court with one or more time ranges, so all ranges saved together can be reopened together.

### Suggested Fields

```text
id
type (ENTIRE_OPERATION or COURT_TIME)
date
court_id (nullable for ENTIRE_OPERATION)
reason
is_active
created_by_user_id
reopened_by_user_id
reopened_at
created_at
updated_at
```

`availability_closure_periods` stores the one or more time ranges owned by a `COURT_TIME` closure:

```text
id
availability_closure_id
start_hour
end_hour
created_at
updated_at
```

The internal reason is required. Reopening deactivates the record rather than deleting it, preserving its operational history.

### Example

```text
2026-08-20
Private Facility Use
```

---

# 35. Availability Blocks

## Entity

`availability_closures` with `type = COURT_TIME` plus its `availability_closure_periods`.

Represents a specific court closure with one or more non-overlapping time ranges.

### Suggested Fields

```text
court_id
date
start_hour / end_hour (on each owned period)
reason
is_active
```

### Example

```text
Court 3
August 22
2:00 PM – 4:00 PM
6:00 PM – 8:00 PM
Maintenance
```

---

# 36. Availability Resolution

A slot should only be considered available when all of the following are true:

```text
Court is ACTIVE
AND
Date is not globally closed
AND
Court/time is not specifically blocked
AND
No active reservation occupies the slot
```

Conceptually:

```text
AVAILABLE =
active court
- closed dates
- blocked slots
- active reservation slots
```

---

# 37. Active Reservation Occupancy

Reservation slots should block availability when their parent reservation is in an active state.

Current active states:

```text
WAITING_FOR_VERIFICATION
VERIFIED
```

Final reservation states should no longer occupy future slot availability:

```text
REJECTED
CANCELLED
```

`COMPLETED` and `NO_SHOW` remain historical records because their scheduled times are already in the past.

---

# 38. Walk-In Availability

Walk-ins use:

```text
reservations
+
reservation_slots
```

exactly like online reservations.

They should not use a separate walk-in availability table.

This maintains one source of truth.

---

# 39. Events

## Entity

`events`

Stores public announcements/events.

### Suggested Fields

```text
id
header
slug
description
image_path
event_date

status
published_at

created_by_user_id

created_at
updated_at
```

### Possible Statuses

```text
DRAFT
PUBLISHED
ARCHIVED
```

### Rule

Events do not control reservation availability.

---

# 40. Gallery

## Entities

`gallery_tabs` stores the public tabs and `gallery_images` stores images in a selected tab.

### Gallery Tab Fields

```text
id
name
display_order
created_at
updated_at
```

### Gallery Image Fields

Images are displayed on the public website inside their assigned tab.

```text
id
gallery_tab_id
image_path
alt_text
display_order
uploaded_by_user_id
created_at
updated_at
```

`display_order` is maintained internally through drag-and-drop ordering; it is not entered as a numeric form field. New tabs and images are appended to the end of their current collection. Deleting a gallery tab cascades to its image records, and the application removes the corresponding stored files.

---

# 41. Rules & Policy

## Entities

`policy_sections` stores the three fixed cards and `policy_bullets` stores the ordered content in each card.

### Policy Section Fields

```text
id
key (RESERVATION, RESCHEDULE, CANCEL)
title
display_order
is_active
```

### Policy Bullet Fields

```text
id
policy_section_id
content
display_order
is_active
created_at
updated_at
```

The three sections are seeded as Reservation, Reschedule, and Cancel. Individual bullets can be edited, deleted, and reordered without changing frontend code.

---

# 42. Frequently Asked Questions

## Entity

`faqs`

Stores public FAQ cards managed through the Management module.

Suggested fields:

```text
id
question
answer
display_order
is_active
created_at
updated_at
```

The saved `display_order` is the public display order. Each record supports create, edit, delete, and drag-to-reorder behavior.

---

# 43. Website Settings

## Entity

`website_settings`

Stores dynamic general business information.

Potential information includes:

* About Us
* Operating hours
* Contact information
* Facebook link
* Social media links
* Address
* Location map configuration
* Hero content
* Other simple business configuration

Rather than creating a new table for every small configuration value, this can be implemented using a controlled key/value configuration model.

### Suggested Fields

```text
id
key
value
type
updated_by_user_id
created_at
updated_at
```

Example:

```text
key: facebook_url
type: string

key: about_us
type: text

key: operating_hours
type: json
```

Only approved system-defined keys should be accepted.

---

# 44. Audit Logs

## Entity

`audit_logs`

Stores important Manager and Staff actions.

### Suggested Fields

```text
id
actor_id

action
target_type
target_id

before
after

ip_address
user_agent
created_at
updated_at
```

### Important Audited Actions

Examples:

```text
RESERVATION_VERIFIED
RESERVATION_REJECTED
RESERVATION_CANCELLED
RESERVATION_COMPLETED
RESERVATION_NO_SHOW
RESERVATION_RESCHEDULED
RESERVATION_EXTENDED

ROLE_CREATED
ROLE_UPDATED

STAFF_CREATED
STAFF_UPDATED
STAFF_DISABLED

COURT_BLOCKED
DATE_CLOSED

PAYMENT_METHOD_UPDATED
RATE_UPDATED
```

---

# 45. Why Status History and Audit Logs Are Different

These tables serve different purposes.

## Reservation Status History

Answers:

> How did this reservation move through its lifecycle?

Example:

```text
Waiting
→ Verified
→ Completed
```

## Audit Log

Answers:

> What management action did a user perform?

Example:

```text
Manager Maria
changed Reservation DOU-0012
from VERIFIED to CANCELLED
at 2:41 PM
```

Both are useful and should not necessarily replace each other.

---

# 46. Entity Summary

Core transactional entities:

```text
users
roles
role_modules

courts

rental_equipment

reservations
reservation_slots
reservation_payments
reservation_adjustments
reservation_status_histories
reservation_schedule_histories
reservation_schedule_history_items

rates
payment_methods

closed_dates
availability_blocks
```

Content/configuration entities:

```text
events
gallery_tabs
gallery_images
policy_sections
policy_bullets
faqs
website_settings
```

Operational support:

```text
audit_logs
```

---

# 47. Relationship Summary

```text
roles
  └──< users

roles
  └──< role_modules

reservations
  ├──< reservation_slots
  ├──< reservation_adjustments
  ├──< reservation_status_histories
  ├──< reservation_schedule_histories
  └── reservation_payments

reservation_schedule_histories
  └──< reservation_schedule_history_items

courts
  ├──< reservation_slots
  └──< availability_blocks

gallery_tabs
  └──< gallery_images

rates
  └──< reservation_slots

payment_methods
  └──< reservation_payments

users
  └── referenced by operational/audit actions
```

Legend:

```text
──< = one-to-many
──  = one-to-one / direct relationship
```

---

# 48. Conceptual ERD

```text
┌───────────────┐
│     ROLES     │
└───────┬───────┘
        │ 1
        │
        │ many
┌───────▼───────┐
│     USERS     │
└───────────────┘


┌───────────────┐
│ RESERVATIONS  │
└───────┬───────┘
        │
        ├──────────────< RESERVATION_SLOTS >──────── COURTS
        │                         │
        │                         └────────────── RATES
        │
        ├────────────── RESERVATION_PAYMENTS
        │                         │
        │                         └──────── PAYMENT_METHODS
        │
        ├──────────────< RESERVATION_ADJUSTMENTS
        │
        ├──────────────< STATUS_HISTORIES
        │
        └──────────────< SCHEDULE_HISTORIES
                                  │
                                  └────< SCHEDULE_HISTORY_ITEMS


COURTS
  │
  └──────────────< AVAILABILITY_BLOCKS


CLOSED_DATES
  └── affects all courts for a date
```

---

# 49. Important Database Indexes

The eventual schema should strongly consider indexes for:

## Reservations

```text
reference_number
status
source
customer_email
customer_contact_number
created_at
```

## Reservation Slots

Composite indexes around:

```text
court_id
reservation_date
start_time
```

and:

```text
reservation_id
```

## Payments

```text
reservation_id
reference_number
payment_method_id
```

## Availability Blocks

```text
court_id
date
start_time
end_time
```

## Closed Dates

```text
date
```

## Reports

Indexes around:

```text
status
completed_at
created_at
source
```

will become useful for analytics.

---

# 50. Important Unique Constraints

At minimum:

```text
users.email
reservations.reference_number
website_settings.key
```

Role names may also be unique depending on intended Manager behavior.

---

# 51. Money Storage

Currency values should not use floating-point storage.

Amounts such as:

```text
500.00
600.00
1700.00
```

should use a fixed-precision decimal type.

Example implementation:

```text
DECIMAL(10,2)
```

Currency:

```text
PHP
```

---

# 52. Date and Time Storage

The system distinguishes:

## Transaction Timestamps

Examples:

```text
created_at
verified_at
completed_at
```

These should follow the project's standard timestamp strategy.

## Reservation Business Date

Example:

```text
2026-08-15
```

This represents the actual local calendar date of the reservation.

## Reservation Time

Example:

```text
15:00:00
16:00:00
```

Reservation court times are local business times and should not accidentally shift because of timezone conversion.

The system operates according to the Dinks on Us business timezone in the Philippines.

---

# 53. Soft Deletion Guidance

Transactional reservation records should generally not be permanently deleted.

For configuration entities such as:

* Rates
* Payment methods
* Courts
* Staff accounts

prefer:

```text
is_active
status
```

or controlled soft deletion when appropriate.

Historical reservations should continue to resolve meaningful snapshot data even if associated configuration is later disabled.

---

# 54. Historical Snapshot Principle

Historical transactions must preserve what was true when the reservation occurred.

Examples:

## Rate

Store:

```text
rate_name_snapshot
rate_amount_snapshot
```

## Payment Method

Store:

```text
payment_method_name_snapshot
```

## Policy Acceptance

The current public reservation checkout is a client-side mock and does not create a reservation record. Its acknowledgment checkbox therefore has no historical persistence.

When the real reservation model is introduced, each submitted reservation must persist a policy acceptance snapshot (or an immutable policy version reference) together with the acceptance timestamp. The snapshot must cover the Rules & Policies, Reschedule Policy, and Cancellation Policy shown at submission time so later edits do not rewrite the historical agreement.

## Customer

Store the submitted customer details directly on the reservation.

This prevents historical records from unexpectedly changing when configuration data changes later.

---

# 55. Availability Must Not Be Stored as a Boolean

Do not make availability depend on a field such as:

```text
courts.is_available
```

or:

```text
slots.available = true
```

for normal reservation availability.

Availability is derived from current system state.

Conceptually:

```text
Is this court active?
        +
Is this date open?
        +
Is this time unblocked?
        +
Does another active reservation occupy it?
        =
Availability
```

This avoids synchronization bugs.

---

# 56. No Permanent Pre-generated Slot Requirement

The system does not necessarily need a database row for every possible future:

```text
Court × Date × Hour
```

Public slots may be generated dynamically based on:

* Operating hours
* Court configuration
* Rate configuration
* Existing reservation slots
* Closed dates
* Availability blocks

Only actual transactional or blocking records need to be stored.

This avoids generating thousands of unnecessary future slot rows.

---

# 57. Reservation Submission Transaction

When an online reservation is submitted:

```text
BEGIN TRANSACTION
```

The backend should:

```text
1. Validate customer information

2. Validate payment information

3. Validate every requested slot

4. Verify all requested slots are still available

5. Determine applicable rates

6. Create reservation

7. Create reservation slots

8. Save rate snapshots

9. Create reservation payment

10. Set:
    WAITING_FOR_VERIFICATION

11. Commit
```

If any slot is unavailable:

```text
ROLLBACK
```

No partial reservation should remain.

---

# 58. Verification Transaction

When Staff verifies:

```text
Reservation:
WAITING_FOR_VERIFICATION
→ VERIFIED

Payment:
PENDING
→ VERIFIED
```

Record:

```text
verified_by_user_id
verified_at
```

Create:

```text
reservation_status_history
audit_log
```

---

# 59. Rejection Transaction

When Staff rejects:

```text
Reservation:
WAITING_FOR_VERIFICATION
→ REJECTED

Payment:
PENDING
→ REJECTED
```

The reservation slots remain as historical records but stop blocking availability because their parent reservation is finalized as rejected.

Record:

```text
rejected_by_user_id
rejected_at
reason
```

---

# 60. Completion Transaction

Before completion:

```text
1. Confirm final reservation slots
2. Confirm extension charges
3. Confirm additional adjustments
4. Calculate final_amount
5. Set status = COMPLETED
6. Record completed_by_user_id
7. Record completed_at
8. Create status history
9. Create audit log
```

The completed final amount becomes reportable revenue.

---

# 61. Reporting Model

Reports should be calculated from transactional data.

Examples:

## Revenue

```text
SUM(reservations.final_amount)
WHERE status = COMPLETED
```

## Completed Reservations

```text
COUNT(reservations)
WHERE status = COMPLETED
```

## Online vs Walk-In

Group:

```text
reservations.source
```

## Court Usage

Aggregate:

```text
reservation_slots
GROUP BY court_id
```

using completed reservations where appropriate.

## Popular Time Slots

Aggregate:

```text
reservation_slots.start_time
```

## No-Show Rate

Compare:

```text
NO_SHOW
```

against eligible finalized reservation counts.

---

# 62. Data Model Invariants

The following must remain true:

```text
1. One reservation may contain many reservation slots.

2. Every reservation slot belongs to exactly one court.

3. Every reservation slot represents one one-hour period.

4. Multiple courts may belong to one reservation.

5. Reservation slots do not need to be consecutive.

6. An online reservation must contain payment proof.

7. Online submission locks all selected slots atomically.

8. Waiting and Verified reservations block availability.

9. Rejected and Cancelled reservations release future availability.

10. Walk-ins use the same reservation and slot tables as online reservations.

11. Historical pricing must survive future rate changes.

12. Final revenue comes from Completed reservation final amounts.

13. Reservations should not normally be permanently deleted.

14. Staff accounts receive one role.

15. Roles determine module access.

16. Availability is derived from transactional and blocking records.

17. Backend/database enforcement must prevent duplicate reservations.

18. Rescheduling must preserve previous schedule history.

19. Important management actions must be auditable.

20. Final statuses belong to History.
```

---

# 63. Pending Data Model Decisions

The following remain dependent on future client confirmation.

## Cancellation Refunds

If refunds are tracked inside the system later, additional entities may be required:

```text
refunds
refund_transactions
```

No refund entity is required in the current confirmed scope.

---

## Walk-In Payments

Depending on client requirements, walk-ins may require:

* Payment method
* Payment reference
* Cash amount
* Receipt

The current model is flexible enough to support this later.

---

## Add-On Catalog

If add-ons become formally managed products, introduce:

```text
add_ons
reservation_add_ons
```

For the current scope, generic `reservation_adjustments` are sufficient.

---

## Special Pricing

If pricing eventually requires:

* Holiday rates
* Date-specific rates
* Promotional rates
the rate model may need to be expanded beyond its configured per-court rates.

The current model should not assume these requirements until confirmed.

---

# 64. Recommended Implementation Order

The database can later be implemented approximately in this dependency order:

```text
1. roles
2. users
3. role_modules

4. courts

5. rates
6. rental_equipment
7. payment_methods

8. reservations
9. reservation_slots
10. reservation_payments
11. reservation_adjustments

12. reservation_status_histories
13. reservation_schedule_histories
14. reservation_schedule_history_items

15. closed_dates
16. availability_blocks

17. events
18. gallery_tabs
19. gallery_images
20. policy_sections
21. policy_bullets
22. faqs
23. website_settings

24. audit_logs
```

---

# 65. Current Architectural Principle

The reservation should be treated as the **business transaction**, while reservation slots represent the actual consumption of court availability.

This distinction is fundamental.

```text
Reservation
=
Customer transaction / reservation

Reservation Slot
=
Actual court occupancy
```

Example:

```text
Reservation DOU-00125
│
├── Court 1 / 9–10 AM
├── Court 2 / 10–11 AM
├── Court 1 / 1–2 PM
└── Court 3 / 6–7 PM
```

The reservation is one transaction.

The system still knows exactly which physical court/time combinations are occupied.

---

# 66. Document Status

This document defines the current conceptual data model for Dinks on Us.

It should guide:

* Laravel model design
* Database migrations
* Foreign keys
* API resources
* Validation
* Query design
* Reservation transactions
* Availability calculation
* Reporting
* Audit behavior

The final database schema may optimize implementation details, but it should preserve the relationships and business invariants defined here.

Any future client decision that changes reservation behavior should first be reflected in:

1. `SYSTEM_OVERVIEW.md`
2. `BUSINESS_RULES.md`
3. `DATA_MODEL.md`

before database implementation is changed.

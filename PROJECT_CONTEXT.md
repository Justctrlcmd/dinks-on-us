# Dinks on Us — Project Context

## 1. Purpose

This document is the primary entry point for understanding the **Dinks on Us** project domain.

The project already uses an initialized boilerplate with its own architecture, coding conventions, authentication, authorization, API response structure, frontend organization, validation strategy, and other implementation standards.

This document does **not** redefine that architecture.

Instead, it explains how the existing boilerplate should interpret and implement the Dinks on Us business requirements.

The domain is implemented and in active feature development. The source code,
database migrations, and registered routes are authoritative for implementation
details; these documents record the current product behavior and invariants.

Current operating decisions include:

* Weekday pricing applies Monday through Thursday; weekend pricing applies Friday through Sunday.
* Public checkout supports multiple court/time selections on one date and submits the displayed `quoted_amount` for server-side stale-price detection.
* Pending, Verified, and Ongoing reservations occupy court and time-based equipment availability.
* Manager-created team accounts cannot open Profile or change their own identity or password; the Manager controls those credentials through Team & Access.
* Rescheduling is Manager-only, keeps the original base-slot count, preserves history, migrates existing court-time add-ons to the new date, and settles the resulting balance or credit immediately.
* Court-time, additional-player, and rental-equipment add-ons are available for Verified and Ongoing reservations.

---

# 2. Core Implementation Principle

The existing boilerplate architecture remains authoritative for **how the application is implemented**.

The Dinks on Us domain documents remain authoritative for **what the application must do and how the business must behave**.

Use this rule:

```text
Existing Boilerplate
=
Implementation Architecture

Dinks on Us Documentation
=
Domain Requirements and Business Behavior
```

The coding agent must adapt the Dinks on Us requirements into the existing boilerplate rather than redesigning or replacing the boilerplate.

---

# 3. Existing Boilerplate Authority

Before implementing Dinks on Us features, inspect and follow the existing project conventions for areas such as:

* Backend folder structure
* Frontend folder structure
* Authentication
* Authorization
* Roles and module permissions
* API versioning
* API response format
* Error handling
* Validation
* Input sanitization
* Service organization
* Controllers
* Form Requests
* API Resources
* Models
* Database migrations
* Enums
* Policies / middleware
* Frontend API services
* TanStack Query usage
* Forms
* Zod schemas
* Shared components
* Date and time handling
* File upload handling
* Testing
* Logging
* Environment configuration

Do not introduce a competing architecture unless explicitly instructed.

---

# 4. Domain Documentation

The Dinks on Us domain is currently defined through the following documents.

## `SYSTEM_OVERVIEW.md`

Defines:

> What the Dinks on Us system is.

It contains:

* Business overview
* Public website
* Reservation experience
* Management system
* Roles
* Modules
* Payment process
* Walk-ins
* Court availability
* Reporting
* High-level flows
* Pending client decisions

Use this document to understand the entire system from a product perspective.

---

## `BUSINESS_RULES.md`

Defines:

> How the Dinks on Us business must behave.

It contains the authoritative operational rules for:

* Reservation slot structure
* Multiple-slot reservations
* Multi-court reservations
* Slot availability
* Slot locking
* Duplicate-reservation prevention
* Reservation statuses
* Payment verification
* Manual payment-proof retention and cleanup
* Rejection
* Walk-ins
* Pricing
* Rate snapshots
* Rescheduling
* Court-time add-ons
* Add-ons
* Final amounts
* Revenue recognition
* Cancellation
* No-show handling
* History
* Roles and authorization
* Auditability

When implementation details are unclear, business behavior should be derived from this document rather than invented.

---

## `DATA_MODEL.md`

Defines:

> What data and relationships the business requires.

It contains conceptual entities such as:

* Users
* Roles
* Role Modules
* Courts
* Reservations
* Reservation Slots
* Payments
* Rates
* Rental Equipment
* Payment Methods
* Adjustments
* Status History
* Schedule History
* Closed Dates
* Availability Blocks
* Events
* Gallery Tabs and Images
* Rules & Policy
* FAQ
* Website Settings
* Audit Logs
* Payment-proof deletion metadata

This is a **conceptual model**, not an instruction to replace existing boilerplate database conventions.

Translate these domain concepts into the existing project architecture.

---

## `API_SPEC.md`

Defines:

> What operations the system must support.

It describes:

* Public operations
* Reservation submission
* Availability lookup
* Payment method retrieval
* Management reservation actions
* Verification
* Rejection
* Walk-ins
* Rescheduling
* Rescheduling and add-ons
* Completion
* No-show
* Cancellation
* History
* Manual payment-proof cleanup preview, deletion, and activity
* Dynamic content management
* Reports
* Validation
* Concurrency requirements
* Transaction boundaries

The exact controller/service/file structure should still follow the existing boilerplate.

The completed implementation record for payment-proof retention is in
`docs/plans/payment-proof-retention.md`. It remains subordinate to the current
domain documents and source code.

---

# 5. Documentation Authority Order

When understanding the system, use the documents in this order:

```text
PROJECT_CONTEXT.md
        ↓
SYSTEM_OVERVIEW.md
        ↓
BUSINESS_RULES.md
        ↓
DATA_MODEL.md
        ↓
API_SPEC.md
```

Each document becomes progressively more implementation-oriented.

---

# 6. Conflict Resolution

If documentation appears to conflict, use the following priority.

## Business behavior conflict

Prefer:

```text
BUSINESS_RULES.md
```

over implementation assumptions in:

```text
DATA_MODEL.md
API_SPEC.md
```

because business rules define the intended behavior.

---

## Product scope conflict

Prefer:

```text
SYSTEM_OVERVIEW.md
```

for determining whether a feature belongs in the current project scope.

---

## Implementation architecture conflict

Prefer the **existing boilerplate architecture and conventions**.

Example:

If `API_SPEC.md` describes an endpoint conceptually as:

```text
POST /api/v1/management/reservations/{reservation}/verify
```

but the existing boilerplate has established conventions for:

* route organization
* controllers
* actions
* services
* Form Requests
* response helpers

follow those conventions while preserving the required behavior.

---

# 7. Do Not Rebuild the Boilerplate

The coding agent must not automatically:

* Reorganize existing folders
* Replace authentication
* Replace authorization
* Introduce a second API response format
* Introduce a second state-management pattern
* Replace existing fetch helpers
* Replace established validation patterns
* Replace established role/module architecture
* Create unnecessary repository patterns
* Replace existing date/time conventions
* Replace existing error-handling conventions

unless explicitly required by an incompatibility that prevents the Dinks on Us requirements from being implemented.

---

# 8. Adapt, Do Not Copy Blindly

The domain documentation is implementation-aware but not implementation-authoritative.

For example, `DATA_MODEL.md` may describe:

```text
Reservation
    └── Reservation Slots
```

This relationship is important.

However, whether the project uses:

* Eloquent Models
* Domain Services
* Actions
* Query objects
* Form Requests
* Resources
* Policies
* Enums

must be determined from the existing boilerplate.

Similarly, `API_SPEC.md` may show conceptual request and response structures.

Use the boilerplate's existing standardized response helpers where applicable.

---

# 9. Core Dinks on Us Domain Model

At the highest level:

```text
Dinks on Us
│
├── Public Website
│   ├── Home
│   ├── Reserve
│   ├── Events
│   └── FAQ
│
└── Management System
    ├── Dashboard
    ├── Reservation
    ├── History
    ├── Management
    ├── Reports & Analytics
    └── Logout
```

The main business domain is the **court reservation system**.

---

# 10. Core Reservation Concept

One reservation is a single customer transaction.

A reservation can contain multiple independent one-hour court/time slots.

Example:

```text
Reservation RF-125
│
├── Court 1 / 9:00–10:00 AM
├── Court 2 / 10:00–11:00 AM
├── Court 1 / 1:00–2:00 PM
└── Court 3 / 6:00–7:00 PM
```

The selected slots:

* Do not need to be consecutive
* May use different courts
* Belong to one reservation
* Are paid together
* Must remain individually trackable

This distinction is fundamental.

```text
Reservation
=
Business transaction

Reservation Slot
=
Physical court occupancy
```

---

# 11. Public Customer Model

Players do **not** have accounts.

The customer reservation flow is:

```text
View Availability
      ↓
Select One or More Slots
      ↓
Enter Customer Information
      ↓
Select E-Wallet
      ↓
View Configured QR
      ↓
Pay Externally
      ↓
Upload Receipt
      ↓
Enter Payment Reference
      ↓
Submit Reservation
```

---

# 12. Reservation Submission Rule

Once a valid online reservation is successfully submitted:

```text
Status
=
PENDING
```

All selected slots immediately become unavailable.

One reservation reference covers one booking date. Selecting the first slot locks the public date selector until the selection is cleared, while multiple courts and non-consecutive times on that date remain supported.

The system must not wait for manual payment verification before locking those slots.

---

# 13. Reservation Lifecycle

Current lifecycle:

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
                       └── COMPLETED
```

Rescheduling is primarily an action, not a permanent final status.

Rescheduling is Manager-only, may be performed repeatedly, preserves every schedule change, and requires the same number of replacement one-hour slots. Price increases become additional balance; decreases become refundable credit.

---

# 14. Final History States

The following are final business outcomes:

```text
COMPLETED
CANCELLED
REJECTED
NO_SHOW
```

These belong in History.

Normal workflows should not casually reopen or delete them.

---

# 15. Availability Is Shared

Online customers, Staff, and walk-ins must use the same availability source.

Availability must consider:

* Waiting-for-verification reservations
* Verified reservations
* Walk-ins
* Ongoing reservations
* Court-time add-ons
* Closed dates
* Blocked court/time slots

Never maintain a separate online-only slot inventory.

---

# 16. Duplicate-Reservation Protection

The backend/database must prevent two active reservations from occupying the same:

```text
Court
+
Date
+
Time Slot
```

Frontend checks alone are insufficient.

Reservation submission must revalidate availability transactionally.

---

# 17. Multi-Slot Atomicity

When a player selects multiple slots, submission behaves as one transaction.

Example:

```text
Requested Slots

Court 1 / 9 AM
Court 2 / 11 AM
Court 3 / 2 PM
```

If Court 2 becomes unavailable before submission:

```text
Entire submission fails.
```

Do not create a partial reservation for Court 1 and Court 3.

---

# 18. Payment Model

There is no automated payment gateway.

Payment is manual through Manager-configured payment methods.

Each payment method may contain:

* E-wallet name
* Account name
* Account identifier
* QR image
* Instructions
* Active status

Online reservation requires:

* Selected payment method
* Receipt image
* Payment reference number

Staff/Manager manually verifies the payment.

---

# 19. Pricing

Court reservations are based on one-hour slots.

Temporary example pricing:

```text
Day Rate
₱500/hour

Night Rate
₱600/hour
```

These values are configurable and are not permanent hard-coded rates.

The Manager configures one shared court rule set for all courts: operating hours,
players included, additional-player price, Monday–Thursday weekday periods, and
Friday–Sunday weekend periods. Rentable equipment has its own price and stock.

---

# 20. Historical Price Preservation

The price applied when a slot is reserved must be preserved.

Example:

```text
Customer books:
₱500/hour

Manager later changes rate:
₱550/hour

Existing reservation:
Still uses ₱500
```

Do not recalculate historical reservations from the latest rate configuration.

---

# 21. Walk-Ins

Walk-ins are supported.

Staff can create them through management.

Walk-ins must consume the same reservation-slot availability as online reservations.

Walk-ins are created as Verified reservations. Staff records the customer's name, email, contact number, court times, additional players, rental equipment, and payment. Payment uses either Cash or a specific active e-wallet/bank method configured for public checkout. Cash may omit the transaction reference and receipt; both are required for non-cash payments so reports retain the actual selected method.

Conceptually:

```text
Reservation Source

ONLINE
WALK_IN
```

---

# 22. Court-Time Add-Ons

Players cannot add court time through the public website after submission.

Authorized Staff or the Manager can add available court/time slots to a
Verified or Ongoing reservation through the reservation add-ons action. Added
court time must use the reservation's current booking date, consumes the shared
availability immediately, uses the current configured rate as a snapshot, and
contributes to final billing. There is no separate extension endpoint.

---

# 23. Add-Ons and Final Amount

Verified and Ongoing reservations may gain additional charges.

Examples:

* Additional player
* Court time on the current booking date
* Additional players
* Active rental equipment

Therefore distinguish:

```text
Original Reservation Amount
```

from:

```text
Final Reservation Amount
```

Completed reservation final amount is the main value used for revenue reporting.

---

# 24. Revenue Rule

Primary recognized system revenue:

```text
Completed Reservation
        ↓
Final Amount
```

Do not treat every verified reservation amount as final business revenue.

---

# 25. Court Closures

The **Availability & Closures** management workspace lets a user select a court and choose a full-date closure or a slot-only closure:

## Entire date closure

Example:

```text
August 20
Closed
```

## Specific court/time block

Example:

```text
Court 3
August 22
2 PM – 4 PM
Maintenance
```

Existing active reservations must not be silently invalidated by creating a closure.

---

# 26. Events

Events are announcement/content records.

Each event contains a header, image, description, and date.

Events do not automatically control court availability.

If an event requires court closure, management must separately close or block the corresponding slots.

---

# 27. Roles and Access

The current authorization model is:

```text
Manager
=
All modules

Staff
=
Exactly one assigned role

Role
=
Many module permissions
```

Example:

```text
Front Desk
├── Dashboard ✓
├── Reservation ✓
├── History ✓
├── Management ✗
└── Reports ✗
```

Do not introduce direct per-user permissions or multiple roles unless requirements change.

---

# 28. Manager-Specific Authority

Current temporary rule:

```text
Reservation Cancellation
=
Manager only
```

Even Staff with Reservation module access should not automatically gain cancellation permission.

This may change after client confirmation.

---

# 29. Public and Management Responsibilities

## Public

Responsible for:

* Business content
* Court availability
* Reservation creation
* Payment instructions
* Events
* FAQ

## Management

Responsible for:

* Payment verification
* Reservation operations
* Walk-ins
* Add-ons
* Completion
* No-show
* Cancellation
* Availability control
* Courts & Pricing, including rentable equipment
* Team & Access for roles and Staff accounts
* Availability & Closures
* Public Events, FAQs, Gallery, Payment Methods, and Reservation Policies content
* Reports

---

# 30. Explicit Business Actions

Important reservation operations should be modeled explicitly.

Examples:

```text
Verify
Reject
Reschedule
Extend
Complete
No-show
Cancel
```

Avoid building business logic around arbitrary status editing.

The client should not be able to simply submit:

```text
status = COMPLETED
```

without triggering the required rules and side effects.

---

# 31. Transaction-Critical Operations

The following require atomic behavior:

* Online reservation submission
* Walk-in creation
* Verification
* Rejection
* Rescheduling
* Add-ons
* Completion
* Cancellation

If one part fails, related state changes should not partially persist.

---

# 32. Important Side Effects

Business actions may require related operations.

Example:

```text
Reject Reservation
│
├── Update status
├── Update payment status
├── Release slots
├── Record reason
├── Record actor
├── Record history
├── Audit action
└── Prepare customer email; deliver only when reservation email is enabled
```

The implementation should preserve these business effects even if the internal architecture uses services/actions/listeners/jobs.

---

# 33. Email Events

Current customer email events:

* Verified
* Rejected
* Rescheduled

The reschedule email contains the newly active reservation schedule and describes
any refundable credit or additional payment as already settled during the
reschedule. Public online submission, cancellation, completion, add-ons, and
other reservation changes do not send customer emails. Walk-in creation is
immediately verified and sends the verification email when enabled.

---

# 34. Reports

Reports should derive from transactional data.

Implemented report areas include:

* Completed revenue
* Reservation count
* Online vs walk-in
* Court utilization
* Popular times
* No-show rate
* Cancellation rate
* Reservation trends

Avoid maintaining separate manually synchronized reporting totals.

---

# 35. Pending Client Confirmation

Some business policies remain unresolved.

These are **not implementation blockers** where reasonable defaults/configurability can isolate them.

Pending:

### Cancellation

* Customer request deadline
* Any fee or policy change beyond the implemented Manager-only force-majeure refund flow

### Rescheduling

* Customer request deadline
* Any business fee beyond the settled price difference

### No-show

* Late-arrival grace period

### Add-ons

* Any future managed add-on products beyond court time, additional players, and rental equipment

### Pricing

* Exact operating hours
* Day/night boundary
* Special pricing

### Payment Methods

* Exact supported e-wallet accounts

Do not invent permanent business policy for these areas.

---

# 36. AI Coding Agent Rules

When implementing Dinks on Us:

1. Read the existing boilerplate architecture before creating new structures.

2. Reuse existing conventions whenever possible.

3. Do not redesign the boilerplate unless required.

4. Preserve the business behavior defined in the domain documents.

5. Do not infer missing client policy as permanent business behavior.

6. Keep unresolved policies configurable or isolated where practical.

7. Do not hard-code temporary example rates as permanent business rules.

8. Do not create customer authentication.

9. Do not separate walk-in availability from online availability.

10. Do not allow frontend-only duplicate-reservation prevention.

11. Do not trust client-calculated reservation prices.

12. Do not allow unrestricted reservation status mutation.

13. Do not permanently delete transactional history through normal workflows.

14. Preserve historical rate/payment snapshots where required.

15. Follow existing authorization conventions while preserving:
    `Staff → one role → module access`.

16. Manager must retain full module access.

17. Use existing API response conventions even where `API_SPEC.md` examples differ cosmetically.

18. Use existing frontend server-state patterns rather than introducing competing state stores.

19. Use the project's established date/time conventions.

20. Ask for clarification only when a missing decision genuinely blocks correct implementation; otherwise isolate pending policy and continue safely.

---

# 37. Recommended Agent Reading Sequence

Before implementation work:

```text
1. Existing boilerplate documentation
2. PROJECT_CONTEXT.md
3. SYSTEM_OVERVIEW.md
4. BUSINESS_RULES.md
5. DATA_MODEL.md
6. API_SPEC.md
7. Relevant existing source code
```

Then map the requested feature into the existing architecture.

---

# 38. Source-of-Truth Principle

Think of the project as two complementary sources of truth.

```text
┌──────────────────────────────┐
│ Existing Boilerplate        │
│                              │
│ Defines HOW we build         │
└──────────────┬───────────────┘
               │
               │ combined with
               │
┌──────────────▼───────────────┐
│ Dinks on Us Domain Docs     │
│                              │
│ Define WHAT we build        │
│ and HOW the business works  │
└──────────────────────────────┘
```

Neither should unnecessarily overwrite the other.

---

# 39. Current Project Understanding

The Dinks on Us domain and its primary workflows are implemented in the initialized application.

The major remaining unknowns are policy details expected to be confirmed with the client later.

The documentation and working implementation define:

* Who uses the system
* What modules exist
* How reservations work
* How slots are occupied
* How payment verification works
* How walk-ins work
* How pricing works
* How roles work
* How History works
* How revenue is recognized
* Which rules remain pending

without redesigning the existing architecture.

---

# 40. Document Status

This document is the **entry point for Dinks on Us domain implementation**.

If future client meetings materially change the system, update the relevant domain documents first.

Recommended update order:

```text
SYSTEM_OVERVIEW.md
        ↓
BUSINESS_RULES.md
        ↓
DATA_MODEL.md
        ↓
API_SPEC.md
        ↓
PROJECT_CONTEXT.md
```

`PROJECT_CONTEXT.md` should remain concise enough to orient future developers and AI agents while pointing them toward the more detailed source documents.

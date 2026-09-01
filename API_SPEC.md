# Dinks on Us — API Specification

## 1. Purpose

This document defines the API contract for the Dinks on Us system.

It should be used together with:

* `SYSTEM_OVERVIEW.md`
* `BUSINESS_RULES.md`
* `DATA_MODEL.md`

This specification defines:

* Public API routes
* Management API routes
* Authentication requirements
* Authorization rules
* Reservation operations
* Availability behavior
* Payment verification
* Walk-in handling
* Rescheduling
* Extensions and adjustments
* History
* Dynamic content management
* Reports and analytics
* Validation
* Error responses
* Transaction requirements
* Concurrency protection

---

# 2. API Base Path

All application APIs should use versioned routes.

```text
/api/v1
```

Examples:

```text
/api/v1/public/availability
/api/v1/public/reservations
/api/v1/management/reservations
```

This allows future API changes without breaking existing clients.

---

# 3. API Areas

The API is divided into two major areas.

```text
/api/v1
│
├── /public
│   └── No Staff/Manager authentication required
│
└── /management
    └── Requires authenticated Staff/Manager
```

---

# 4. Standard Success Response

Successful responses should follow a consistent structure.

```json
{
  "success": true,
  "message": "Reservation retrieved successfully.",
  "data": {}
}
```

For list endpoints:

```json
{
  "success": true,
  "message": "Reservations retrieved successfully.",
  "data": [],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 125,
    "last_page": 7
  }
}
```

---

# 5. Standard Error Response

Errors should follow a predictable structure.

```json
{
  "success": false,
  "message": "Unable to process reservation.",
  "errors": {
    "slots": [
      "One or more selected slots are no longer available."
    ]
  }
}
```

For general errors:

```json
{
  "success": false,
  "message": "Unauthorized."
}
```

---

# 6. Recommended HTTP Status Codes

```text
200 OK
Successful GET/update/action

201 Created
Resource successfully created

204 No Content
Successful operation with no response body when appropriate

400 Bad Request
Malformed or invalid request structure

401 Unauthorized
Authentication required or invalid session

403 Forbidden
Authenticated user lacks module access

404 Not Found
Requested resource does not exist

409 Conflict
Resource state conflict such as unavailable slot

422 Unprocessable Entity
Validation error

429 Too Many Requests
Rate limit exceeded

500 Internal Server Error
Unexpected server failure
```

---

# 7. Authentication

Public player reservations do not require authentication.

Management routes require an authenticated:

```text
Manager
or
Staff
```

The management authentication implementation should use the project's secure authenticated-session approach.

---

# 8. Management Authorization

Authentication and authorization are separate.

A Staff member may be authenticated but still forbidden from accessing a module.

Example:

```text
Authenticated Staff
Role: Front Desk

Reservation ✓
Reports ✗
```

Requesting:

```text
GET /api/v1/management/reports/revenue
```

must return:

```text
403 Forbidden
```

Backend authorization is mandatory.

Frontend navigation hiding is not sufficient security.

---

# 9. Module Authorization Mapping

Suggested module mapping:

```text
DASHBOARD
RESERVATION
HISTORY
MANAGEMENT_COURT_PRICING
MANAGEMENT_AVAILABILITY_CLOSURES
MANAGEMENT_PAYMENT_METHODS
MANAGEMENT_TEAM_ACCESS
MANAGEMENT_RULES_POLICIES
MANAGEMENT_EVENTS
MANAGEMENT_GALLERY
MANAGEMENT_FAQS
MANAGEMENT_STORAGE_RETENTION
REPORTS
```

Manager automatically has access to all modules.

Staff access comes from:

```text
Staff
  ↓
Role
  ↓
Modules
```

---

# 10. Public Health Endpoint

```http
GET /api/v1/health
```

Purpose:

* Confirm that the API is running.

Response:

```json
{
  "success": true,
  "message": "Service available."
}
```

The endpoint should not expose:

* Database information
* Server paths
* Environment variables
* Framework debugging information

---

# 11. Public Website Information

## Get Public Site Information

```http
GET /api/v1/public/site
```

Provides general public business information required by the landing page.

Possible response:

```json
{
  "success": true,
  "data": {
    "business_name": "Dinks on Us",
    "about_us": "...",
    "operating_hours": {},
    "contact": {},
    "social_links": {},
    "location": {},
    "hero": {}
  }
}
```

---

# 12. Public Rules & Policy

```http
GET /api/v1/public/policies
```

Returns the four system-defined policy sections—Court Rules & Policy, Reservation Rules & Policy, Reschedule Policy, and Cancellation Policy—with sub-headers and rules ordered for public display.

---

# 13. Public Gallery

```http
GET /api/v1/public/gallery
```

Returns gallery categories in saved display order, with each category's images nested in saved display order. The response does not generate an `All` category.

---

# 14. Public FAQ

```http
GET /api/v1/public/faqs
```

Returns active FAQ records.

---

# 15. Public Events

## Get Published Events

```http
GET /api/v1/public/events
```

Optional query parameters:

```text
page
per_page
```

Only published events should be returned.

---

## Get Single Event

```http
GET /api/v1/public/events/{slug}
```

Returns one published event.

Draft or archived events must not be publicly accessible.

---

# 16. Public Reservation Options

```http
GET /api/v1/public/reservation-options?date=2026-08-25
```

Returns the shared court configuration, active courts, the selected date's configured one-hour price slots, active rental equipment, and the verified-only equipment confirmation message.

`unavailable_slots` contains every slot that cannot be selected, including elapsed times, operational closures, and active reservation locks. `past_slots` is the elapsed subset and should be presented as `Past`; a one-hour slot becomes past only after its end time in `Asia/Manila` (for example, 7:00–8:00 becomes past at 8:01). `reserved_slots` is the subset occupied by an active reservation lock and should be presented as `Reserved`. Any other unavailable slot should be presented as `Closed`.

Example:

```json
{
  "success": true,
  "data": {
    "date": "2026-08-25",
    "configuration": {
      "opening_hour": 7,
      "closing_hour": 24,
      "included_players_per_court": 4,
      "additional_player_price": 100
    },
    "courts": [{ "id": 1, "name": "Court 1" }],
    "slots": [{ "start_hour": 7, "end_hour": 8, "price": 500 }],
    "unavailable_slots": [{ "court_id": 1, "start_hour": 7 }],
    "reserved_slots": [{ "court_id": 1, "start_hour": 7 }],
    "past_slots": [],
    "equipment": [{ "id": 1, "name": "Paddle", "price": 100, "available_quantity": 12 }],
    "equipment_confirmation": "Equipment availability is confirmed when your reservation is verified."
  }
}
```

---

# 17. Public Pricing Authority

The frontend may display pricing information, but the frontend must not be trusted to calculate the authoritative reservation amount.

The backend calculates the final reservation price.

---

# 18. Public Payment Methods

```http
GET /api/v1/public/payment-methods
```

Only active payment methods are returned.

Example:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "GCash",
      "account_name": "Dinks on Us",
      "account_identifier": "09XXXXXXXXX",
      "qr_image_url": "...",
      "instructions": "Scan the QR code and upload your receipt."
    }
  ]
}
```

Sensitive internal payment information must not be exposed.

---

# 19. Public Availability

## Get Available Slots

```http
GET /api/v1/public/availability
```

Suggested query parameters:

```text
date
court_id
```

Example:

```http
GET /api/v1/public/availability?date=2026-08-15
```

Possible response:

```json
{
  "success": true,
  "data": {
    "date": "2026-08-15",
    "courts": [
      {
        "court_id": 1,
        "court_name": "Court 1",
        "slots": [
          {
            "start_time": "09:00",
            "end_time": "10:00",
            "available": true,
            "price": 500
          },
          {
            "start_time": "10:00",
            "end_time": "11:00",
            "available": false
          }
        ]
      }
    ]
  }
}
```

---

# 20. Availability Calculation

The endpoint must derive availability from:

```text
Court status
+
Operating schedule
+
Rate configuration
+
Closed dates
+
Availability blocks
+
Active reservation slots
```

A slot is available only when:

```text
Court is active
AND
Date is open
AND
Slot is not blocked
AND
No active reservation currently occupies the slot
```

---

# 21. Availability Response Is Not a Reservation Lock

The availability endpoint is informational.

Example:

```text
10:00 AM
Frontend displays AVAILABLE
```

Another player may reserve it before the first player submits.

Therefore, every slot must be validated again during actual reservation submission.

---

# 22. Public Reservation Submission

```http
POST /api/v1/public/reservations
```

Because the request contains a payment receipt image, the endpoint may use:

```text
multipart/form-data
```

---

# 23. Reservation Submission Payload

Conceptual payload:

```json
{
  "customer_name": "Juan Dela Cruz",
  "customer_email": "juan@example.com",
  "customer_contact_number": "09123456789",

  "slots": [
    {
      "court_id": 1,
      "date": "2026-08-15",
      "start_time": "09:00"
    },
    {
      "court_id": 2,
      "date": "2026-08-15",
      "start_time": "11:00"
    },
    {
      "court_id": 1,
      "date": "2026-08-15",
      "start_time": "15:00"
    }
  ],

  "payment_method_id": 1,
  "payment_reference_number": "1234567890",

  "receipt": "<file>"
}
```

---

# 24. Client-Supplied Amounts Must Not Be Trusted

The frontend may display:

```text
Total: ₱1,500
```

but the backend must independently calculate:

```text
Applicable Rate
×
Selected Slot
```

The client should not be allowed to decide authoritative:

```text
slot price
original amount
final amount
```

---

# 25. Reservation Submission Validation

The backend must validate:

### Customer

```text
customer_name
customer_email
customer_contact_number
```

`customer_contact_number` must contain exactly 11 digits and start with `09`.

### Slots

At least one slot must be selected.

Every slot must contain:

```text
court_id
date
start_time
```

Each slot must:

* Refer to an active court
* Be within reservable business hours
* Match a valid one-hour interval
* Have an applicable rate
* Not be closed
* Not be blocked
* Not already be occupied

All slots in one submission must use the same calendar date. Mixed-date submissions return `422 Unprocessable Entity`.

### Payment

Must contain:

```text
payment_method_id
payment_reference_number
receipt
```

Payment method must currently be active.

---

# 26. Duplicate Slots in One Request

The backend must reject duplicate court/time combinations inside the same submission.

Invalid example:

```text
Court 1
Aug 15
9 AM
```

submitted twice.

---

# 27. Atomic Reservation Submission

Reservation creation must be transactional.

Conceptual process:

```text
BEGIN TRANSACTION

1. Validate request
2. Re-check all requested slots
3. Lock/protect availability
4. Determine rate for every slot
5. Create reservation
6. Generate reservation reference
7. Create reservation_slots
8. Save rate snapshots
9. Create payment record
10. Calculate original amount
11. Set status:
    PENDING
12. Create initial status history

COMMIT
```

If any slot is no longer available:

```text
ROLLBACK
```

No partial reservation should be created.

---

# 28. Reservation Conflict Response

If one or more selected slots were taken before submission:

```http
409 Conflict
```

Example:

```json
{
  "success": false,
  "message": "One or more selected slots are no longer available.",
  "errors": {
    "slots": [
      {
        "court_id": 2,
        "date": "2026-08-15",
        "start_time": "11:00"
      }
    ]
  }
}
```

The frontend should refresh availability.

---

# 29. Successful Reservation Response

```http
201 Created
```

Example:

```json
{
  "success": true,
  "message": "Reservation submitted. Your selected court times are held while payment is reviewed.",
  "data": {
    "reference_number": "RF-001",
    "status": "PENDING",
    "original_amount": 1500,
    "slots": []
  }
}
```

---

# 30. Reservation Submission Notification

Successful public reservation submission does not send a customer email. The API response and on-screen confirmation communicate that the reservation is pending payment review.

The customer receives an email only after Staff or Management verifies, rejects, or reschedules the reservation. Delivery occurs when `RESERVATION_EMAILS_ENABLED` is true.

Email failure must not roll back or otherwise change the committed reservation result. The reservation transaction and email delivery are separate responsibilities.

After the reservation transaction commits, the backend may dispatch a push
notification to active management devices that have subscribed for the
`RESERVATION` module. Push delivery is a separate, retryable side effect and
must not change the committed reservation result.

---

# 31. Duplicate Submission Protection

Reservation submission should protect against accidental double submissions caused by:

* Double-clicking
* Network retry
* Browser retry

Recommended approach:

```text
Idempotency-Key
```

Example request header:

```http
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
```

Repeated requests using the same key should not create multiple reservations.

The backend persists the key with a unique database constraint. A replay returns
the original reservation resource with a successful response and does not write
another payment, slot lock, status history, or audit entry. Clients should reuse
the same key for retries of one submission and generate a new key for a new
reservation.

---

# 31.1 Pending Reservation Summary

```http
GET /api/v1/management/reservations/pending-summary
```

Requires `RESERVATION` module access. The response is a single aggregate read:

```json
{
  "pending_count": 3,
  "latest_online_submission_id": 42,
  "latest_online_submission_at": "2026-08-30T15:20:00Z"
}
```

The portal badge polls this lightweight endpoint at most every 30 seconds while
the portal is open. It does not fetch reservation rows or payment proofs.

---

# 31.2 Management Push Subscriptions

```http
POST   /api/v1/management/push-subscriptions
DELETE /api/v1/management/push-subscriptions
```

Both endpoints require an active account with `RESERVATION` module access. The
POST body contains the browser Push API `endpoint`, `keys.p256dh`, `keys.auth`,
and optional content-encoding/expiration fields. The endpoint is stored as a
hash plus key material hidden from API resources; it is only used for
server-side delivery and must be protected by database-at-rest controls. DELETE
accepts the endpoint and removes it for the current account. Subscription
registration is safe to repeat.

---

# 32. Management Authentication APIs

Suggested routes:

```http
POST /api/v1/management/auth/login
GET  /api/v1/management/auth/me
POST /api/v1/management/auth/logout
```

---

# 33. Login

```http
POST /api/v1/management/auth/login
```

Payload:

```json
{
  "email": "staff@example.com",
  "password": "********"
}
```

Successful response should include the authenticated user's identity and accessible modules.

Example:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 5,
      "name": "Staff Member",
      "role": "Front Desk",
      "modules": [
        "DASHBOARD",
        "RESERVATION",
        "HISTORY"
      ]
    }
  }
}
```

---

# 34. Current Authenticated User

```http
GET /api/v1/management/auth/me
```

Used by the frontend to determine:

* Authentication state
* User information
* Assigned role
* Accessible modules

---

# 35. Dashboard API

```http
GET /api/v1/management/dashboard?week_start=2026-08-24&date=2026-08-27
```

Requires:

```text
DASHBOARD
```

Required filters:

```text
week_start (Y-m-d; normalized to Monday)
date (Y-m-d; selected schedule date)
```

The response contains:

* Monday-Sunday displayed week range
* Pending, Verified, and Completed counts whose `booking_date` is in that week
* Revenue from `final_amount` for Completed reservations booked in that week
* Seven daily availability totals derived from the public reservation source of truth
* Active courts and configured one-hour slots for the selected date
* Written slot states: `AVAILABLE`, `PENDING`, `VERIFIED`, `ONGOING`, `COMPLETED`, `CANCELLED`, `REJECTED`, `NO_SHOW`, `CLOSED`, or `PAST`
* Reservation ID and reference for occupied slots, including reservations in past time slots

Past slots are calculated with the `Asia/Manila` business timezone. A reservation's operational or final status takes precedence over `PAST`, and an explicit closure takes precedence over `PAST`, so the dashboard retains the status history for every slot.

---

# 36. Dashboard Reservation Detail

```http
GET /api/v1/management/dashboard/reservations/{reservation}
```

Requires:

```text
DASHBOARD
```

Returns the same read-only reservation detail shape used by the reservation View dialog for operational and final reservation records (`PENDING`, `VERIFIED`, `ONGOING`, `COMPLETED`, `CANCELLED`, `REJECTED`, and `NO_SHOW`). This lets a Dashboard-only Staff role inspect an occupied slot without granting reservation-management actions.

Payment proof files referenced by this response use the protected route:

```http
GET /api/v1/management/dashboard-payments/{payment}/proof
```

---

# 37. Management Reservation List

```http
GET /api/v1/management/reservations
```

Requires:

```text
RESERVATION
```

Suggested filters:

```text
status
search
page
per_page=10
```

The list contains operational records only. `status` accepts `PENDING`, `VERIFIED`, the derived `RESCHEDULED` marker, and `ONGOING`. Final `COMPLETED`, `REJECTED`, `CANCELLED`, and `NO_SHOW` records are available through History instead. Results are limited to 10 per page.

Search should support important values such as:

```text
reference number
customer name
email
contact number
payment reference
```

---

# 38. Management Reservation Detail

```http
GET /api/v1/management/reservations/{reservation}
```

Returns complete operational information including:

* Reservation reference
* Customer information
* Source
* Status
* Selected slots
* Slot prices
* Original amount
* Payment information
* Receipt
* Adjustments
* Extension slots
* Final amount
* Status history
* Schedule history
* Important timestamps

---

# 39. Verify Reservation

```http
POST /api/v1/management/reservations/{reservation}/verify
```

Requires:

```text
RESERVATION
```

Valid only when:

```text
status = PENDING
```

Conceptual transaction:

```text
BEGIN

Payment:
PENDING → VERIFIED

Reservation:
PENDING → VERIFIED

Set:
verified_by_user_id
verified_at

Create:
status_history
audit_log

COMMIT
```

---

# 40. Verify Response

```json
{
  "success": true,
  "message": "Reservation verified successfully.",
  "data": {
    "reference_number": "RF-001",
    "status": "VERIFIED"
  }
}
```

After successful commit, the verification email is sent when reservation emails are configured and enabled. It includes the reservation reference, verified status, court/date/time prices, additional players, rental items, amount paid, and arrival reminder.

---

## 40.1 Start Ongoing Reservation

```http
POST /api/v1/management/reservations/{reservation}/start
```

Requires `RESERVATION` module access and accepts only:

```text
VERIFIED → ONGOING
```

The transition is manually confirmed by Staff or Manager when the customer is at the facility and has started playing. It is never triggered automatically by the clock.

---

# 41. Reject Reservation

```http
POST /api/v1/management/reservations/{reservation}/reject
```

Requires:

```text
RESERVATION
```

Valid only when:

```text
PENDING
```

Suggested payload:

```json
{
  "concern": "INVALID_PAYMENT_PROOF",
  "reason": "Payment receipt could not be verified."
}
```

---

# 42. Rejection Transaction

```text
BEGIN

Payment:
PENDING → REJECTED

Reservation:
PENDING → REJECTED

Record:
reason
rejected_by
rejected_at
status history
audit log

COMMIT
```

Once committed:

* Associated future slots stop blocking availability.
* Reservation appears in History.
* The rejection email is sent only when reservation email delivery is enabled. It includes the reservation reference, concern, reason, court/date/time prices, additional players, rental items, and amount paid.

---

# 43. Create Walk-In Reservation

```http
POST /api/v1/management/reservations/walk-in
```

Requires:

```text
RESERVATION
```

Conceptual payload:

```json
{
  "customer_name": "Walk-In Customer",
  "customer_email": "walkin@example.com",
  "customer_contact_number": "09123456789",

  "slots": [
    {
      "court_id": 2,
      "date": "2026-08-15",
      "start_hour": 15
    }
  ],
  "additional_players": 1,
  "equipment": [
    {
      "id": 3,
      "quantity": 2
    }
  ],
  "payment_channel": "EWALLET_BANK",
  "payment_method_id": 1,
  "payment_reference_number": "GCASH-1001",
  "payment_proof": "<required image file for non-cash>"
}
```

The request is multipart when a receipt is attached. Supported `payment_channel` values are `CASH` and `EWALLET_BANK`.

For `CASH`, omit `payment_method_id`; the transaction reference and receipt are optional. For `EWALLET_BANK`, `payment_method_id` must identify an active method returned by `GET /api/v1/public/payment-methods`, and both `payment_reference_number` and `payment_proof` are required. The payment stores the selected method ID and a name snapshot so reports use the specific account (for example, GCash or BPI) rather than one generic non-cash category.

---

# 44. Walk-In Creation Rules

Walk-ins use the same slot validation as online reservations.

The operation must be atomic.

Once created:

```text
source = WALK_IN
status = VERIFIED
```

The backend calculates the court, additional-player, and equipment charges using current configuration snapshots. It records the full amount as a verified initial payment, sets `amount_paid` to the calculated amount, and makes the selected slots unavailable publicly.

Creating a walk-in sends the verification email when reservation email delivery is configured and enabled because its payment is already recorded as verified at creation. A later approved reschedule may send another email with the updated schedule.

Walk-ins must never bypass duplicate-reservation protection.

Equipment availability is checked transactionally across all selected reservation times because the reservation is immediately Verified. Any slot or equipment conflict rolls back the complete reservation and removes a newly stored receipt.

Successful response:

```text
HTTP 201 Created
```

---

# 45. Reschedule Reservation

```http
POST /api/v1/management/reservations/{reservation}/reschedule
```

Requires:

```text
Manager full access
```

The operation accepts only a stored `VERIFIED` reservation, including one carrying the derived `RESCHEDULED` marker. Repeated rescheduling is allowed.

The management action itself must validate all target slots.

---

# 46. Reschedule Payload

```json
{
  "slots": [
    {
      "court_id": 2,
      "date": "2026-08-17",
      "start_time": "14:00"
    },
    {
      "court_id": 3,
      "date": "2026-08-17",
      "start_time": "16:00"
    }
  ],
  "reason": "Customer requested schedule change."
}
```

---

# 47. Atomic Reschedule

Rescheduling must occur transactionally:

```text
BEGIN

1. Validate reservation is eligible
2. Validate every target slot
3. Secure all target slots
4. Preserve previous schedule
5. Replace/update active slot assignments
6. Release previous availability
7. Create schedule history
8. Create audit log
9. Require the replacement slot count to equal the current one-hour slot count
10. Create an additional balance for a positive price difference or refundable credit for a negative difference

COMMIT
```

If any new slot cannot be secured:

```text
ROLLBACK
```

The existing reservation schedule remains unchanged.

After a successful commit, the reschedule email is sent when reservation emails are configured and enabled. It contains the reservation reference, newly active court/date/time prices, additional players, rental items, and amount paid. Previous schedule data is retained internally in history but is not presented as the active schedule in this email.

---

# 48. Extend Reservation

```http
POST /api/v1/management/reservations/{reservation}/extend
```

Requires:

```text
RESERVATION
```

Only Staff/Manager can perform this action.

Players cannot call a public extension endpoint.

---

# 49. Extension Payload

Because reservations may contain multiple courts, the extension should identify which court receives the new slot.

```json
{
  "court_id": 1,
  "date": "2026-08-15",
  "start_time": "16:00"
}
```

The backend determines:

```text
end_time
applicable rate
extension charge
```

---

# 50. Extension Transaction

```text
BEGIN

1. Validate reservation is active
2. Validate requested slot
3. Lock slot
4. Determine applicable current rate
5. Create reservation_slot
   type = EXTENSION
6. Store rate snapshot
7. Recalculate reservation totals
8. Create audit log

COMMIT
```

---

# 51. Reservation Adjustments

## Add Adjustment

```http
POST /api/v1/management/reservations/{reservation}/adjustments
```

Requires:

```text
RESERVATION
```

Normal add-ons are accepted only while the reservation status is `ONGOING`. Supported operational add-ons are additional court times on the same booking date, additional players, and active rental equipment. The manager records payment for the add-ons in the same request.

Payload example:

```json
{
  "slots": [{ "court_id": 1, "date": "2026-08-25", "start_hour": 12 }],
  "additional_players": 1,
  "equipment": [{ "id": 1, "quantity": 1 }],
  "payment_channel": "EWALLET_BANK",
  "payment_method_id": 1,
  "payment_reference_number": "ADDON-001",
  "payment_proof": "(required image upload for non-cash)"
}
```

The request is multipart when a receipt is uploaded. The backend prices every item, records one verified `ADD_ON` payment for the amount due (including any prior outstanding balance after the adjustment), and updates `amount_paid`. Supported payment modes are `CASH` and `EWALLET_BANK`. Cash omits `payment_method_id` and may omit the transaction reference and receipt. Non-cash payments must use an active method returned by `GET /api/v1/public/payment-methods` and require both the transaction reference and receipt; the selected method ID and name snapshot are stored for reporting.

---

# 52. Adjustment Calculation

Backend calculates:

```text
quantity × unit_amount = total_amount
```

The frontend should not provide authoritative:

```text
total_amount
```

---

# 53. Remove Adjustment

Before reservation completion, authorized management may remove an adjustment when appropriate.

```http
DELETE /api/v1/management/reservations/{reservation}/adjustments/{adjustment}
```

The action should be audited.

Final History records must not permit normal adjustment mutation.

---

# 54. Complete Reservation

```http
POST /api/v1/management/reservations/{reservation}/complete
```

Requires:

```text
RESERVATION
```

Before completion the backend calculates:

```text
All reservation slot charges
+
All adjustments
=
Final Amount
```

The backend also calculates `max(final_amount - amount_paid, 0)` as the exact additional collection. When positive, Staff selects Cash, E-wallet, or Bank and may attach a transaction reference and proof image.

---

# 55. Completion Transaction

```text
BEGIN

1. Validate reservation can be completed
2. Calculate slot totals
3. Calculate adjustment totals
4. Calculate final_amount
5. Set status = COMPLETED
6. Set completed_at
7. Set completed_by_user_id
8. Create status history
9. Create audit log

COMMIT
```

Completed reservation becomes a History record.

---

# 56. Mark No-Show

```http
POST /api/v1/management/reservations/{reservation}/no-show
```

Requires:

```text
RESERVATION
```

Payload may contain:

```json
{
  "notes": "Customer did not arrive."
}
```

No-show is manually performed.

The API must not automatically perform this transition based only on time.

The non-refundable amount already collected is recognized as no-show revenue. Unpaid balances are not recognized as revenue.

---

# 57. Cancel Reservation

```http
POST /api/v1/management/reservations/{reservation}/cancel
```

Current authorization:

```text
Manager only
```

This is stricter than normal module access.

A Staff user with Reservation access must still receive:

```text
403 Forbidden
```

unless the cancellation policy changes later.

---

# 58. Cancellation Payload

```json
{
  "reason": "Approved force majeure cancellation.",
  "refund_type": "CUSTOM",
  "refund_amount": 500
}
```

Cancellation should:

* Set reservation to `CANCELLED`
* Record Manager
* Record timestamp
* Preserve reason
* Release appropriate future slots
* Create status history
* Create audit log
* Record either a full refund or Manager-selected custom refund
* Prevent the refund from exceeding the amount already collected
* Do not send a customer email; reservation email delivery is limited to verification, rejection, and rescheduling

---

# 59. Reservation State Validation

Every reservation action must validate the current state.

Examples:

Invalid:

```text
REJECTED → VERIFY
COMPLETED → RESCHEDULE
CANCELLED → COMPLETE
NO_SHOW → EXTEND
```

These should return:

```http
409 Conflict
```

Example:

```json
{
  "success": false,
  "message": "Completed reservations cannot be rescheduled."
}
```

---

# 60. History API

```http
GET /api/v1/management/history
```

Requires:

```text
HISTORY
```

Only final statuses should appear:

```text
COMPLETED
CANCELLED
REJECTED
NO_SHOW
```

Suggested filters:

```text
status
source
court_id
search
from
to
page
per_page
```

---

# 61. History Detail

```http
GET /api/v1/management/history/{reservation}
```

Returns the finalized reservation snapshot and historical information.

Normal History endpoints should be read-only.

No generic:

```text
PUT history
DELETE history
```

should exist.

---

# 62. Courts & Pricing Management

Requires:

```text
MANAGEMENT
```

Suggested routes:

```http
GET    /api/v1/management/courts
POST   /api/v1/management/courts
DELETE /api/v1/management/courts/{court}

GET    /api/v1/management/court-configuration
PUT    /api/v1/management/court-configuration

GET    /api/v1/management/rental-equipment
POST   /api/v1/management/rental-equipment
PATCH  /api/v1/management/rental-equipment/{rentalEquipment}
DELETE /api/v1/management/rental-equipment/{rentalEquipment}
```

Court names are generated from permanent sequential numbers. The shared configuration applies to all courts. Delete operations deactivate records so historical references remain meaningful.

---

# 63. Update Shared Court Configuration

Example payload:

```json
{
  "opening_hour": 7,
  "closing_hour": 24,
  "included_players_per_court": 4,
  "additional_player_price": 100,
  "weekday_rates": [
    { "start_hour": 7, "end_hour": 17, "price": 500 },
    { "start_hour": 17, "end_hour": 24, "price": 600 }
  ],
  "weekend_rates": [
    { "start_hour": 7, "end_hour": 24, "price": 700 }
  ]
}
```

Backend must enforce whole-hour boundaries and complete, consecutive coverage from opening through closing for both weekday and weekend periods.

---

# 64. Payment Method Management

```http
GET   /api/v1/management/payment-methods
POST  /api/v1/management/payment-methods
PATCH /api/v1/management/payment-methods/{paymentMethod}
DELETE /api/v1/management/payment-methods/{paymentMethod}
```

Create and update requests use multipart form data. Browser updates may send
`POST` with `_method=PATCH` so PHP receives the replacement image correctly.
QR images accept JPG, PNG, and WebP files up to 5 MB and are stored on the
public Laravel disk.

Manager should be able to:

* Add a supported e-wallet or bank payment method with its name, account name, and account number
* Update account information
* Replace QR image
* Remove a method from future payment selection by deactivating it

Historical payment records must remain meaningful after deactivation.

---

## 64.1 Storage & Data Retention

Requires:

```text
MANAGEMENT_STORAGE_RETENTION
```

Cleanup is manually triggered. No endpoint, scheduler, queue, or storage policy
may automatically purge proofs by age.

### Preview

```http
GET /api/v1/management/payment-proof-retention/preview?from=2026-01-01&to=2026-01-31
```

`from` and `to` are required inclusive date-only filters against
`reservations.booking_date`. The backend includes only `COMPLETED`, `CANCELLED`,
`REJECTED`, and `NO_SHOW` reservations and all proof-bearing initial, add-on, and
settlement payments attached to them. Preview totals include only managed proof
files that still physically exist. Payments with a `NULL` path or an already
missing/deleted file are omitted from all preview counts.

The response exposes aggregate scope only:

```json
{
  "from": "2026-01-01",
  "to": "2026-01-31",
  "reservations_affected": 18,
  "proof_count": 24,
  "reclaimable_bytes": 86402662,
  "status_counts": {
    "COMPLETED": 15,
    "CANCELLED": 1,
    "REJECTED": 1,
    "NO_SHOW": 1
  }
}
```

The response must not include customer details, payment references, private
paths, or individual payment records. Changing the selected dates invalidates
the browser's previous preview.

### Manual delete

```http
POST /api/v1/management/payment-proof-retention/delete
```

```json
{
  "from": "2026-01-01",
  "to": "2026-01-31",
  "confirm": true
}
```

The backend validates the dates, requires accepted confirmation, and rebuilds
the eligible query instead of trusting previewed counts. For each successful or
confirmed-missing proof it sets `proof_path` to `NULL` and writes
`proof_deleted_at` and `proof_deleted_by_user_id`. A storage deletion failure
must leave that proof path unchanged for retry.

The operation must never delete or modify reservation/payment business rows,
amounts, methods, references, statuses, customer information, histories,
adjustments, refunds, or reporting values. The response contains actual deleted,
missing, failed, affected-reservation, and reclaimed-byte totals. Technical
storage details are logged server-side and are not returned.

### Activity

```http
GET /api/v1/management/payment-proof-retention/activity?page=1
```

Returns five newest-first summarized `PAYMENT_PROOFS_DELETED` audit entries per
page. An entry is created only when at least one physical proof image was
successfully deleted, so successful deletions appear in the refreshed activity
log while missing-only or failed attempts do not. Each item contains only the
booking-date range, images deleted, reservations affected, reclaimed bytes,
non-zero missing/failed counts, result
state when partial, actor display name, and creation time. It does not expose
private paths, customer/payment data, IP addresses, user agents, or raw audit
JSON.

---

# 65. Closed Dates

```http
GET    /api/v1/public/closed-dates
POST   /api/v1/management/closed-dates
DELETE /api/v1/management/closed-dates/{closedDate}
```

The reopen request must include a required replacement internal reason:

```json
{
  "reason": "The event ended early; reopening for regular play."
}
```

The public endpoint returns active future whole-operation closure dates only. It never exposes internal reasons. Reservation and management calendars use this list to disable dates before selection.

Before creating a closure, backend must check for conflicts with active reservations.

It must not silently invalidate existing reservations.

---

# 66. Availability Blocks

```http
POST   /api/v1/management/availability-blocks
DELETE /api/v1/management/availability-blocks/{block}
```

The reopen request must include the same required `reason` payload. This description replaces the original internal reason on the reopening activity-log event.

Payload example:

```json
{
  "court_id": 3,
  "date": "2026-08-22",
  "periods": [
    { "start_hour": 14, "end_hour": 16 },
    { "start_hour": 18, "end_hour": 20 }
  ],
  "reason": "Maintenance"
}
```

Backend must reject blocks that conflict with active reservations unless those reservations are first properly resolved.

`DELETE` reopens the grouped closure: it deactivates the record and creates an audit event rather than erasing the closure history. The required `reason` in the request is recorded as the reopening event’s internal reason.

## Availability management lists

```http
GET /api/v1/management/availability-closures?page=1
GET /api/v1/management/availability-activity?page=1
```

Both endpoints return five records per page. The first lists active entire-operation and court-time closures together. The second lists closure and reopening events with their internal-reason and affected-schedule snapshot.

---

# 67. Events Management

```http
GET    /api/v1/management/events
POST   /api/v1/management/events
GET    /api/v1/management/events/{event}
POST   /api/v1/management/events/{event}
DELETE /api/v1/management/events/{event}
```

Possible event states:

```text
DRAFT
PUBLISHED
ARCHIVED
```

Event create and update requests include a public `header`, `image`, `description`, and `event_date`.

Deleting published historical content may instead be implemented as archive where appropriate.

Events must not affect court availability.

---

# 68. Gallery Management

```http
GET    /api/v1/management/gallery-tabs
POST   /api/v1/management/gallery-tabs
PATCH  /api/v1/management/gallery-tabs/display-order
PATCH  /api/v1/management/gallery-tabs/{galleryTab}
DELETE /api/v1/management/gallery-tabs/{galleryTab}

GET    /api/v1/management/gallery?gallery_tab_id={galleryTab}
POST   /api/v1/management/gallery
PATCH  /api/v1/management/gallery/{image}
DELETE /api/v1/management/gallery/{image}
PATCH  /api/v1/management/gallery-tabs/{galleryTab}/image-order
```

An image belongs to a selected gallery tab. Tab and image display order are persisted by drag-and-drop operations and determine their public order; numeric positions are not submitted through create or edit forms. New records are appended. Moving an image to another category appends it to the destination. Deleting a category permanently deletes its images and stored files. Neither management nor public responses generate an `All` tab.

Category create and update requests include `name`. Image create and update requests include `gallery_tab_id`, required accessible `alt_text`, and an image file on create; the file is optional during edit unless it is being replaced.

Image upload endpoints should validate:

* MIME type
* Maximum file size
* Image dimensions when appropriate

---

# 69. Reservation Policies Management

```http
GET    /api/v1/management/policy-sections
POST   /api/v1/management/policy-sections/{section}/subheaders
PATCH  /api/v1/management/policy-subheaders/{subheader}
DELETE /api/v1/management/policy-subheaders/{subheader}
PATCH  /api/v1/management/policy-sections/{section}/subheader-order
POST   /api/v1/management/policy-sections/{section}/rules
PATCH  /api/v1/management/policy-rules/{rule}
DELETE /api/v1/management/policy-rules/{rule}
PATCH  /api/v1/management/policy-subheaders/{subheader}/rule-order
```

The fixed section slugs are `court-rules`, `reservation-rules`, `reschedule-policy`, and `cancellation-policy`. Management cannot create, rename, or delete sections. Sub-headers can only be deleted when empty; rules can be moved to another sub-header in the same section by editing them. Ordering endpoints require the complete owned list and persist drag-and-drop changes transactionally.

---

# 70. FAQ Management

```http
GET    /api/v1/management/faqs
POST   /api/v1/management/faqs
PATCH  /api/v1/management/faqs/{faq}
DELETE /api/v1/management/faqs/{faq}
PATCH  /api/v1/management/faqs/display-order
```

Each FAQ is a public question-and-answer card. The display-order endpoint persists drag-and-drop reordering.

---

# 71. Website Settings Management

```http
GET   /api/v1/management/site-settings
PATCH /api/v1/management/site-settings
```

May control approved configuration such as:

* About Us
* Operating hours
* Contact details
* Address
* Social links
* Facebook/Messenger URL
* Hero information

The API should only accept predefined supported settings.

It must not become an arbitrary key/value code-execution mechanism.

---

# 72. Roles Management

Manager-only administrative area.

Suggested routes:

```http
GET    /api/v1/management/roles
POST   /api/v1/management/roles
GET    /api/v1/management/roles/{role}
PATCH  /api/v1/management/roles/{role}
```

Payload:

```json
{
  "name": "Front Desk",
  "description": "Handles reservations and customer operations.",
  "modules": [
    "DASHBOARD",
    "RESERVATION",
    "HISTORY"
  ]
}
```

---

# 73. Role Validation

The API must reject unknown module identifiers.

A role must never receive capabilities outside the supported module registry.

System Manager privileges should not be accidentally removable through normal role editing.

---

# 74. Staff Management

Manager-only.

Suggested routes:

```http
GET    /api/v1/management/staff
POST   /api/v1/management/staff
GET    /api/v1/management/staff/{staff}
PATCH  /api/v1/management/staff/{staff}
```

---

# 75. Create Staff Account

Payload:

```json
{
  "first_name": "Ana",
  "last_name": "Santos",
  "email": "ana@example.com",
  "role_id": 3
}
```

Each Staff account must have exactly one role.

---

# 76. Staff Deactivation

Instead of deleting Staff with historical actions:

```http
POST /api/v1/management/staff/{staff}/deactivate
```

Reactivation may use:

```http
POST /api/v1/management/staff/{staff}/activate
```

Historical audit records must continue referencing the Staff account.

---

# 77. Settings

Authenticated Manager personal settings:

```http
GET   /api/v1/management/settings/profile
PATCH /api/v1/management/settings/profile
```

Credential update:

```http
PATCH /api/v1/management/settings/password
```

Password changes should require the current password unless another secure recovery flow applies.

---

# 78. Reports Overview

Requires:

```text
REPORTS
```

Base route:

```http
GET /api/v1/management/reports/overview
```

Required filters:

```text
from
to
```

Optional filters:

```text
court_id
source
```

`from` and `to` are inclusive Manila business dates. `from` must not be later
than `to`, and `to` must not be later than the current Manila date. `source`
accepts `ONLINE` or `WALK_IN`. All report endpoints use the standard API
envelope and require the `REPORTS` module.

---

# 79. Revenue Report

```http
GET /api/v1/management/reports/revenue
```

Recognized revenue uses:

```text
SUM(final_amount) for COMPLETED reservations, dated by completed_at
+
SUM(amount_paid) for NO_SHOW reservations, dated by no_show_at
```

`VERIFIED`, `PENDING_PAYMENT`, and other non-finalized states are not recognized
revenue. Average reservation value divides completed revenue by completed count
and returns `null` when the denominator is zero. When `court_id` is supplied,
revenue is limited to completed slot-derived revenue for that court; a
reservation-wide final amount must never be duplicated across courts.

Possible grouping:

```text
day
week
month
```

Example:

```http
GET /api/v1/management/reports/revenue?from=2026-08-01&to=2026-08-31&group_by=day
```

---

# 80. Reservation Report

```http
GET /api/v1/management/reports/reservations
```

Provides:

* Completed count
* Rejected count
* Cancelled count
* No-show count
* Online vs walk-in
* Reservation trend

The reservation trend is grouped by `submitted_at`. Outcome counts are grouped
by each outcome's own timestamp (`completed_at`, `rejected_at`, `cancelled_at`,
or `no_show_at`).

---

# 81. Court Utilization Report

```http
GET /api/v1/management/reports/court-utilization
```

Utilization uses:

```text
completed reservation-slot hours / sellable court hours × 100
```

Sellable hours are current configured operating hours minus recorded closures.
No-shows do not count as actual use, overlapping closures are deducted once,
and future unelapsed hours on the current Manila date are excluded.

Court rows and court filter options are limited to courts with at least one
reservation-slot record in the selected date/source scope. An inactive court
is retained when it has historical slot data; a court with no slot records is
treated as nonexistent for that report view.

---

# 82. Popular Time Report

```http
GET /api/v1/management/reports/popular-times
```

Uses reservation-slot data to determine frequently used times.

It returns a court/day/hour heatmap and day-of-week rollups using completed
court hours and the same sellable-capacity denominator as utilization.

---

# 82.1. Payment Report

```http
GET /api/v1/management/reports/payments
```

Provides verified online-payment verification time (average and median) and a
payment-method breakdown for reservations in the selected scope.

---

# 82.2. Operations Report

```http
GET /api/v1/management/reports/operations
```

Provides rejection concerns, reschedules, extensions, closure hours,
operational availability, and finalized outcome counts.

---

# 83. Reports Must Use Transactional Data

Reporting endpoints should compute results from:

```text
reservations
reservation_slots
reservation_adjustments
reservation_payments
reservation_schedule_histories
availability_closures
```

and related transactional tables.

Reports must not maintain duplicate manually updated revenue totals.

---

# 84. Pagination

List endpoints should use pagination.

Suggested defaults:

```text
per_page = 20
```

Suggested maximum:

```text
per_page = 100
```

Example:

```http
GET /api/v1/management/reservations?page=2&per_page=20
```

---

# 85. Filtering

Filtering should use explicit query parameters.

Example:

```http
GET /api/v1/management/reservations
    ?status=VERIFIED
    &source=ONLINE
    &from=2026-08-01
    &to=2026-08-31
```

Avoid creating separate API routes for every possible filter combination.

---

# 86. Sorting

Suggested pattern:

```text
sort=created_at
direction=desc
```

Only approved sortable fields should be accepted.

Do not directly trust arbitrary database column names from client input.

---

# 87. Search

General management search should be sanitized.

Potential searchable reservation fields include:

```text
reference_number
customer_name
customer_email
customer_contact_number
payment_reference_number
```

Search should not expose arbitrary raw SQL behavior.

---

# 88. File Upload Rules

Applicable uploads include:

* Payment receipts
* Payment QR codes
* Gallery images
* Event cover images

Backend must validate:

```text
allowed MIME types
maximum file size
file integrity
```

Uploaded files should use generated storage names rather than trusting original filenames.

New payment-proof uploads continue to accept JPG, JPEG, PNG, and WebP up to the
existing 5 MB limit. The backend converts validated new proofs to a readable
private WebP file and removes the temporary original. Existing stored proofs are
not automatically converted, and users are not required to submit WebP
themselves.

---

# 89. Payment Receipt Security

Payment receipts contain potentially sensitive financial information.

Receipt URLs should not necessarily be publicly accessible.

Only authenticated authorized management users should normally be able to access them.

Manual cleanup may make an older finalized proof unavailable. After successful
cleanup, reservation/payment detail returns `proof_url: null` and protected proof
routes return `404`; the underlying payment and reservation records remain.

---

# 90. Input Sanitization

All text input must be validated and sanitized appropriately.

Examples:

* Customer names
* Event content
* Rules
* FAQ content
* Notes
* Reasons
* Website content

Sanitization must not be used as a replacement for output escaping.

---

# 91. Server-Side Business Rule Enforcement

The API is the authoritative business-rule layer.

The frontend may assist with:

* Validation
* Disabled buttons
* Availability display
* Price previews
* Permission-based navigation

but the backend must independently enforce:

* Slot availability
* Pricing
* Reservation transitions
* Authorization
* Payment requirements
* Rate rules
* Cancellation authority
* Duplicate-reservation prevention

---

# 92. Concurrency Protection

Availability checks alone are insufficient.

Two players may both see:

```text
Court 1
3 PM
AVAILABLE
```

and submit simultaneously.

The reservation creation process must use database-level concurrency protection so only one succeeds.

Conceptually:

```text
Request A
┐
├── attempt same slot
│
Request B
┘

Database guarantees:

ONE succeeds
ONE receives 409 Conflict
```

---

# 93. Transaction-Critical Endpoints

The following operations must be transactional:

```text
Public reservation submission
Walk-in creation
Reservation verification
Reservation rejection
Reservation rescheduling
Reservation extension
Reservation completion
Reservation cancellation
```

Configuration CRUD may not always require complex transactions, but related multi-record updates should still be atomic.

---

# 94. Audit Requirements

Important management actions should create audit records.

Examples:

```text
RESERVATION_VERIFIED
RESERVATION_REJECTED
RESERVATION_RESCHEDULED
RESERVATION_EXTENDED
RESERVATION_COMPLETED
RESERVATION_CANCELLED
RESERVATION_NO_SHOW

ROLE_CREATED
ROLE_UPDATED

STAFF_CREATED
STAFF_UPDATED
STAFF_DISABLED

RATE_UPDATED
PAYMENT_METHOD_UPDATED

DATE_CLOSED
COURT_SLOT_BLOCKED
```

---

# 95. Email Side Effects

Emails should be triggered after successful state transitions.

Current events:

```text
RESERVATION_SUBMITTED
RESERVATION_VERIFIED
RESERVATION_REJECTED
RESERVATION_RESCHEDULED
RESERVATION_CANCELLED
```

API success should represent successful business-state persistence.

Email transport failure should be logged/retried separately where the implementation supports it.

---

# 96. Date and Time API Format

Transaction timestamps should use ISO 8601.

Example:

```text
2026-08-15T14:30:00+08:00
```

Reservation business dates:

```text
2026-08-15
```

Reservation local times:

```text
15:00
16:00
```

Court schedule times should preserve the Dinks on Us local business time.

---

# 97. Monetary API Format

Amounts should be represented consistently.

Example:

```json
{
  "original_amount": 1000,
  "adjustment_amount": 100,
  "final_amount": 1700,
  "currency": "PHP"
}
```

The backend database should use fixed precision rather than floating-point values.

---

# 98. Public API Security

Public APIs should apply reasonable protection against abuse.

Especially:

```text
reservation submission
availability polling
file uploads
```

Possible protections include:

* Rate limiting
* Payload limits
* File-size limits
* Server-side validation
* Abuse monitoring

CAPTCHA should only be introduced if actual abuse becomes a problem unless the project explicitly requires it earlier.

---

# 99. Management API Security

Management APIs must:

* Require authentication
* Verify account is active
* Enforce module permissions
* Protect sensitive files
* Validate state transitions
* Audit important actions
* Avoid exposing credentials
* Avoid exposing environment information

---

# 100. No Generic Reservation Update Endpoint

Avoid an unrestricted endpoint such as:

```http
PATCH /reservations/{id}
```

that allows clients to arbitrarily change:

```text
status
amount
court
schedule
payment
```

Important state changes should use explicit action endpoints:

```text
/verify
/reject
/reschedule
/extend
/complete
/no-show
/cancel
```

This makes business rules easier to enforce and audit.

---

# 101. No Generic Status Assignment

The API should not accept:

```json
{
  "status": "COMPLETED"
}
```

from a generic reservation edit request.

Instead:

```http
POST /reservations/{id}/complete
```

The backend performs the valid transition and all required side effects.

---

# 102. API Route Summary

## Public

```text
GET  /api/v1/health

GET  /api/v1/public/site
GET  /api/v1/public/courts
GET  /api/v1/public/rates
GET  /api/v1/public/payment-methods
GET  /api/v1/public/availability

GET  /api/v1/public/rules
GET  /api/v1/public/gallery
GET  /api/v1/public/faqs

GET  /api/v1/public/events
GET  /api/v1/public/events/{slug}

POST /api/v1/public/reservations
```

---

## Authentication

```text
POST /api/v1/management/auth/login
GET  /api/v1/management/auth/me
POST /api/v1/management/auth/logout
```

---

## Dashboard

```text
GET /api/v1/management/dashboard
GET /api/v1/management/dashboard/availability
```

---

## Reservations

```text
GET  /api/v1/management/reservations
GET  /api/v1/management/reservations/pending-summary
GET  /api/v1/management/reservations/{reservation}

POST   /api/v1/management/push-subscriptions
DELETE /api/v1/management/push-subscriptions

POST /api/v1/management/reservations/walk-in

POST /api/v1/management/reservations/{reservation}/verify
POST /api/v1/management/reservations/{reservation}/reject
POST /api/v1/management/reservations/{reservation}/reschedule
POST /api/v1/management/reservations/{reservation}/extend
POST /api/v1/management/reservations/{reservation}/complete
POST /api/v1/management/reservations/{reservation}/no-show
POST /api/v1/management/reservations/{reservation}/cancel

POST   /api/v1/management/reservations/{reservation}/adjustments
DELETE /api/v1/management/reservations/{reservation}/adjustments/{adjustment}
```

---

## History

```text
GET /api/v1/management/history
GET /api/v1/management/history/{reservation}
```

---

## Management

```text
Courts & Pricing
  - Courts, rates, player limits, operating hours, rental equipment
Availability & Closures
  - Closed dates and availability blocks
Payment Methods
Team & Access
  - Roles and Staff accounts
Reservation Policies
Events
Gallery
FAQs
Storage & Data Retention
  - Manual finalized payment-proof preview, deletion, and activity
```

---

## Reports

```text
GET /api/v1/management/reports/overview
GET /api/v1/management/reports/revenue
GET /api/v1/management/reports/reservations
GET /api/v1/management/reports/court-utilization
GET /api/v1/management/reports/popular-times
GET /api/v1/management/reports/payments
GET /api/v1/management/reports/operations
```

---

# 103. Core API Invariants

The following API rules must always remain true:

```text
1. Players do not need authentication to reserve.

2. The backend recalculates reservation pricing.

3. Availability must be revalidated at final submission.

4. Multi-slot reservations are created atomically.

5. A reservation may contain different courts and non-consecutive slots.

6. Waiting-for-verification reservations immediately occupy their slots.

7. Rejected reservations release their slots.

8. Walk-ins use the same availability system.

9. Duplicate reservations must be prevented by backend/database enforcement.

10. Important reservation changes use explicit action endpoints.

11. Reservation status cannot be arbitrarily assigned by clients.

12. Rescheduling is atomic.

13. Extensions can only use currently available slots.

14. Only management users may extend reservations.

15. Manager currently has exclusive cancellation authority.

16. Finalized History records are read-only through normal APIs.

17. Revenue reports use Completed reservation final amounts.

18. Staff module access must be enforced server-side.

19. Important management actions are auditable.

20. Existing historical transaction values must survive future configuration changes.
```

---

# 104. Pending API Decisions

The following may change after the next client meeting:

### Cancellation

Potential future API changes may depend on:

* Refund workflow
* Cancellation deadline
* Staff cancellation permissions

### Rescheduling

Potential future validation depends on:

* Rescheduling deadline
* Number of allowed reschedules
* Fees

### No-Show

Validation may later include:

* Configured grace period

### Add-Ons

If add-ons become a managed catalog, APIs may later include:

```text
/api/v1/management/add-ons
```

### Walk-In Payment

Walk-in request payload may expand after client payment requirements are confirmed.

---

# 105. Document Status

This document represents the current API contract for Dinks on Us based on the agreed system overview, business rules, and conceptual data model.

The implementation may organize controllers, services, requests, resources, policies, and route files differently, but the resulting API behavior should preserve the rules defined here.

Changes to business behavior should be reflected in the following order:

```text
SYSTEM_OVERVIEW.md
        ↓
BUSINESS_RULES.md
        ↓
DATA_MODEL.md
        ↓
API_SPEC.md
```

before implementation is modified.

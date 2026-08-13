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
MANAGEMENT
REPORTS
SETTINGS
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

# 12. Public Court Rules

```http
GET /api/v1/public/rules
```

Returns active court rules ordered by display order.

---

# 13. Public Gallery

```http
GET /api/v1/public/gallery
```

Returns active public gallery images.

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

# 16. Public Courts

```http
GET /api/v1/public/courts
```

Returns active courts available for reservation.

Example:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Court 1"
    },
    {
      "id": 2,
      "name": "Court 2"
    },
    {
      "id": 3,
      "name": "Court 3"
    }
  ]
}
```

---

# 17. Public Rates

```http
GET /api/v1/public/rates
```

Returns active rate configuration required for display purposes.

The frontend may display pricing information, but the frontend must not be trusted to calculate the authoritative reservation amount.

The backend calculates the final booking price.

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
    WAITING_FOR_VERIFICATION
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
  "message": "Reservation submitted successfully and is waiting for verification.",
  "data": {
    "reference_number": "DOU-20260815-0012",
    "status": "WAITING_FOR_VERIFICATION",
    "original_amount": 1500,
    "slots": []
  }
}
```

---

# 30. Reservation Submission Email

After successful database commit, the system should trigger the reservation acknowledgment email.

Email failure should not cause a successfully stored reservation to disappear.

The reservation transaction and email delivery should be treated as separate responsibilities.

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
GET /api/v1/management/dashboard
```

Requires:

```text
DASHBOARD
```

Suggested filters:

```text
date
from
to
```

Possible data:

* Waiting reservations
* Verified upcoming reservations
* Today's reservations
* Completed reservations
* Current availability
* Revenue summary
* Walk-in count
* Online reservation count

---

# 36. Dashboard Weekly Availability

```http
GET /api/v1/management/dashboard/availability
```

Suggested query:

```text
start_date=2026-08-10
end_date=2026-08-16
```

Returns court/time states for management calendar display.

Management may see more information than the public endpoint.

Possible states:

```text
AVAILABLE
WAITING_FOR_VERIFICATION
VERIFIED
ONGOING
BLOCKED
CLOSED
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
source
date
court_id
search
from
to
page
per_page
sort
```

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
status = WAITING_FOR_VERIFICATION
```

Conceptual transaction:

```text
BEGIN

Payment:
PENDING → VERIFIED

Reservation:
WAITING_FOR_VERIFICATION → VERIFIED

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
    "reference_number": "DOU-20260815-0012",
    "status": "VERIFIED"
  }
}
```

After successful commit:

* Send verification email.

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
WAITING_FOR_VERIFICATION
```

Suggested payload:

```json
{
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
WAITING_FOR_VERIFICATION → REJECTED

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
* Rejection email is sent.

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
  "customer_contact_number": "09123456789",

  "slots": [
    {
      "court_id": 2,
      "date": "2026-08-15",
      "start_time": "15:00"
    }
  ],

  "notes": ""
}
```

Payment fields depend on future client confirmation.

---

# 44. Walk-In Creation Rules

Walk-ins use the same slot validation as online reservations.

The operation must be atomic.

Once created:

```text
source = WALK_IN
```

and the selected slots become unavailable publicly.

Walk-ins must never bypass double-booking protection.

---

# 45. Reschedule Reservation

```http
POST /api/v1/management/reservations/{reservation}/reschedule
```

Requires:

```text
RESERVATION
```

Current business policy around who may request rescheduling remains pending.

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

COMMIT
```

If any new slot cannot be secured:

```text
ROLLBACK
```

The existing reservation schedule remains unchanged.

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

Payload example:

```json
{
  "type": "ADDITIONAL_PLAYER",
  "name": "Additional Player",
  "quantity": 1,
  "unit_amount": 100
}
```

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
  "reason": "Customer requested cancellation through Messenger."
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
* Trigger cancellation email

Refund handling is outside the current confirmed scope.

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

# 62. Rates Management

Requires:

```text
MANAGEMENT
```

Suggested routes:

```http
GET    /api/v1/management/rates
POST   /api/v1/management/rates
GET    /api/v1/management/rates/{rate}
PUT    /api/v1/management/rates/{rate}
PATCH  /api/v1/management/rates/{rate}
```

Prefer deactivation over destructive deletion when a rate has historical references.

---

# 63. Create Rate

Example payload:

```json
{
  "name": "Day Rate",
  "start_time": "07:00",
  "end_time": "17:00",
  "price": 500,
  "days": [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY"
  ],
  "is_active": true
}
```

Backend must prevent ambiguous overlapping active rate rules.

---

# 64. Payment Method Management

```http
GET   /api/v1/management/payment-methods
POST  /api/v1/management/payment-methods
GET   /api/v1/management/payment-methods/{paymentMethod}
POST  /api/v1/management/payment-methods/{paymentMethod}
```

A multipart request may be used when changing the QR code image.

Manager should be able to:

* Add payment method
* Update account information
* Replace QR image
* Activate
* Deactivate

Historical payment records must remain meaningful after deactivation.

---

# 65. Closed Dates

```http
GET    /api/v1/management/closed-dates
POST   /api/v1/management/closed-dates
PATCH  /api/v1/management/closed-dates/{closedDate}
DELETE /api/v1/management/closed-dates/{closedDate}
```

Before creating a closure, backend must check for conflicts with active reservations.

It must not silently invalidate existing bookings.

---

# 66. Availability Blocks

```http
GET    /api/v1/management/availability-blocks
POST   /api/v1/management/availability-blocks
PATCH  /api/v1/management/availability-blocks/{block}
DELETE /api/v1/management/availability-blocks/{block}
```

Payload example:

```json
{
  "court_id": 3,
  "date": "2026-08-22",
  "start_time": "14:00",
  "end_time": "16:00",
  "reason": "Maintenance"
}
```

Backend must reject blocks that conflict with active reservations unless those reservations are first properly resolved.

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

Deleting published historical content may instead be implemented as archive where appropriate.

Events must not affect court availability.

---

# 68. Gallery Management

```http
GET    /api/v1/management/gallery
POST   /api/v1/management/gallery
PATCH  /api/v1/management/gallery/{image}
DELETE /api/v1/management/gallery/{image}
```

Image upload endpoints should validate:

* MIME type
* Maximum file size
* Image dimensions when appropriate

---

# 69. Court Rules Management

```http
GET    /api/v1/management/rules
POST   /api/v1/management/rules
PATCH  /api/v1/management/rules/{rule}
DELETE /api/v1/management/rules/{rule}
```

Rules support:

```text
title
description
display_order
is_active
```

---

# 70. FAQ Management

If FAQ is dynamic:

```http
GET    /api/v1/management/faqs
POST   /api/v1/management/faqs
PATCH  /api/v1/management/faqs/{faq}
DELETE /api/v1/management/faqs/{faq}
```

If FAQ remains static, these endpoints may be omitted.

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

Suggested filters:

```text
from
to
court_id
source
```

---

# 79. Revenue Report

```http
GET /api/v1/management/reports/revenue
```

Revenue must primarily use:

```text
status = COMPLETED
final_amount
```

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

May provide:

* Completed count
* Rejected count
* Cancelled count
* No-show count
* Online vs walk-in
* Reservation trend

---

# 81. Court Utilization Report

```http
GET /api/v1/management/reports/court-utilization
```

Possible output:

```json
{
  "court_id": 1,
  "court_name": "Court 1",
  "booked_hours": 125,
  "completed_hours": 110
}
```

Exact utilization formula can be finalized later.

---

# 82. Popular Time Report

```http
GET /api/v1/management/reports/popular-times
```

Uses reservation-slot data to determine frequently used times.

---

# 83. Reports Must Use Transactional Data

Reporting endpoints should compute results from:

```text
reservations
reservation_slots
reservation_adjustments
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

---

# 89. Payment Receipt Security

Payment receipts contain potentially sensitive financial information.

Receipt URLs should not necessarily be publicly accessible.

Only authenticated authorized management users should normally be able to access them.

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
* Double-booking prevention

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
GET  /api/v1/management/reservations/{reservation}

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
Rates
Payment Methods
Closed Dates
Availability Blocks
Events
Gallery
Rules
FAQ
Site Settings
Roles
Staff
```

---

## Reports

```text
GET /api/v1/management/reports/overview
GET /api/v1/management/reports/revenue
GET /api/v1/management/reports/reservations
GET /api/v1/management/reports/court-utilization
GET /api/v1/management/reports/popular-times
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

9. Double booking must be prevented by backend/database enforcement.

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

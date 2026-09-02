# Dinks on Us — System Overview

## 1. Business Overview

**Dinks on Us** is a pickleball sports business located in **Bulacan, Philippines**.

The system will serve two primary groups:

### Players / Community

The public website will provide access to:

* Real-time court slot availability
* Online court reservations
* Events and announcements
* Court rules and etiquette
* Rates and pricing
* Gallery
* Location information
* Operating information
* Frequently asked questions
* Business contact and social media channels

Players **do not need to create an account** to make a reservation.

### Manager / Staff

The management system will allow authorized personnel to:

* Track reservation submissions
* Verify payments manually
* Manage upcoming and ongoing reservations
* Handle walk-in reservations
* Manage court availability
* Close dates or specific court slots
* Manage dynamic website content
* Create courts and configure their rates, player limits, operating hours, and rentable equipment
* Manage payment methods and QR codes
* Manage Staff accounts and roles
* Maintain reservation history
* Review reports and analytics
* Convert operational data into useful business information

---

# 2. Public Website

The public website is primarily intended for players and the pickleball community.

## 2.1 Landing Page

**Path:** `/`

The Landing Page serves as the main public-facing page of Dinks on Us.

### Header

The header contains:

* Dinks on Us logo
* Main navigation
* Staff / Manager login

### Navigation

1. **Home**

   * Path: `/`
   * Main public page

2. **Reserve**

   * Dedicated reservation page

3. **Events**

   * Dedicated events and announcements page

4. **FAQ**

   * Dedicated frequently asked questions page

5. **Staff / Manager Login**

   * Provides access to the management system

---

## 2.2 Hero Section

The Hero Section showcases the Dinks on Us facility and brand.

It may contain:

* Facility image
* Main headline
* Supporting text
* Call-to-action buttons

Primary actions may include:

* Reserve a Court
* View Location

Events and announcements remain available from the main navigation and the
dedicated `/events` page; they are not duplicated in the Hero or Home sections.

---

## 2.3 Court Etiquette Section

Displays court rules, policies, and etiquette established by Dinks on Us.

These rules can be managed dynamically through the Management module.

---

## 2.4 How to Reserve Section

Provides players with a clear step-by-step guide explaining how to make an online reservation.

---

## 2.5 About Us Section

Displays business information and content provided by Dinks on Us.

---

## 2.6 Gallery Section

Displays business and facility images uploaded through the Management system.

---

## 2.7 Location Section

Displays the physical location of Dinks on Us through an embedded Google Map.

---

## 2.8 Footer

The footer may contain:

* Business information
* Quick navigation
* Operating hours
* Contact details
* Social media links
* Other relevant public information

---

## 2.9 Floating Message Button

A floating messaging button will be visible on the public website.

It will redirect players to the official Dinks on Us Facebook or Messenger page.

This can also be used by players for matters such as cancellation or direct communication with the business.

---

# 3. Reservation Page

**Path:** `/reserve`

The Reservation Page allows players to view available court slots and submit online reservations.

Players do not need to create or log in to a customer account.

---

# 4. Reservation Slot Structure

Every reservation slot represents:

* One court
* One specific date
* One one-hour time period

Example:

```text
Court 1
3:00 PM – 4:00 PM
₱500
```

Reservations are fundamentally based on **one-hour slots**.

However, players may select multiple available slots under a single reservation.

---

# 5. Multiple Slot Reservations

A single reservation may contain:

* Multiple time slots
* Non-consecutive time slots
* Multiple courts
* Different courts at different times

Players are not required to select consecutive hours.

Example:

```text
Reservation RF-125

Court 1
9:00 AM – 10:00 AM
₱500

Court 1
1:00 PM – 2:00 PM
₱500

Court 2
10:00 AM – 11:00 AM
₱500

Court 3
6:00 PM – 7:00 PM
₱600

Total: ₱2,100
```

All selected slots belong to **one reservation** and are paid together.

Internally, each court/time slot should still be tracked independently for availability purposes.

---

# 6. Reservation Form

The reservation form should require the necessary customer and payment information.

Current expected fields include:

### Customer Information

* Full Name
* Email Address
* Contact Number

### Reservation Information

* Selected Date
* Selected Court or Courts
* Selected Time Slot or Slots

### Payment Information

* Selected Payment Method
* Payment Reference Number
* Payment Receipt Image

All required fields must be completed before submission.

---

# 7. Rates and Pricing

Rates are calculated per one-hour court slot.

Temporary starting rates:

```text
Day Rate
₱500 / court / hour

Night Rate
₱600 / court / hour
```

These values are not hard-coded business rules.

The Manager must be able to configure pricing dynamically.

The Manager maintains one court configuration shared by every existing and future court. Configurable information includes:

* Opening and closing time
* Consecutive start and end times
* Price per hour
* Weekday price periods
* Weekend price periods
* Players included per court
* Additional-player price

Example:

```text
Start: 7:00 AM
End: 5:00 PM
Price: ₱500

Start: 5:00 PM
End: 12:00 AM
Price: ₱600
```

The system calculates the total reservation amount based on the rate applicable to each selected slot.

---

# 8. Payment Process

Dinks on Us will **not use an automated online payment gateway**.

Payments will be handled manually through configured e-wallet accounts.

The player:

1. Selects a payment method.
2. Views the QR code associated with that payment method.
3. Sends payment through the selected e-wallet.
4. Uploads the payment receipt.
5. Enters the payment reference number.
6. Submits the reservation.

The Staff or Manager manually verifies the submitted payment.

---

# 9. Payment Methods

The Manager can configure multiple payment methods.

Example:

```text
Payment Methods
│
├── GCash
│   ├── Account Name
│   ├── Account Number / Identifier
│   ├── QR Code Image
│   └── Active / Inactive
│
├── Maya
│   ├── Account Name
│   ├── Account Number / Identifier
│   ├── QR Code Image
│   └── Active / Inactive
│
└── Other Supported Wallets
```

When a player selects a payment method, the correct QR code and payment information should be displayed.

---

# 10. Reservation Submission and Slot Locking

Once a player successfully submits a complete reservation:

* The reservation status becomes **Pending**.
* Every selected court/time slot immediately becomes unavailable to other players.
* The slots remain blocked while payment verification is pending.

This prevents multiple players from paying for the same slot.

If the reservation is later rejected, the selected slots immediately become available again.

---

# 11. Reservation Status Lifecycle

The primary reservation flow is:

```text
AVAILABLE SLOT
      │
      │ Reservation Submitted
      ▼
PENDING
      │
      ├──────────────► REJECTED
      │                   │
      │                   └── Slots become available again
      │
      ▼
VERIFIED
      │
      ├──► RESCHEDULED marker → VERIFIED
      │
      ├──► CANCELLED
      │
      ├──► NO-SHOW
      │
      └──► ONGOING
               │
               └──► COMPLETED
```

---

# 12. Pending

A submitted online reservation begins with:

**Pending**

The reservation remains in this state until an authorized Staff member or Manager reviews the payment information.

---

# 13. Verified Reservation

Once payment is confirmed, the reservation becomes:

**Verified**

A verified reservation is considered an accepted upcoming reservation.

Its associated slots remain unavailable.

---

# 14. Rejected Reservation

If the payment cannot be verified or the reservation is invalid, the reservation becomes:

**Rejected**

When rejected:

* The reservation becomes finalized.
* All selected court/time slots are released.
* The slots become publicly available again.
* The record is moved into History.

---

# 15. Rescheduling

Only the Manager may reschedule a verified reservation. Repeated rescheduling is allowed and every schedule change is preserved.

Rescheduling should preserve the history of the previous schedule.

Conceptually:

```text
Original:
Court 1
August 15
3:00 PM – 4:00 PM

Rescheduled:
Court 2
August 16
5:00 PM – 6:00 PM

Current Status:
Verified
```

Rescheduling should be treated primarily as an operational action with historical tracking rather than permanently leaving the reservation in a `Rescheduled` state.

The new selected slots must be available before the reschedule can be completed.

The replacement must contain the same number of one-hour slots. A higher rate creates an additional balance; a lower rate creates refundable credit.

---

# 16. No-Show

A reservation may be marked:

**No-show**

This is performed manually by authorized Staff or the Manager.

The system should not automatically mark customers as no-show because the business may allow some arrival grace period.

The exact late-arrival or no-show policy is still subject to client confirmation.

---

# 17. Cancellation

A verified reservation may be cancelled.

For the current assumed process:

* The customer contacts Dinks on Us through Facebook / Messenger.
* The business handles the cancellation request outside the customer website.
* The **Manager** performs the cancellation inside the management system.

Cancelled reservations become finalized records and are moved to History.

The following policies are still subject to client confirmation:

* Cancellation deadline
* Refund eligibility
* Cancellation fees
* Rescheduling versus cancellation rules

---

# 18. Reservation Email Notifications

The system contains email structures for payment-verification results and reservation rescheduling. Delivery occurs only when a mail provider is configured and reservation email delivery is explicitly enabled.

## Submission Confirmation

Successful submission does not send an email. The reservation page confirms that the reservation was received, is pending payment review, and is not yet fully verified.

## Verification Result Emails

After Staff or Management reviews the payment, the customer receives either a Verified or Rejected email. Both messages include:

```text
Reference:
RF-001

Status:
Verified or Rejected

Reservation summary:
Court, date, time, and price

Additional reservation details:
Additional players and rental items

Payment summary:
Amount paid
```

A rejection email also includes the concern and staff-provided reason. A verification email includes the arrival reminder.

## Reschedule Email

After a successful reschedule, the customer receives an email containing the reservation reference, updated active court/date/time prices, additional players, rental items, and amount paid. The previous schedule remains in internal history and is not shown as the customer's active reservation schedule.

Submission, cancellation, and completion do not send customer emails.

---

# 19. Walk-In Reservations

Walk-in customers are supported.

Authorized Staff can manually create a reservation for customers who arrive directly at the facility.

Walk-in reservations must use the same availability system as online reservations.

Example:

```text
+ Add Walk-In

Customer Name
Email Address
Contact Number
Court
Date
Time Slot(s)
Additional Players
Rental Equipment
Payment Information
```

Once the walk-in reservation is saved, the selected court/time slots immediately become unavailable online.

The walk-in is created as **Verified** and its full calculated amount is recorded as paid. Staff chooses either **Cash** or a specific active e-wallet/bank method already configured for public checkout. Cash may omit the transaction reference number and receipt image; both are required for non-cash payments. The selected method is linked to the payment for method-specific reporting. When reservation emails are enabled, the customer receives the verification email immediately after the walk-in is created.

The system should distinguish reservation sources such as:

```text
ONLINE
WALK-IN
```

Online and walk-in reservations must share the same court availability source.

---

# 20. Court Availability Management

Management must support both complete date closures and specific court/time blocking.

## Close Entire Date

Authorized users can close an entire date.

Example:

```text
August 20
CLOSED

Reason:
Private Facility Use
```

No normal reservations can be created for that date.

---

## Block Specific Court / Time Slot

Authorized users can block only selected slots.

Example:

```text
August 22
Court 3
2:00 PM – 4:00 PM

BLOCKED

Reason:
Maintenance
```

Blocking a specific court/time should not affect other available courts or time slots.

---

# 21. Events Page

**Path:** `/events`

The Events Page displays announcements and event-related information published by Dinks on Us.

Events follow a blog or announcement-style structure.

Events are informational only.

Creating an event does **not automatically block reservation dates or courts**.

If an event requires court closure, Staff or Manager must separately use availability management to close the required dates or slots.

---

# 22. FAQ Page

**Path:** `/faq`

The FAQ Page contains frequently asked questions and answers for players and the community.

---

# 23. Management System

The Management System is the authenticated administrative area of Dinks on Us.

It is used by:

* Manager
* Staff

---

# 24. Roles

## Manager

The Manager has access to all management modules.

The Manager can:

* Access all modules
* Manage reservations
* Manage business configuration
* Manage website content
* Manage payment methods
* Manage court availability
* Create roles
* Configure module access
* Create Staff accounts
* Assign roles
* View reports and analytics
* Manage account settings
* Handle reservation cancellation

---

## Staff

Staff access is controlled through assigned roles.

Staff members do not receive permissions individually.

Instead:

```text
Staff Account
      │
      ▼
Assigned Role
      │
      ▼
Accessible Modules
```

Each Staff account is assigned **one role**.

---

# 25. Role Management

The Manager creates roles before creating or assigning Staff accounts.

Example:

```text
Role: Front Desk

Dashboard       ✓
Reservation     ✓
History         ✓
Management      ✗
Reports         ✗
```

Another example:

```text
Role: Supervisor

Dashboard       ✓
Reservation     ✓
History         ✓
Management      ✓
Reports         ✓
```

The system uses **module-level access control**.

Fine-grained permissions such as separate `View`, `Edit`, `Verify`, or `Delete` permissions are not part of the current scope.

---

# 26. Management Modules

## 26.1 Dashboard

The Dashboard provides a business and operational overview.

It may display:

* Important KPIs
* Verified reservations
* Upcoming reservations
* Current reservation activity
* Available slots
* Reserved slots
* Weekly court availability
* Date-based reservation browsing

Authorized users should be able to browse different dates and inspect court availability within a week.

Possible slot states include:

```text
Available
Pending
Verified
Blocked
Ongoing
```

---

# 27. Reservation Module

The Reservation module contains reservations that still require operational attention.

This includes:

* Pending
* Verified
* Upcoming
* Ongoing

The module allows authorized users to:

* Review reservation details
* Inspect uploaded receipts
* Inspect payment reference numbers
* Verify payment
* Reject reservation submissions
* Manage ongoing reservations
* Perform allowed rescheduling
* Perform extensions
* Mark reservations as completed
* Mark reservations as no-show

Cancellation is currently assumed to be Manager-only.

---

# 28. Reservation Extension

Only Staff or the Manager can extend an ongoing reservation.

Players cannot extend reservations directly through the public website.

Before an extension is added:

* The requested next slot must be available.
* The selected court must still be available for that slot.

Example:

```text
Current Reservation

Court 1
3:00 PM – 4:00 PM

Next Slot
4:00 PM – 5:00 PM
AVAILABLE

Staff:
Extend +1 Hour
```

Once confirmed:

* The new slot becomes unavailable.
* The reservation total is updated.
* The additional court charge is included in final billing.

---

# 29. Add-Ons and Final Reservation Amount

A verified reservation may incur additional charges during actual play.

Possible examples include:

* Additional players
* Court extensions
* Other business add-ons

The original submitted amount is therefore not always the final amount.

Before completing a reservation, Staff should be able to review the final charge.

Example:

```text
Reservation RF-012

Original Court Fee
₱1,000

Additional Player
₱100

1-Hour Extension
₱600

------------------
Final Amount
₱1,700
```

Once the reservation is finalized as **Completed**, the final amount becomes the primary value used for business revenue reporting.

---

# 30. History Module

The History module contains finalized reservation records.

Current finalized statuses include:

* Completed
* Cancelled
* Rejected
* No-show

Operational reservations such as Pending, Verified, Upcoming, and Ongoing remain in the Reservation module.

History records are considered finalized operational records.

They should not normally be reopened or casually modified.

---

# 31. Management Module

The Management module groups dynamic business configuration and public website information into the following workspaces:

```text
Management
│
├── Courts & Pricing
├── Availability & Closures
├── Payment Methods
├── Team & Access
├── Reservation Policies
├── Events
├── Gallery
├── FAQs
└── Storage & Data Retention
```

---

# 32. Courts & Pricing

The Manager can create sequentially numbered courts and maintain one shared configuration for operating hours, weekday/weekend rates, players included per court, and the additional-player price. Adding a court first reactivates the lowest-numbered inactive court, preserving its identity and history; a new sequential number is created only when no inactive court remains. This workspace also manages rentable equipment, its reservation-wide unit price, and total quantity.

Rates remain configurable rather than hard-coded. Pending reservations do not hold equipment; available quantity is reduced only by overlapping verified reservations. An inactive court or rental item must not be offered to players.

---

# 33. Team & Access

The Manager can create and edit reusable roles, configure their module access, and create Staff accounts. Each Staff account is assigned exactly one role; Staff permissions are inherited from that role. Accounts may be disabled when access is no longer required.

---

# 34. Availability & Closures

Management can select a court and close either an entire business date or only the affected time slots. The system must show and resolve active-reservation conflicts before saving so an existing reservation is never silently invalidated. Optional reasons may be recorded for administrative reference.

---

# 35. Events

Management can create, edit, publish, archive, or remove public events. Each event includes a header, image, description, and date. Events are displayed on the public Events page and do not automatically block court availability.

---

# 36. FAQs

Management can create a question-and-answer card, edit or delete it, and drag cards to control their public display order. Active cards are displayed on the public FAQ page in that order.

---

# 37. Gallery

Authorized management users can create and manage gallery tabs, then add, order, or remove public images within each tab.

---

# 38. Payment Methods

Management can add and edit supported e-wallet payment methods, including the wallet name, account number, and QR image. Only active methods are available for player payment selection.

---

## 38.1 Storage & Data Retention

Authorized personnel can manually reduce private storage usage by selecting an
inclusive reservation booking-date range, previewing eligible finalized payment
proofs, and explicitly confirming deletion. The operation removes only payment
proof image files and their active file references. Reservations, payments,
amounts, payment references, statuses, customers, histories, and reporting data
remain unchanged.

Only `COMPLETED`, `CANCELLED`, `REJECTED`, and `NO_SHOW` reservations are
eligible. Preview totals include only proof images that still physically exist;
already-deleted proofs do not appear. The module includes initial, add-on, and
settlement proofs, records one summarized activity entry for each cleanup that
successfully deletes at least one image, and does not expose private paths or
customer/payment details in its activity list. Cleanup is never automatic and
does not use a scheduler, cron task, queue worker, or storage lifecycle timer.

New uploads continue to accept JPG, JPEG, PNG, and WebP. The backend normalizes
new proof uploads to a readable private WebP file; customers are not required to
convert images themselves, and existing proofs are not converted automatically.

---

# 39. Reservation Policies

Management maintains four fixed public policy sections: **Court Rules & Policy**, **Reservation Rules & Policy**, **Reschedule Policy**, and **Cancellation Policy**. Each section contains ordered sub-headers and individually editable rules. Users can add, edit, delete, and drag sub-headers or rules to control public display order.

---

# 40. Reports and Analytics

The Reports and Analytics module converts operational system data into useful business information.

The primary revenue source for analytics should be:

**Completed Reservations → Final Amount**

Verified reservation amounts should not automatically be treated as final revenue because the reservation may later contain:

* Additional players
* Extensions
* Additional charges
* Other adjustments

Possible reports and KPIs may eventually include:

* Completed reservations
* Total revenue
* Revenue by date
* Revenue by week
* Revenue by month
* Court utilization
* Most reserved courts
* Most popular reservation times
* Day vs night usage
* Weekday vs weekend usage
* No-show records
* Cancellation records
* Reservation trends
* Walk-in vs online reservations

Exact reporting requirements can be refined later.

---

# 41. Profile and Appearance

The Profile screen allows the Manager to manage personal account information and credentials. The account menu provides an in-place Light Mode or Dark Mode action; it changes the interface immediately and does not open a separate page.

---

# 42. Logout

The Logout function securely terminates the authenticated Staff or Manager session.

---

# 43. High-Level Online Reservation Flow

```text
Player
  │
  ▼
Public Website
  │
  ▼
Reserve Page
  │
  ▼
Select One or More Available Slots
  │
  ├── Different Courts Allowed
  ├── Different Times Allowed
  └── Non-Consecutive Times Allowed
  │
  ▼
Enter Customer Information
  │
  ▼
Choose Payment Method
  │
  ▼
View E-Wallet QR Code
  │
  ▼
Pay Externally
  │
  ▼
Upload Receipt
  │
  ▼
Enter Payment Reference Number
  │
  ▼
Submit Reservation
  │
  ├── Selected Slots Immediately Become Unavailable
  │
  ▼
PENDING
  │
  ├───────────────┐
  ▼               ▼
VERIFIED        REJECTED
  │               │
  │               └── Slots Released
  │
  ▼
Upcoming Reservation
  │
  ▼
Ongoing
  │
  ├── Add-On
  ├── Extension
  ├── Reschedule
  │
  ▼
Final Outcome
  │
  ├── COMPLETED
  ├── CANCELLED
  └── NO-SHOW
  │
  ▼
History
```

---

# 44. Walk-In Flow

```text
Walk-In Customer
      │
      ▼
Staff Opens Reservation Module
      │
      ▼
Create Walk-In Reservation
      │
      ▼
Select Available Court / Time Slot(s)
      │
      ▼
Record Customer / Payment Information
      │
      ▼
Save Reservation
      │
      ▼
Selected Slots Become Unavailable Online
      │
      ▼
Ongoing Reservation
      │
      ▼
Finalization
      │
      ▼
Completed / Cancelled / No-show
      │
      ▼
History
```

---

# 45. Core Availability Rule

The system must maintain **one shared source of truth for court availability**.

Availability must consider:

* Pending online reservations
* Verified reservations
* Walk-in reservations
* Ongoing reservations
* Closed dates
* Blocked courts
* Blocked time slots
* Extensions

A court/time slot is only publicly selectable when no active record is currently occupying or blocking that slot.

---

# 46. Website Customization Scope

The Management system is intended to manage business content and configuration.

Current expected editable information includes:

* About Us
* Courts & Pricing, including court player limits, operating hours, and rental equipment
* Availability & Closures
* Team & Access, including roles
* Events
* FAQ cards
* Gallery tabs and images
* Payment Methods e-wallet details and QR Code Images
* Reservation, Reschedule, and Cancel policy bullets
* Operating Information
* Contact Information
* Social Links

The current scope does **not require a full visual page builder or CMS** for modifying:

* Website layout
* Component placement
* Typography
* Color palette
* Page architecture

unless explicitly added to the project requirements later.

---

# 47. Pending Client Confirmation

The following business policies are not yet finalized and should be confirmed during a future client meeting.

## Cancellation Policy

Confirm:

* How customers request cancellation
* Cancellation deadline
* Refund eligibility
* Refund amount
* Cancellation fees
* Whether selected Staff roles may eventually cancel reservations

Current temporary assumption:

* Customer requests cancellation through Facebook / Messenger
* Manager performs the cancellation in the management system

---

## Rescheduling Policy

Confirm:

* Who can request rescheduling
* How close to the reservation schedule it can be requested
* Whether there is a rescheduling limit
* Any applicable fees

---

## No-Show / Late Arrival Policy

Confirm:

* Grace period for late arrivals
* When Staff may officially mark a reservation as no-show

---

## Add-Ons

Confirm:

* Supported add-ons
* Additional-player pricing
* Other charges available during play

---

## Operating Hours and Rate Boundaries

Confirm:

* Exact opening and closing hours
* Exact Day Rate time range
* Exact Night Rate time range
* Weekend rates if different
* Special-day pricing if applicable

Current temporary values:

```text
Day Rate: ₱500/hour
Night Rate: ₱600/hour
```

---

## Payment Methods

Confirm the exact supported:

* E-wallet providers
* Account information
* QR codes

---

## Required Customer Information

Current expected information:

* Full Name
* Email Address
* Contact Number
* Selected Court/Slots
* Payment Method
* Payment Reference Number
* Payment Receipt

Confirm whether additional information is required.

---

## Walk-In Payment Information

Staff selects one payment mode:

* Cash
* A specific active e-wallet or bank method configured for public checkout

Cash may omit the transaction reference number and receipt. Both are required for a configured non-cash method. The reservation is stored as Verified with the calculated amount recorded as paid, and the payment is linked to its configured method for reporting.

---

# 48. System Structure Summary

```text
DINKS ON US
│
├── PUBLIC WEBSITE
│   │
│   ├── Home
│   │   ├── Header
│   │   ├── Hero
│   │   ├── Court Etiquette
│   │   ├── How to Reserve
│   │   ├── About Us
│   │   ├── Gallery
│   │   ├── Location
│   │   ├── Footer
│   │   └── Floating Messenger Button
│   │
│   ├── Reserve
│   ├── Events
│   └── FAQ
│
└── MANAGEMENT SYSTEM
    │
    ├── Manager
    │   └── All Modules
    │
    ├── Staff
    │   └── One Assigned Role
    │
    └── Modules
        │
        ├── Dashboard
        ├── Reservation
        ├── History
        ├── Management
        │   ├── Courts & Pricing
        │   ├── Availability & Closures
        │   ├── Payment Methods
        │   ├── Team & Access
        │   ├── Reservation Policies
        │   ├── Events
        │   ├── Gallery
        │   ├── FAQs
        │   └── Storage & Data Retention
        │
        ├── Reports & Analytics
        └── Logout
```

---

# 49. Current Scope Principle

The Dinks on Us system has two major sides.

## Public Side

Focused on allowing players and the community to:

* View business information
* Check real-time court availability
* Select one or more court/time slots
* Make online reservations without an account
* Pay through configured e-wallet QR codes
* Upload payment proof
* Receive reservation updates through email
* View events
* View court rules
* View the gallery
* View location information
* Access FAQ
* Contact the business through Facebook / Messenger

## Management Side

Focused on allowing authorized Staff and Managers to:

* Verify reservation payments
* Manage active reservations
* Handle walk-ins
* Manage court availability
* Extend ongoing reservations
* Manage add-ons and final charges
* Reschedule reservations
* Record no-shows
* Handle cancellations
* Maintain immutable operational history
* Manage business content
* Manage pricing
* Manage payment methods
* Manually clean up finalized payment-proof images without deleting business records
* Manage Staff roles and accounts
* Review reports and analytics

---

# 50. Document Purpose

This document represents the **current agreed and clarified system overview and business behavior** of the Dinks on Us website.

It should serve as a primary reference for:

* Requirement planning
* Database design
* API design
* Frontend architecture
* Authorization rules
* Business-rule implementation
* AI-assisted development
* Future project documentation

Rules listed under **Pending Client Confirmation** should not be treated as finalized business policies until confirmed by the client.

Future architectural or implementation decisions should preserve the business behavior defined in this document unless the project requirements are explicitly updated.

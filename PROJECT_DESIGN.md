# Dinks on Us — Project Design

## 1. Purpose and scope

This document records the implemented visual direction for **Dinks on Us**, a
pickleball court-reservation and operations platform in Bulacan, Philippines.
It extends the reusable rules in `DESIGN_SYSTEM.md`; it does not replace the
application architecture, component library, accessibility requirements, or
light/dark theme support.

The design should feel energetic, welcoming, and organised: rooted in the
provided Dinks on Us logo's deep teal atmosphere, while remaining easy to use
for first-time players reserving a court and staff handling time-sensitive
reservations.

## 2. Brand character

### Design principles

1. **Court-first clarity.** Availability, court names, times, prices, and
   reservation status must be instantly scannable.
2. **Warm confidence.** Teal and navy establish trust; warm, off-white
   surfaces make a sports reservation flow approachable.
3. **Energy with restraint.** Deep burgundy is a deliberate action accent, not a
   dominant interface colour.
4. **Practical under pressure.** Staff views prioritise hierarchy, status,
   filtering, and readable data over decorative treatment.
5. **Inclusive by default.** Colour never carries state alone. Pair it with
   clear labels, icons where helpful, and a shape, border, or text treatment.

### Logo use

`frontend/public/images/dinks-brand.png` is the approved brand mark for public,
authentication, and staff interfaces, as well as browser, installed-app, and
notification icons. Display the transparent artwork in page headers and
authentication without an added image background or padding. Generate
platform-required icon sizes from this source; installed-app icons use Warm
Sand behind the mark, while the browser-tab favicon stays transparent. Do not
stretch, crop, recolour, or place the mark over busy imagery.

Subtle court arcs, circles, or motion lines may be used as large background
details in branded hero and authentication surfaces. They must remain
decorative (`aria-hidden`) and use low contrast (roughly 3–6% opacity) so the
logo and content remain dominant.

## 3. Colour system

### Approved source palette

| Name | Hex | Primary role |
| --- | --- | --- |
| Primary Navy | `#1F4E79` | Brand foundation, high-emphasis headings, dark surfaces |
| Deep Teal | `#1E6F78` | Main brand and primary interactive colour |
| Fresh Sky | `#4DA8DA` | Focus indication, data visualisation, supporting highlight |
| Energy Burgundy | `#B53A6D` | High-energy calls to action and attention states |
| Soft Mint | `#BEE3DB` | Subtle selected, success, and informational surfaces |
| Warm Sand | `#F7F3E9` | Main light canvas and warm secondary surfaces |
| Soft White | `#FFFDFC` | Cards, forms, dialogs, and raised content |
| Primary Text | `#213547` | Main text on light surfaces |
| Muted Text | `#6B7A86` | Supporting text and quiet metadata |

### Semantic token mapping

Use semantic Tailwind/shadcn tokens in components. Do not use palette hex
values directly in view JSX except in a documented decorative treatment.

| Token | Light theme | Dark theme | Use |
| --- | --- | --- | --- |
| `background` | Warm Sand | deep teal | Page canvas |
| `foreground` | Primary Text | Soft White | Default text |
| `card`, `popover` | Soft White | elevated navy-teal | Raised surfaces |
| `primary` | Deep Teal | Soft Mint | Primary actions and links |
| `primary-foreground` | Soft White | deep teal | Text/icon on primary |
| `brand-surface` | deep teal | deep teal | Full-width brand sections and footer |
| `secondary` | Soft White | soft teal surface | Low-emphasis actions and selected support |
| `accent` | Soft White | soft teal surface | Hover and active context |
| `muted` | Soft White | soft teal surface | Secondary surface |
| `muted-foreground` | Muted Text | cool light-gray teal | Secondary text |
| `border`, `input` | restrained blue-gray tint | translucent cool white | Dividers and fields |
| `ring` | Deep Teal | Soft Mint | Keyboard focus |
| `sidebar` | deep teal | deep teal | Staff shell |
| `sidebar-primary` | Soft Mint | Soft Mint | Active staff navigation |

`Energy Burgundy` uses Soft White for its label, and is reserved for a clearly
important action (for example, “Reserve a Court”) or an attention state.
Semantic destructive colours may use a deeper accessible red derived outside
the brand palette; burgundy is not a substitute for an error message.

For public pages, do not use Fresh Sky or other ocean-blue tones as card or
section backgrounds. The public surface system is limited to Warm Sand and Soft
White in light mode, and deep teal with soft teal in dark mode.

All final token values must meet WCAG AA contrast requirements in their actual
pairings, including hover, focus, disabled, light, and dark states.

### Reservation and operational states

Status must always include a written label; these colours are supporting cues.

| State | Treatment |
| --- | --- |
| Available | Soft Mint surface, Deep Teal outline/icon, “Available” label |
| Selected | Deep Teal fill with Soft White text and visible selection marker |
| Pending | Warm Sand surface with Navy text and a “Pending” label |
| Verified / completed | Soft Mint surface with Deep Teal text and a check indicator |
| Ongoing | Energy Burgundy accent with an explicit “Ongoing” label |
| Rescheduled | Fresh Sky supporting treatment with an explicit “Rescheduled” label |
| Unavailable / blocked | Muted surface with muted text and an unavailable icon/pattern |
| Cancelled / rejected / no-show | Accessible destructive treatment with explicit status label |

## 4. Typography

Use the supplied type pairing through `next/font`.

| Role | Family | Weight guidance |
| --- | --- | --- |
| Display and page headings | Manrope | 600, 700, 800 |
| Navigation, body, forms, tables, and metadata | Inter | 400, 500, 600 |

Headings use Manrope with a compact but not cramped line-height and slightly
tighter tracking at display sizes. Inter remains the default UI font to keep
prices, time slots, forms, and management data exceptionally readable.

Avoid excessive all-caps. It is appropriate only for small overlines or compact
status labels where legibility remains intact. Body text should generally be at
least 16px; supporting metadata should remain readable and never be the sole
carrier of important information.

## 5. Layout, shape, and motion

- Keep the existing base radius (`0.625rem`) and use the existing shadcn
  button/card/input/dialog primitives.
- Use Soft White cards against the Warm Sand canvas with a subtle border;
  avoid heavy shadows. Elevation should be calm and functional.
- Public pages may use generous vertical whitespace and full-bleed brand
  sections. Keep prose and reservation content within comfortable readable widths.
- Reservation choices should use large, clearly bounded, touch-friendly controls
  rather than dense text links. Preserve a minimum 44px practical touch target
  for primary mobile interactions.
- Motion should be brief and purposeful: 150–200ms for control feedback and
  panel transitions. Respect `prefers-reduced-motion`.

## 6. Public experience direction

### Navigation and landing page

Use a transparent header over the dark hero, transitioning to a calm semantic
page surface after the hero, with the Dinks on Us logo, Home, Reserve, Events,
FAQ, and a low-emphasis Staff Login action. The hero should pair a concise,
reservation-led message with a facility image when available. Reserve deep burgundy
for the primary “Reserve a Court” hero action; the secondary location action is
outlined. Events remain available from the global navigation and their dedicated
page, but are not duplicated as a landing-page section or hero action.

Build landing sections in this order of user need: value/location and primary
reservation action, etiquette, how reservations work, about, gallery, location, and
footer. Use only two surface colours per theme: Warm Sand and Soft White in
light mode; deep teal and soft teal in dark mode. The image-backed hero and
footer may retain the brand-surface treatment. Supporting palette colours must
not appear as page or card backgrounds. Alternate the two approved surfaces
between adjacent landing sections so that the page remains easy to scan. Reuse
the hero's burgundy vertical separator, pill button shape, and circular icon endcap
for public-page actions; burgundy remains an action and emphasis colour, not a
surface. Reservation steps use separate responsive cards, with a numbered
pickleball marker at the left of each card. The footer must remain visibly
separated from the final public section in both themes. The floating Messenger action must be clearly labelled for
assistive technology and stay clear of mobile browser controls.

### Reservation flow

Treat availability as the centrepiece. The user should be able to understand,
at a glance: selected date, court, time-slot state, each slot’s price, current
selection count, and running total.

Use a persistent but unobtrusive reservation summary on desktop and a clear sticky
summary/action on mobile. Since a reservation can contain non-consecutive slots
across courts, selection chips or a concise list must make every choice easy to
review and remove. Never imply that a slot is guaranteed until submission
succeeds.

Email inbox verification lives inside Your information with Send code, a labeled
6-digit code input, Verify email, and a resend countdown. Keep payment-card
headings visible while locked; hide QR/transfer details and disable method,
reference, receipt, and submission controls until verification and an availability
refresh succeed. Changing email relocks payment while preserving entered evidence.
Keep the existing brand tokens and controls. Final submission does not display a
second email-correctness confirmation dialog.

Payment instructions, QR code, receipt upload, reference number, and the
pending-verification outcome should be presented as a calm, numbered flow.
The confirmation state must state that selected slots are held while payment is
being reviewed, without overpromising verification timing. On mobile, keep the
confirmation card centered, remind customers to check their spam folder, and
show the shared floating Messenger action without covering the card controls.

Time selection supports multiple available hours in one interaction. In staff
schedule forms, the picker remains open after each choice and keeps unavailable
option text focused on the time range without appending `Closed` or `Reserved`.
Unavailable choices remain disabled and accessible. The public availability grid
may keep explicit written states. The reservation summary and total update from
the latest server-provided prices.

Reschedule and add-on panels disclose optional court-time add-ons behind a
compact question row. Expanding it reveals the full court, slot, player,
equipment, credit, and payment flow. The primary action remains disabled until
the required replacement schedule and any required settlement fields are
complete.

Public booking policy dialogs keep Reservation, Court rules, Reschedule, and
Cancellation in one four-column tab row at mobile widths. Compact type and
spacing may be used so labels fit without wrapping.

## 7. Staff experience direction

The staff portal is an operational workspace, distinct from the public
marketing experience but visually connected through the same tokens and fonts.

### Minimal admin portal density

The admin portal uses a compact, information-first interface. Every element
must earn its space. Minimal means visually calm and easy to scan, not sparse,
oversized, or stripped of necessary context.

- Use compact page padding and a consistent `12–24px` spacing rhythm. Prefer
  smaller gaps inside operational panels than on public marketing pages.
- Keep page titles and descriptions concise. Do not use display-sized headings
  in routine management screens.
- Cards follow their own content height by default. Do not stretch neighboring
  cards to equal heights unless their content is directly comparable and the
  alignment materially improves comprehension.
- Use compact card padding, generally `16–20px` on desktop and `16px` on mobile.
  Avoid large blank regions added only to make a panel appear substantial.
- Place an action that belongs to one panel in that panel's header, aligned to
  the top right. Reserve the page header for actions affecting the entire page.
- Desktop buttons and form controls should normally be `36–40px` high. Preserve
  a practical `44px` touch target where needed on mobile; visual treatments may
  remain compact inside that target.
- Application icons should normally be `16–20px`. Supporting icon containers
  should normally be `28–32px`; do not use large decorative icon tiles in
  operational cards.
- Prefer concise rows, tables, or small status cards for repeated data. Show a
  useful first page and paginate longer collections rather than increasing a
  card's fixed height or introducing an internal scroll area without need.
- Empty states should be short and content-sized: one clear title, one helpful
  sentence, and at most one relevant action. Do not vertically center them in
  oversized panels.
- Dialogs should fit their required fields without excessive padding. For
  mutually exclusive modes, prefer clear clickable text labels or compact
  controls over large selection cards unless a visual comparison is necessary.
- Toasts are compact, content-sized cards with a small status indicator,
  restrained padding, bottom-right desktop placement, and inset mobile
  placement. They must never resemble full-width banners on desktop.
- Use hierarchy through font weight, muted supporting text, borders, and small
  status treatments before adding more containers, shadows, or colour blocks.
- Avoid nesting cards inside cards when spacing, a divider, or a simple row can
  express the same relationship.
- Review every desktop management screen for avoidable vertical space. A normal
  viewport should expose the primary controls and a meaningful amount of data
  without feeling crowded.

Compact density never overrides accessibility: labels, errors, focus rings,
keyboard operation, readable type, sufficient contrast, and mobile touch areas
remain mandatory.

Rescheduling starts from a freshly loaded current booking, with all current court
times preselected, including previous add-ons. Show the total already paid and
current total before editing. Existing players and equipment are carried forward;
the add-on controls explicitly add new quantities. Details show the whole current
reservation together, with historical add-on charges and payment records below.

- Use a Primary Navy desktop sidebar with a clear active state. Maintain the
  existing collapsible desktop rail and mobile sheet pattern.
- Use Warm Sand as the workspace background and Soft White for content panels.
- Make page headers action-oriented: title, short context, filters, and one
  primary action where relevant.
- Reservation lists should make status, court/time, customer, total, and
  urgency scannable without relying on colour alone.
- Payment verification and schedule changes require clear summaries before
  confirmation. Destructive or irreversible actions retain confirmation dialogs.
- Charts use navy, teal, sky, burgundy, and mint in a consistent series order,
  with labels and accessible alternatives rather than colour-only legends.

Pending reservations opened from Reservations or the Dashboard expose Verify,
Reject, and Close in that order. Dashboard actions require Reservation module
access (or a full-access Manager); Dashboard-only staff keep a read-only view.
Reuse the existing verification confirmation and rejection concern/reason form.
Other statuses and History show Close only. Successful actions refresh Dashboard
and Reservation queries through the shared mutation hooks.

### Established portal component references

Project-specific screens must adapt to the current portal language before
introducing new visual treatments. Reuse `PortalMetricCard` for KPI summaries,
follow the Team & Access table shell for repeated management data, and use
`CalendarDatePicker` for date selection. These implementations are the
reference for spacing, typography, borders, states, and responsive behavior;
new modules should vary their content and actions, not recreate those patterns.

### Storage & Data Retention screen

Treat payment-proof cleanup as a compact, deliberate management task rather than
a reservation browser. The primary panel contains two labeled
`CalendarDatePicker` controls, one **Preview cleanup** action, and an aggregate
result showing only the selected booking-date range, eligible reservation count,
proof-image count, and estimated reclaimable storage. Count only proof images
that still physically exist; already-deleted proofs must not appear. Do not add a customer,
reservation, payment, or file-path table to this screen.

Changing a date clears the prior preview. The destructive **Delete payment proof
images** action appears only for a non-empty preview and opens a confirmation
dialog that repeats the exact range, image count, and estimated size. Copy must
state that only proof images are removed and that reservation and payment records
remain. Use the destructive semantic variant and preserve a clear cancel action.

Below the cleanup panel, reuse the Availability & Closures activity-log density:
five compact newest-first cards per page with shared pagination. A card shows the
images deleted, booking-date range, reservations affected, reclaimed storage,
actor, time, and a clear successful/partial result. Successful deletions must
appear after the mutation refreshes activity. Show missing/failed counts only
when non-zero. Never display
customer details, payment references, private paths, database IDs, IP addresses,
user agents, or raw audit data.

### Compact reservation summaries

Priced court rows in reservation details, walk-ins, add-ons, reschedule previews,
and their confirmations use the shared reservation summary line. Use short dates
such as `Oct 11` and whole-hour ranges such as `11 PM–12 AM`. Show the full date
or year once in the summary heading/context instead of repeating the year in each
row. Keep court names, dates, and complete time ranges together; allow wrapping
between those parts on narrow screens. Keep amounts in a separate right-aligned,
non-wrapping column, using the existing text size. Public checkout and the current
selection summary use compact time ranges while retaining their date context.

## 8. Accessibility and responsive rules

Preserve every accessibility rule in `DESIGN_SYSTEM.md`, especially semantic
HTML, visible focus, keyboard operation, labels, error associations, meaningful
alternative text, and colour-independent states.

The public reservation flow is mobile-first. On small screens, stack controls,
retain the reservation summary and total in view, avoid horizontal slot tables, and
use the established off-canvas navigation. Desktop staff navigation may collapse
to an icon rail with tooltips; it must never become a permanent mobile rail.
On the Availability & Closures screen, place Schedule Overview before the active
closures card on mobile while retaining the two-column desktop order.

## 9. Implementation guardrails

1. Add Manrope and Inter at the root layout through `next/font`; expose them as
   the existing `font-heading` and `font-sans` semantic font tokens.
2. Replace only the CSS semantic token values in `globals.css`; existing views
   should consume the resulting design without scattered hard-coded colours.
3. Keep shadcn primitives reusable and change their variants only where a
   system-wide semantic need exists.
4. Add approved logo assets to the frontend’s public assets before rendering
   them. Do not hot-link or depend on the desktop source image path.
5. Validate light and dark modes, contrast, keyboard focus, mobile layouts, and
   loading/error/empty states as each screen is implemented.

## 10. Current implementation state

The fonts, semantic palette, public shell, reservation experience, management
shell, responsive navigation, dialogs, tables, toasts, and module workspaces are
implemented. New interface work should extend these established patterns and
verify light mode, dark mode, keyboard operation, responsive layouts, and all
loading, empty, error, disabled, and success states.

### Reservation review freshness

Add-ons, completion, and cancellation use the same successful-detail-refresh gate
as rescheduling. Show shared loading/error states before exposing financial
controls; block stale-status actions. Refreshed booking data clears an outdated
confirmation. Add-ons also wait for pricing/availability and disable review while
those options are refreshing. A server review conflict refreshes booking/options
and asks staff to review again. Credits/refunds remain visible without add-ons;
use “Refund recorded” after cancellation and “Refund due” after completion.

Current financial confirmations carry the revision of the booking shown. A stale
revision refreshes the form even if the price stayed the same. Retried successful
actions explicitly say the request was already recorded. If payment/details
changed during an unconfirmed retry, close the old confirmation and refresh the
booking so staff review the recorded action before making another purchase;
walk-in entry returns to Reservations. Keep retry keys out of visible controls.

A successful reschedule, add-on, completion, or cancellation closes both its
confirmation and the editing dialog as
soon as the API confirms the save. The reservation/table refresh continues after
closing; it must not leave the editing form visible as though another submission
were needed. A booking becoming Completed or Cancelled after its own successful
action must not flash the changed-status warning. Failed saves keep the editing
form available for correction/review.

The reservation detail's Updated total card shows original charges, add-ons, and
other adjustments in separate full-width rows at every breakpoint, with each
label at the left and its amount at the right, above a single emphasized
“Total paid” footer. That footer uses
the cumulative amount paid, not the final charge. The current reservation summary
continues to show the final charge and any outstanding balance or credit.

The reschedule date defaults to today's date in Asia/Manila whenever the dialog
opens, even when the existing booking is in the past or future. Keep the existing
booking date visible in Current booking; its slots and amounts stay the comparison
baseline. Staff may choose another permitted date, with availability and pricing
checked for that replacement date.


### Immediate reschedule refunds

A cheaper reschedule shows “Refund to settle now” after including any new
purchases in the updated total. The existing confirmation dialog explains that
the Manager must return that exact amount before confirming, requires an
unchecked “I confirm the customer has received ₱…” checkbox, and uses “Confirm
refund and reschedule”. Back/review resets the acknowledgment; pending saves
disable it. Other reschedules keep the normal confirmation without a refund
checkbox. Place the refund acknowledgment card below the schedule and totals,
immediately after “Refund to settle now”, with spacing before the card. Success
closes both dialogs.

Show gross payments, completed refunds, and “Paid after refunds” separately when
there have been refunds. The Total paid footer continues to mean gross collected.
Refunded funds never appear as spendable credit on a later purchase. Legacy
unsettled credit remains visible until it is consumed or explicitly settled.
Cancellation's full/custom refund limits use the amount still held. Customer
emails show the current operation's refund separately from cumulative refunds.


### Mark ongoing on the booking date

Keep Mark ongoing visible but disabled when the verified reservation's current
booking date differs from today in Asia/Manila. Explain that it is available only
on the reservation date. The confirmation submission rechecks the date, and the
API remains authoritative. Apply the rule to both desktop and mobile menus and
to rescheduled bookings. Do not use booked start/end hours to enable the action.

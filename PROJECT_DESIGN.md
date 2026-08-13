# Dinks on Us — Project Design

## 1. Purpose and scope

This document establishes the Phase C visual direction for **Dinks on Us**, a
pickleball court-reservation and operations platform in Bulacan, Philippines.
It extends the reusable rules in `DESIGN_SYSTEM.md`; it does not replace the
application architecture, component library, accessibility requirements, or
light/dark theme support.

The design should feel energetic, welcoming, and organised: rooted in the
provided Dinks on Us logo's deep teal atmosphere, while remaining easy to use
for first-time players booking a court and staff handling time-sensitive
reservations.

## 2. Brand character

### Design principles

1. **Court-first clarity.** Availability, court names, times, prices, and
   booking status must be instantly scannable.
2. **Warm confidence.** Teal and navy establish trust; warm, off-white
   surfaces make a sports booking flow approachable.
3. **Energy with restraint.** Coral is a deliberate action accent, not a
   dominant interface colour.
4. **Practical under pressure.** Staff views prioritise hierarchy, status,
   filtering, and readable data over decorative treatment.
5. **Inclusive by default.** Colour never carries state alone. Pair it with
   clear labels, icons where helpful, and a shape, border, or text treatment.

### Logo use

The supplied Dinks on Us mark is the visual reference for the product. Place
the full mark on dark teal or navy brand surfaces whenever its light version is
used. On light surfaces, use a high-contrast one-colour navy/teal version once
an approved asset is available. Do not recreate, stretch, crop, recolour, or
place the mark over busy imagery.

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
| Energy Coral | `#FF7A59` | High-energy calls to action and attention states |
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

`Energy Coral` uses Primary Text
for its label, and is reserved for a clearly important action (for example,
“Reserve a Court”) or an attention state. Semantic destructive colours may use
a deeper accessible red derived outside the brand palette; coral is not a
substitute for an error message.

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
| Waiting for verification | Warm Sand surface with Navy text and a “Waiting for verification” label |
| Verified / completed | Soft Mint surface with Deep Teal text and a check indicator |
| Unavailable / blocked | Muted surface with muted text and an unavailable icon/pattern |
| Cancelled / rejected / no-show | Accessible destructive treatment with explicit status label |

## 4. Typography

Use the supplied type pairing through `next/font` when implementation begins.

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
  sections. Keep prose and booking content within comfortable readable widths.
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
booking-led message with a facility image when available. Reserve bright coral
for the primary “Reserve a Court” hero action; the secondary location action is
outlined. Events remain available from the global navigation and their dedicated
page, but are not duplicated as a landing-page section or hero action.

Build landing sections in this order of user need: value/location and primary
booking action, etiquette, how booking works, about, gallery, location, and
footer. Use only two surface colours per theme: Warm Sand and Soft White in
light mode; deep teal and soft teal in dark mode. The image-backed hero and
footer may retain the brand-surface treatment. Supporting palette colours must
not appear as page or card backgrounds. Alternate the two approved surfaces
between adjacent landing sections so that the page remains easy to scan. Reuse
the hero's orange overline rule, pill button shape, and circular icon endcap
for public-page actions; orange remains an action and emphasis colour, not a
surface. Booking steps use separate responsive cards, with a numbered
pickleball marker at the left of each card. The footer must remain visibly
separated from the final public section in both themes. The floating Messenger action must be clearly labelled for
assistive technology and stay clear of mobile browser controls.

### Reservation flow

Treat availability as the centrepiece. The user should be able to understand,
at a glance: selected date, court, time-slot state, each slot’s price, current
selection count, and running total.

Use a persistent but unobtrusive booking summary on desktop and a clear sticky
summary/action on mobile. Since a reservation can contain non-consecutive slots
across courts, selection chips or a concise list must make every choice easy to
review and remove. Never imply that a slot is guaranteed until submission
succeeds.

Payment instructions, QR code, receipt upload, reference number, and the
waiting-for-verification outcome should be presented as a calm, numbered flow.
The confirmation state must state that selected slots are held while payment is
being reviewed, without overpromising verification timing.

## 7. Staff experience direction

The staff portal is an operational workspace, distinct from the public
marketing experience but visually connected through the same tokens and fonts.

- Use a Primary Navy desktop sidebar with a clear active state. Maintain the
  existing collapsible desktop rail and mobile sheet pattern.
- Use Warm Sand as the workspace background and Soft White for content panels.
- Make page headers action-oriented: title, short context, filters, and one
  primary action where relevant.
- Reservation lists should make status, court/time, customer, total, and
  urgency scannable without relying on colour alone.
- Payment verification and schedule changes require clear summaries before
  confirmation. Destructive or irreversible actions retain confirmation dialogs.
- Charts use navy, teal, sky, coral, and mint in a consistent series order,
  with labels and accessible alternatives rather than colour-only legends.

## 8. Accessibility and responsive rules

Preserve every accessibility rule in `DESIGN_SYSTEM.md`, especially semantic
HTML, visible focus, keyboard operation, labels, error associations, meaningful
alternative text, and colour-independent states.

The public booking flow is mobile-first. On small screens, stack controls,
retain the booking summary and total in view, avoid horizontal slot tables, and
use the established off-canvas navigation. Desktop staff navigation may collapse
to an icon rail with tooltips; it must never become a permanent mobile rail.

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

## 10. Initial delivery sequence

1. Apply fonts and semantic colour tokens.
2. Add the approved logo asset and brand treatment to public/auth/staff shells.
3. Redesign the public landing page around court discovery and reservation.
4. Build the reservation experience using the business rules as its source of
   truth.
5. Evolve the staff portal screen by screen as its operational modules are
   implemented.

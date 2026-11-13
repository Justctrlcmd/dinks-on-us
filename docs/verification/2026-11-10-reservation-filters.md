# Reservation filters verification — 2026-11-10

Reservations has one **Reference ID / Date** selector to the left of Status,
defaulting to Date, without a visible Filter by label or a separate clear button.
Only the selected mode's input is shown: a reference search or a booking-date
calendar. The selection also sorts the full table before pagination. Date shows
the latest booking date first. Reference ID shows the highest number first. An
Ascending/Descending dropdown changes the direction for either field and
defaults to Descending. Switching modes clears the previous mode's value while
preserving Status. Staff can clear the date in the calendar,
erase the reference input, or select All statuses. Filter changes return to page
one, and clearing
or switching modes also cancels pending search input.

The API continues to support combined reference, date, and status filters before
pagination for compatibility; the simplified view selects one search mode at a time.

Reference-only search accepts full or partial reservation references and treats
SQL wildcard characters literally. It does not match customer or payment fields.
Dates match the current booking date, including after rescheduling. Past unresolved
bookings remain searchable. Overall KPI counts, History
separation, permissions, and reservation actions retain their existing behavior.
Legacy clients may omit both new query parameters. No schema or dependency
changes are required.

## Initial automated checks

- Backend: `php artisan test --compact` — 244 tests, 2,292 assertions passed.
- Frontend: `npm test` — 230 tests across 59 files passed.
- `npm run typecheck`, `npm run lint`, targeted PHP Pint, and `git diff --check`
  passed.
- `npm run build -- --webpack` — production compilation, TypeScript, and page
  generation passed. Default Turbopack builds hit an environment restriction
  while binding the compilation worker's local port, including an escalated retry.
  The default build command and bundler configuration were not changed.

New regression coverage checks combined filters and pagination/order, current
versus replaced booking dates, overall KPIs, final-status exclusion, partial
references, reference-only isolation, keyboard date selection, distinct query
cache entries, filter resets, and pending search cancellation.

## Local browser and security checks

Used an isolated temporary SQLite database and test-only accounts/reservations.
The application's development/production database and real customer records were
not modified.

- Browser login, session redirect, filtered results, no-match state, reset, and
  desktop/mobile layouts worked; both light and dark themes were inspected.
- At a 390px mobile viewport, document width equaled viewport width.
- Same-origin `/backend` HTTP checks returned 401 for a guest list, 204 for CSRF
  initialization, 419 for login without the token, 200 for valid login and combined
  filters, and 422 for an impossible date. Private list responses included no-store.
- Tests rejected unauthorized/inactive accounts, invalid modes/types, malformed
  dates, oversized search/page requests, and final statuses. Bound SQL-injection,
  HTML, wildcard, and query-delimiter payloads did not expand reference results.

These are scoped local application checks, not a production penetration test.
Production TLS/proxy behavior, MySQL execution, infrastructure, dependency audits,
and deployment remain outside this change's verification.

## Simplified interface follow-up

After replacing the separate search/date controls with one mode selector and an
X-only clear button, the 19 reservation-view/service tests, TypeScript check, lint,
and diff whitespace check passed. Tests cover status preservation, clearing
hidden values in both mode-switch directions, pagination reset, accessible icon
naming, date keyboard operation, and canceling a debounced search on clear/switch.
Browser checks confirmed reference search, date filtering, X reset, the two-option
selector beside Status on desktop, and compact controls at mobile width. No
backend behavior changed in this follow-up.

The final layout defaults the mode to Date, removes the X and visible Filter by
label, and places the mode selector immediately before Status. Clearing remains
available through the individual inputs. The updated 19 view/service tests,
TypeScript check, lint, and diff whitespace check passed for this adjustment.

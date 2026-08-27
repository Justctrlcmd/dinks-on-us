# Design system

The Phase A interface is deliberately neutral. A future Phase C may add `PROJECT_DESIGN.md` for brand and workflow-specific direction; it should extend rather than silently replace these reusable rules.

Use Tailwind CSS and shadcn/ui. Prefer semantic tokens such as `background`, `foreground`, `primary`, `muted`, `border`, and sidebar tokens. Both light and dark themes must remain usable. Typography uses the system sans-serif stack; default radius is 0.625rem. Use a restrained spacing rhythm and preserve comfortable content widths.

Reuse shadcn buttons, cards, dialogs, inputs, menus, sheets, and tooltips. Use React Icons `fi` for application semantics; primitive-internal icons may remain owned by shadcn. Decorative icons beside visible text use `aria-hidden`.

## Existing component references

An established component or pattern is the source of truth when the same UI
need appears in another module. Inspect and reuse the existing implementation
before creating a module-specific variant. Current portal references include:

- KPI/stat cards: `frontend/src/components/portal/portal-metric-card.tsx`, used by
  Team & Access and Reservations.
- Management tables: the table shell and row treatment in
  `frontend/src/views/portal/team-access-management-view.tsx` (bordered card,
  muted header, compact cells, hover rows, and bordered pagination).
- Date selection: `frontend/src/components/common/calendar-date-picker.tsx`,
  used by event and availability-closure forms and required for management date
  fields such as rescheduling and add-ons.
- Select controls: `frontend/src/components/common/forms/select-with-label.tsx`
  composes the primitive in `frontend/src/components/ui/select.tsx`; use the
  wrapper for filters and form choices instead of native-select markup. Visible
  labels are optional for compact filter rows, but unlabeled controls must keep
  an explicit accessible name through `ariaLabel`.

Shared text inputs, select triggers, and standard date-picker triggers use a
40px (`h-10`) field height across the application. Do not add page-specific
height overrides for these controls; reserve different heights for buttons,
textareas, and explicitly documented touch or display treatments.

When a new module needs a small variation, extend the referenced component with
focused props or a documented variant. Do not introduce a competing KPI, table,
select, or date-picker visual language without an explicit product decision.
Match the current spacing, typography, borders, states, and responsive behavior
first; module content and actions are what should vary.

Desktop portal navigation may collapse to an icon rail with tooltips. Mobile uses a header and off-canvas sheet, never a permanent rail. Keep account actions in the bottom user menu. Page routes stay thin and complete layouts live in views/components.

Management interfaces use compact operational density by default. Avoid oversized cards, controls, icons, headings, empty states, and decorative whitespace. Let panels follow their content height unless equal height communicates a useful comparison. Project-specific admin sizing and layout rules live in `PROJECT_DESIGN.md`.

Forms require visible labels, accessible descriptions and errors, predictable spacing, disabled/loading states, and reasonable touch targets. Compose focused controls rather than one universal component. Do not trim or alter passwords. Confirmation dialogs are for meaningful consequences such as delete, cancel, remove, or discarding important work—not harmless actions.

User-action results use the shared Sonner toast system: compact card, semantic status indicator, bottom-right placement on desktop, inset placement on mobile, and automatic dismissal. Success, error, warning, and informational API results must not be duplicated inside forms or dialogs. Keep only Zod validation errors inline beneath their fields in dialogs.

Loading messages should name the context. Empty states explain what will appear and may offer one useful action. Error states use safe explanations and a retry/navigation action when recovery is possible.

Accessibility is mandatory: semantic HTML, keyboard operation, visible focus, programmatic labels, `aria-invalid`/`aria-describedby` where useful, sufficient contrast, responsive touch targets, meaningful alternative text, hidden decorative icons, and no state conveyed by color alone. Avoid `dangerouslySetInnerHTML`; render plain content as React text unless an explicit sanitized rich-text feature is designed.

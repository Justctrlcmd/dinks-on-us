# Design system

The Phase A interface is deliberately neutral. A future Phase C may add `PROJECT_DESIGN.md` for brand and workflow-specific direction; it should extend rather than silently replace these reusable rules.

Use Tailwind CSS and shadcn/ui. Prefer semantic tokens such as `background`, `foreground`, `primary`, `muted`, `border`, and sidebar tokens. Both light and dark themes must remain usable. Typography uses the system sans-serif stack; default radius is 0.625rem. Use a restrained spacing rhythm and preserve comfortable content widths.

Reuse shadcn buttons, cards, dialogs, inputs, menus, sheets, and tooltips. Use React Icons `fi` for application semantics; primitive-internal icons may remain owned by shadcn. Decorative icons beside visible text use `aria-hidden`.

Desktop portal navigation may collapse to an icon rail with tooltips. Mobile uses a header and off-canvas sheet, never a permanent rail. Keep account actions in the bottom user menu. Page routes stay thin and complete layouts live in views/components.

Forms require visible labels, accessible descriptions and errors, predictable spacing, disabled/loading states, and reasonable touch targets. Compose focused controls rather than one universal component. Do not trim or alter passwords. Confirmation dialogs are for meaningful consequences such as delete, cancel, remove, or discarding important work—not harmless actions.

Loading messages should name the context. Empty states explain what will appear and may offer one useful action. Error states use safe explanations and a retry/navigation action when recovery is possible.

Accessibility is mandatory: semantic HTML, keyboard operation, visible focus, programmatic labels, `aria-invalid`/`aria-describedby` where useful, sufficient contrast, responsive touch targets, meaningful alternative text, hidden decorative icons, and no state conveyed by color alone. Avoid `dangerouslySetInnerHTML`; render plain content as React text unless an explicit sanitized rich-text feature is designed.

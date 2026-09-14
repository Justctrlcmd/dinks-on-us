# Add a navigation item

Add navigation only for an established user destination, not every endpoint or settings action. Update `config/navigation.ts` with a clear title, stable href, and centralized Feather icon. Confirm active matching, collapsed tooltip, keyboard focus, mobile drawer closure, and responsive label length.

Portal navigation is filtered by the authenticated account's module access.
Reuse the centralized module mapping and keep the matching backend route behind
the corresponding `module:*` middleware. Manager-only Profile visibility must
remain aligned with the `manage-own-profile` authorization gate. UI visibility
never replaces backend authorization.

# Agent guide

Before modifying this repository:

1. Read `ARCHITECTURE.md`.
2. Read `PROJECT_CONTEXT.md` and `BUSINESS_RULES.md` for domain work.
3. Read `PRODUCTION.md` whenever infrastructure, deployment, storage, email, background work, domains, or cookies are relevant.
4. Read `DESIGN_SYSTEM.md` and `PROJECT_DESIGN.md` for interface work.
5. Read the relevant guide under `docs/recipes/`.
6. Inspect working implementations before creating abstractions.
7. Reuse existing components, services, hooks, response helpers, and validation conventions first; an established component design is the reference for every later use.
8. Do not silently introduce a competing architecture or scattered raw `fetch` calls.
9. Add dependencies only when framework capabilities and existing packages are insufficient.
10. Update documentation when architecture, business behavior, or production assumptions change.
11. Preserve safe user messages; technical details belong in logs.

Lifecycle guidance:

- This repository is in active feature development (Phase D) with an implemented Dinks on Us domain.
- Normal feature requests should extend the current roles, permissions, reservation workflows, and navigation rather than rediscovering them.
- Upgrades, infrastructure migrations, and architectural refactors are Phase E and require compatibility analysis first.
- Historical boilerplate initialization phases no longer describe the repository's current state.

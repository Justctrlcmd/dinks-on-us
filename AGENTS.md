# Agent guide

Before modifying this repository:

1. Read `ARCHITECTURE.md`.
2. Read `PRODUCTION.md` whenever infrastructure, deployment, storage, email, background work, domains, or cookies are relevant.
3. Read `DESIGN_SYSTEM.md` for any interface work.
4. Read the relevant guide under `docs/recipes/`.
5. Inspect working implementations before creating abstractions.
6. Reuse existing components, services, hooks, response helpers, and validation conventions first; an established component design is the reference for every later use.
7. Do not silently introduce a competing architecture or scattered raw `fetch` calls.
8. Add dependencies only when framework capabilities and existing packages are insufficient.
9. Update documentation when architecture or production assumptions change.
10. Preserve safe user messages; technical details belong in logs.

Lifecycle triggers:

- “Initialize this boilerplate for my new project” starts Phase B: discover the real domain, actors, workflows, and constraints.
- “Let’s design the UI/UX for this project” starts Phase C and may add `PROJECT_DESIGN.md`.
- Normal feature requests are Phase D. Read the relevant recipe and create only necessary pieces.
- Upgrades, infrastructure migrations, and architectural refactors are Phase E. Repeat compatibility analysis first.

This repository is currently Phase A. Do not infer roles, permissions, business modules, or project navigation from its name.

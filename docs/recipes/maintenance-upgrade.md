# Maintenance and upgrades

Repeat the environment and compatibility audit before changing Laravel, PHP, Sanctum, Node, Next.js, React, TypeScript, Tailwind, shadcn, Zod, the schema generator, test tools, or hosting. Read official migration guides and inspect version-sensitive bootstrap, middleware, request, CSS, and lint syntax.

Upgrade in small locked stages. Record production impact, migration/rollback needs, deprecations, and documentation changes. Run backend formatting/tests, schema drift, frontend lint/typecheck/tests, and a production build. Do not hide failures with broad rule disables, unsafe `any`, or ignored tests.

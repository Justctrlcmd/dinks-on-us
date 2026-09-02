# Security policy

## Reporting a vulnerability

Report suspected vulnerabilities privately to the repository owner or the
designated project security contact. Do not open a public issue containing an
exploit, personal data, credentials, payment proofs, environment files, or
production details. Include the affected route or component, reproducible
steps, impact, and the least sensitive evidence needed to investigate.

Do not test against production accounts or data without written authorization.
Use local or explicitly approved test environments and stop if testing could
affect availability, other users, or stored data.

## Supported code

Security fixes are applied to the actively deployed branch. Dependencies are
checked in CI on pull requests, pushes to `main`, and weekly. A release is not
security-ready until the checks in `docs/security/SECURITY_BASELINE.md` pass.

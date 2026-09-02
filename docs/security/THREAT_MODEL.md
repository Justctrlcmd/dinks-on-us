# Threat model

## Protected assets

Management accounts and sessions, role assignments, customer contact data,
reservation/payment records, private payment proofs, push subscriptions,
application secrets, audit history, and service availability are sensitive.

## Trust boundaries

Traffic crosses the public browser/Next.js boundary, the Next.js/Laravel API
boundary, Laravel/MySQL and Laravel/storage boundaries, and any production
proxy/TLS boundary. Browser validation is usability only; Laravel must distrust
all request fields, headers, filenames, notification payloads, and identifiers.

## Primary threats and controls

| Threat | Principal controls |
| --- | --- |
| Credential guessing and enumeration | Generic login failure, per-account and per-IP limits, Argon2id, audit trail |
| Session theft or fixation | HTTPS, secure HttpOnly SameSite cookies, CSRF, session rotation and revocation |
| Broken access control / IDOR | Authentication, module middleware, status-scoped object checks, current-password confirmation |
| SQL injection and mass assignment | FormRequests, allowlists, Eloquent/bindings, `safe()`/`validated()` persistence |
| Stored/reflected XSS | React text rendering, no arbitrary HTML, nonce CSP, output/security headers |
| Malicious or oversized uploads | Content/extension/dimension validation, pixel cap, decode and WebP re-encode, generated paths |
| Private-file disclosure or traversal | Non-public disk, managed-path check, authorized controllers, no-store response |
| Abuse and denial of service | Layered rate limits, bounded arrays/pages/files, optimized images, infrastructure limits |
| Security misconfiguration | Production check command, trusted host/proxy settings, CI audits, release checklist |
| Repudiation of privileged changes | Safe audit events with actor, target, IP, user agent, and non-secret detail |

## Residual risks and deployment decisions

MFA is not enabled by project decision, so account compromise remains more
likely after password disclosure. Compensating controls are rate limiting,
Argon2id, current-password confirmation, session invalidation, and audit logs.
Reassess MFA if the system begins handling higher-value payments, more sensitive
personal data, remote administrators, or regulatory requirements.

Application rate limits do not replace CDN/WAF, load balancer, PHP/web-server
body limits, firewalling, database least privilege, encrypted backups, monitoring,
patch management, or incident response. Storage and backup retention may outlive
an in-app proof deletion and must be governed separately.

Review this model when adding a new actor, external integration, file type,
public write endpoint, payment workflow, deployment topology, or sensitive data.

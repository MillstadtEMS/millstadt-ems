# Financial Information Hub Threat Model

## Assets and boundaries

Sensitive assets are requester identity/contact data, signatures, signed agreements, supporting uploads, restricted documents, approval decisions, audit records, delivery configuration, administrator sessions, and generated viewer content. Trust boundaries are the public browser, same-origin API boundary, administrator authentication boundary, development in-memory store, future production database/object storage, email/SMS providers, and hosting/deployment control plane.

## Threats and treatment

| Threat | Current treatment | Residual requirement |
| --- | --- | --- |
| Automated abuse, brute force, credential stuffing, rate-limit bypass | Valid-only IP rate limits on request/report paths; admin route authentication; generic failures | Persistent multi-signal limits, login-specific controls, accessible challenge/WAF, alerting |
| Account takeover, disabled-account access, privilege escalation | Existing server-side admin and lounge-account checks; resource checks on every financial admin API | Named least-privilege approver role, MFA, disabled-user session invalidation, reauthentication |
| Broken access control, IDOR, record enumeration | Random identifiers, server-side request/user/document/version checks, no query-string identities, no-store | Authenticated requester ownership and production data-layer authorization tests |
| Signature theft/reuse | No prefill/reuse, explicit sign action, typed-name equality or PNG validation, version binding, private storage | Encrypted durable storage, retention/deletion policy, stronger blank-stroke heuristics if drawn signing remains |
| PDF tampering/template injection | Server-side deterministic generation, ASCII normalization, length limits, IDs/versions/hashes/page numbers, no remote resources | Immutable approved artifacts, durable hash/audit storage, approved correction workflow |
| Email interception/misdelivery/header injection | Server-only recipients, sanitized attachment names, privacy-safe subjects, test-sink gate, pre-launch delivery disabled | Verified sender, durable outbox, provider event handling, recipient matrix signoff, protected links |
| Upload attacks/path traversal/executable rendering | One upload, extension/MIME/magic/size checks, basename normalization, private memory storage, protected admin download | Approved malware scanner, quarantine/private object store, explicit download disposition, retention |
| Injection/XSS/SQL/header/filename/PDF injection | Allowlists/limits, contextual React rendering, parameterized repository SQL, sanitized PDF text and filenames, CSP | DAST and CSP report-only tuning on protected staging |
| CSRF/CORS/clickjacking/open redirect/host manipulation | CSRF cookie/header, same-origin/Fetch-Site checks, same-origin default CORS, frame denial/CSP, no financial redirects from user input | Production-origin allowlist verification and host/proxy configuration evidence |
| SSRF/path traversal | Financial PDF templates do not fetch remote resources; source URLs are constrained; filenames normalized | Reverify future storage/provider integrations |
| Session fixation/replay/duplicate/races/stale approval | Crypto IDs, CSRF state, idempotency+payload hashes, expected status/version, exact document version, revocation invalidation | Durable atomic transactions and distributed idempotency/session stores |
| Sensitive caching/logging/analytics | No-store/private, no confidential service-worker cache, identifiers absent from URLs, no financial analytics, redacted error logging | Verify CDN, browser, monitoring, and provider redaction in production |
| Secrets/dependency/build compromise | Environment-only financial configuration, lockfile, zero-vulnerability npm audit, source/history credential scan, pinned framework/tool versions | CI secret/SBOM/SAST checks and protected dependency update process |
| Backup/storage/preview/cloud exposure | Operational production disabled; no production financial store exists | Private encrypted storage, least privilege, protected/restorable backups, protected previews, takeover review |
| Unauthorized API use/admin actions | Every financial admin endpoint reauthorizes server-side and mutations require same-origin evidence | Dedicated approver roles, MFA, production audit alerting |
| Audit tampering/log leakage | Financial audit records avoid document bodies/recipient addresses; UTC timestamps and request IDs | Append-only durable audit sink with restricted modification and approved retention |
| Production/test confusion | `NODE_ENV=production` or hub production mode unconditionally disables all operations; test delivery accepts only the configured test-sink domain | Controlled post-`GO LIVE` feature flags with separate credentials and production startup validation |
| Screen capture | Honest notice and opaque foreground/background privacy shield | Native capture controls only if an approved native application is later commissioned |

The dominant residual risk is not a missing client-side trick; it is the absence of the approved production identity, persistence, delivery, retention, and infrastructure layers. `BLOCKERS.md` makes those release gates explicit.

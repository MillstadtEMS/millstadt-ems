# Financial Information Hub Security Review

Review date: 2026-08-16
Scope: financial request/public filing hub, its protected administration routes, PDF/signature/upload/delivery code, PWA/privacy controls, relevant shared authentication and deployment boundaries, and a repository-wide high-risk sweep.
Release posture: **pre-launch, operational production disabled**.

## Verified controls

- Production renders only the branded `Millstadt EMS Financials and Information Request Hub` / `Coming Soon` experience. Financial document, request, viewer, public-990, and administrator document-library APIs return 404 in production.
- Restricted document authorization, approval, expiration, revocation, exact document-version checks, and stale-action checks occur on the server.
- Submission boundaries enforce same-origin evidence, CSRF state, content types, body limits, allowlisted fields, normalized values, signatures, idempotency, and valid-only rate limits.
- Accuracy uploads are private in the development store and checked for extension, MIME type, actual file signature, size, normalized filename, and basic development content indicators.
- Administrator document uploads are stored outside the public directory with server-generated filenames. Uploads are limited to PDF, checked by file signature and parser, capped at 20 MB and 200 pages, and rejected when the PDF contains embedded scripts or attachments. Archive/restore and protected original-file access require administrator authorization.
- Sensitive financial responses use `no-store, private`, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, a scoped CSP, COOP, referrer/permissions policies, HSTS in production, and no-index/no-archive directives.
- Financial requester identifiers are not placed in URLs. API responses do not expose notification recipients.
- Local/automated financial notifications are disabled unless an explicit non-production sink-domain gate is enabled. SMS is disabled for this pre-launch hub.
- The service worker has no fetch handler and no Cache API calls; it cannot cache submissions, signed PDFs, admin responses, or controlled documents.
- Stored signed-PDF digests bind each generated agreement to the request/report and its disclosure version.
- Dependency audit reports zero known vulnerabilities after framework, mail, transitive, and SheetJS updates.
- Standard credential-pattern scans found no matches in tracked source or Git patch history.
- The former production-capable hardcoded lounge development PIN and known truck-check/inventory fallback secrets were removed or made fail-closed in production.

## OWASP ASVS 5.0 alignment

This is a targeted pre-release review, not an ASVS certification. Implemented evidence aligns with the relevant intent of V1 encoding/validation, V2 validation/business logic, V3 browser security, V4 API security, V6 authentication boundaries, V7 session protections, V8 authorization, V9 self-contained tokens/identifiers, V10 OAuth/provider isolation, V11 cryptography/digests, V12 secure communications, V13 configuration, and V14 data protection. `REQUIREMENTS_TRACEABILITY.md` and `TEST_EVIDENCE.md` identify the concrete controls. Production persistence, identity, MFA, durable jobs, retention, monitoring, backups, and infrastructure evidence remain incomplete, so the operational system does not yet meet the target for a sensitive authenticated business application.

## Privacy shield and capture limits

- Web/PWA: the opaque shield hides sensitive content when supported foreground/background/blur/pagehide events occur and requires dismissal on return. A browser cannot reliably detect or block an operating-system screenshot.
- Android native/trusted wrapper: a future approved implementation may use `FLAG_SECURE`.
- iOS native: a future approved implementation may react to active capture state and post-screenshot notifications, but ordinary screenshots cannot be universally prevented.
- A second physical camera cannot be blocked by application code.
- No native wrapper was built because it is outside the approved repository scope.

## Remaining findings

| Severity | Component and reproduction | Impact and mitigation | Owner / required completion | Blocks launch |
| --- | --- | --- | --- | --- |
| High | Financial storage: inspect `dev-store.ts` and `accuracy-store.ts`; records, attachments, sessions, rate limits, and audit data are process memory. | Restart/data-loss, no atomic cross-service workflow, and no durable audit. Implement approved production database schema, transactions, encrypted private storage, migrations, backups, and restore test. | Millstadt system owner + hosting/database owner; date unassigned, mandatory before `GO LIVE`. | Yes |
| High | Requester access uses a random bearer-style user ID rather than an authenticated requester session. | A leaked identifier could authorize status/session actions. Implement authenticated, expiring requester sessions with rotation, reauthentication, and resource ownership checks. | Millstadt system owner; date unassigned, mandatory before `GO LIVE`. | Yes |
| High | Production delivery/outbox/provider-state workflow is not implemented; see notification development path. | No durable queued/accepted/delivered/bounced/failed/retry state or atomic outbox. Implement approved provider configuration and idempotent durable workers. | Millstadt system owner + email/SMS owner; date unassigned, mandatory before `GO LIVE`. | Yes |
| High | Financial administration now requires a named active Lounge administrator and the Lounge MFA flow, but a dedicated approver role and release-action reauthentication are not implemented. | A compromised broad administrator account could approve/release records. Add least-privilege approver assignment and step-up authentication for release actions. | Millstadt identity owner; date unassigned, mandatory before `GO LIVE`. | Yes |
| High | Upload security has no approved malware-scanning service or durable quarantine/private object storage. Administrator document PDFs use localhost-only private filesystem storage, while accuracy supporting uploads remain in development memory. | A crafted allowed file could reach staff, and local files are not appropriate multi-instance production storage. Add approved private object storage, quarantine, scanner verdict, safe disposition, time-limited authorization, retention, and deletion controls. | Millstadt storage/security owner; date unassigned, mandatory before `GO LIVE`. | Yes |
| Medium | `scripts/lounge-init.mjs` and legacy inventory/applicant/board modules contain staff contact data or recipient addresses. | Repository readers can see existing staff contact information. Owner must classify it, remove/migrate private values to approved protected configuration where required, and rotate affected seed material. | Millstadt repository owner; date unassigned, before general production release. | Yes pending owner classification |
| Medium | Full repository lint reports 93 errors and 67 warnings in unrelated legacy admin/lounge/game code. | Quality defects can conceal regressions outside the scoped hub. Triage and fix without weakening rules. | Respective module owners; date unassigned, before general production release. | Yes under the requested release gate |
| Medium | Persistent multi-instance rate limiting, WAF/bot controls, production monitoring/alerts, backup status, storage permissions, TLS/domain state, source-map policy, and preview protection were not available for verification. | Abuse or infrastructure exposure cannot be ruled out. Configure and produce deployment evidence. | Hosting/security owner; date unassigned, before `GO LIVE`. | Yes |
| Medium | Current Safari/WebKit, Firefox, automated accessibility scanning, and authorized dynamic security scanning did not run in this environment. | Browser/accessibility/security incompatibilities may remain. Run the documented release matrix on protected staging. | QA/security owner; date unassigned, before `GO LIVE`. | Yes |

No critical vulnerability is known in the reviewed financial source. The high findings above are architectural launch gaps, contained today by the unconditional production shutdown.

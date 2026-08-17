# Financial Information Hub Audit Report

Review date: 2026-08-16. The audit covered the financial hub source, routes, legal-constant usage, signatures, PDFs, uploads, approval/viewer logic, notifications, PWA/privacy code, shared authentication boundaries, dependencies, configuration, and repository-wide high-risk patterns.

## Issues found and fixed

| Severity | Finding and root cause | Fix and regression evidence |
| --- | --- | --- |
| High | Existing lounge dev-login route used hardcoded PINs and was intentionally production-capable. | Removed the route, UI, and environment switches entirely; automated checks require the endpoint to remain absent. |
| High | Next.js, Nodemailer, transitive HTTP/sanitizer packages, and npm-registry SheetJS had known advisories. | Updated Next/Nodemailer/transitives and installed official SheetJS 0.20.3 tarball. `npm audit` now reports zero vulnerabilities. |
| High | Restricted requests lacked complete CSRF/same-origin, idempotency, stale-action, and exact document-version enforcement. | Added server request boundary, payload-hash idempotency, expected status/version checks, and viewer version binding; direct tests pass. |
| High | Real/test delivery configuration could be confused and recipients could be returned/logged. | Production hard-disable, explicit test-sink domain, SMS off, recipient counts only, no recipient API fields; delivery-isolation test passes. |
| High | Requester IDs appeared in query strings. | Moved identity to request headers/body and added source/API regression checks. |
| High | Known fallback secrets existed for truck-check signing and inventory initialization. | Production now fails closed when required secrets are absent; development-only fallback values are non-production. Existing deployed credentials still require owner verification/rotation. |
| Medium | Form 990 catalog reported 2/3 pages while each PDF had one physical page. | Generator now creates one searchable US Letter page per catalog page; `pdfinfo` assertions pass. |
| Medium | Signed agreement pagination orphaned headings and did not include the complete current terms, final electronic-submission confirmation, or administrative audit details. | Deterministic continuation now produces seven readable pages containing the complete terms, signature record, final confirmation, AI/provenance notices, methodology appendix, request hash, and stored filename; every page was rendered and inspected. |
| Medium | Viewer/status/catalog network exceptions could escape UI handling and contribute to blank behavior. | Added guarded fetch handling that preserves form/selection state and reports recoverable errors. Browser click-through stays on the route. |
| Medium | Accuracy multipart route did not reject unknown field names. | Added a server-side allowed-field set before upload processing. |
| Medium | Unexpected/provider error objects were written verbatim to logs. | Logs now record only generic operation and error class; user responses remain generic. |
| Medium | No scoped CSP and production dev-tool paths remained reachable after authentication. | Added financial-route CSP and production 404 boundary for dev-tool page/APIs. |
| Low | Signature UI had incomplete responsive styling and PWA icon metadata did not match physical dimensions. | Completed signature controls and generated 192/512 approved-logo icons with correct manifests. |
| Medium | The acknowledgment checkbox was bound to completed-signature state, so opening the signature panel immediately cleared the visible check. | Split terms acknowledgment from completed signature state and added a recoverable `Sign request` action; submission still requires both states. |
| Medium | The signature canvas mixed CSS coordinates with device-pixel backing dimensions and resized on the first stroke. | Pointer events now map directly into backing-store coordinates, retain pointer capture, preserve ink through responsive resizing, and share the same path for mouse, touch, and pen. |
| Medium | The fixed public-site shell could paint above a scrolled financial dialog and obstruct its Close control. | Financial dialogs and the controlled viewer now render through a body-level portal above the unchanged site shell and below the privacy shield. |
| Medium | Admin decisions did not notify the requester, and signed-PDF requester copies were not available. | Added an optional requester-copy checkbox, attached signed-PDF email, and approval/denial/revocation/expiration email attempts behind the development-only recipient allowlist. |
| Medium | The restricted flow treated terms acknowledgment and signature as the final consent, leaving no separately recorded confirmation immediately before submission. | Added a distinct signature full-name field and final unchecked electronic-submission confirmation, enforced both server-side, versioned the notices, and recorded the exact text, timestamps, action, signature, request hash, and filename in the signed PDF. |

## Deliberately preserved

- Existing Millstadt ticker, alerts, time, weather/moon, navigation, lounge/menu controls, branding, header, footer, and site shell.
- The supplied archive, public-access, request, AI-processing, provenance, controlled-viewing, and accuracy-report copy is centralized and versioned without changing the site-wide shell.
- Public Form 990 access without identity, account, signature, acknowledgment, or approval.
- Restricted-document identity, terms, signature, administrator approval, expiration/revocation, audit, and controlled viewing.
- Accuracy-report private review workflow and supporting-upload behavior.

## Open audit results

Production remains disabled because the durable data, identity, delivery, retention, MFA/roles, infrastructure, and complete release-testing requirements in `BLOCKERS.md` are not implemented or verified. Full repository lint also has pre-existing failures outside this scope. No public deployment or branch push was performed during this audit because preview protection and production hosting controls were not proven.

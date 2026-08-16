# Financial Information Hub Changed-File Summary

- `app/financials-information-hub/`, `components/PwaRegistration.tsx`, scoped styles, manifests, icons, and service worker: polished document chooser, public/restricted branching, request/report/signature dialogs, accessibility, PWA metadata, privacy shield, and recoverable network states while retaining the site shell.
- `app/api/financials/`, `app/api/admin/financials/`, and `lib/financials-hub/`: catalogs, request/report validation, CSRF/same-origin controls, idempotency, valid-only rate limiting, signed PDFs, approval/version/expiration/revocation, controlled viewer, audit records, upload checks, delivery isolation, and production fail-closed behavior.
- `data/financials-hub/` and `docs/financials/sample-pdfs/`: synthetic catalogs/filings, the owner-supplied call-volume bundle, and sanitized PDF evidence.
- `app/admin/financials/`: protected review queues and intentional approve/deny/revoke/expire/report-review actions, separate from the public page.
- `proxy.ts`, `next.config.ts`, `app/layout.tsx`, `.gitignore`, and ESLint/build configuration: financial security headers, production dev-tool blocks, isolated build directories, and PWA registration.
- `app/api/lounge/dev-login/route.ts`, `app/lounge/login/page.tsx`, `app/admin/dev-tools/page.tsx`, `lib/truckcheck/auth.ts`, and `lib/inventory/auth.ts`: removed production-capable hardcoded development access and made missing production secrets fail closed.
- `lib/lounge/employee-email.ts` and `app/api/sms/reply/route.ts`: attachment-capable test notification path and development approval-reply handling under the hub's disabled production boundary.
- `package.json` and lockfile: framework/mail dependency security updates and official SheetJS 0.20.3 package source.
- Root audit/release Markdown files and `scripts/test-financials-hub.mjs`: source-of-truth matrix, traceability, threat/security/audit evidence, launch/rollback procedures, environment inventory, and 26-check integration suite.

`AGENTS.md`, `outputs/`, and `work/` are existing/unrelated workspace state and are excluded from the intended commit.

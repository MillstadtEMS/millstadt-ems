# Website Security Hardening Implementation Report

Date: 2026-08-16
Scope: public website, public forms, Employee Lounge, administrator routes, Board portal review, sensitive storage, global response policy, dependencies, and operational readiness.
Deployment: source/staging work only. No production deployment was performed.

This work improves technical safeguards. It is not a statement that Millstadt Ambulance Service / Millstadt EMS is HIPAA compliant. Compliance also depends on formal risk analysis, policies, training, vendor agreements, incident handling, and verified production operations.

## Implemented

- Generated a complete inventory of 149 pages and 266 API handlers in `SECURITY_ROUTE_INVENTORY.md`; documented data flows and PHI-adjacent findings in `SITE_SECURITY_AUDIT.md`.
- Added a tested global CSP, HSTS/HTTPS enforcement, clickjacking protection, MIME sniffing protection, restrictive permissions/referrer policies, protected-route noindex behavior, and removal of the framework disclosure header.
- Added strict Zod schemas, bounded bodies, same-origin/double-submit CSRF protection, and shared database-backed throttling for public contact/application forms and Lounge/Board logins.
- Removed the patient-identifying run-number web form. The page now directs callers to the established billing channel and does not collect patient name, DOB, date of service, or authorization documents.
- Removed SSN, driver-license-number, immunization, and arbitrary attachment collection from the careers application. New submission payloads are encrypted before database storage; ordinary notification email contains no applicant fields.
- Retired the shared administrator password/session path. Administrator access now requires a named, active Lounge administrator account. The separate ticker-editor permission remains available without granting global administrator rights.
- Hardened Lounge and Board session signing, constant-time comparisons, timestamp checks, production fail-closed secret requirements, short Lounge sessions, durable login throttling, and 30-day trusted-device expiry with token rotation after use.
- Encrypted new incident narratives/media metadata, employee medical/sensitive profile values, profile-change values/comments/decision notes, and general public-form payloads with versioned envelopes. Legacy plaintext remains readable only for migration compatibility.
- Stopped new incident reports and photos from using public blob URLs or ordinary email. Added authenticated, audited, no-store incident retrieval.
- Made new HR/personnel, certification, onboarding, finalized employee form, write-up, acknowledgment, and profile-change attachments private. Added byte-signature inspection plus authenticated streaming with admin/owner/visibility/lifecycle checks and audit events.
- Added weekly dependency updates, monthly Actions updates, an exact audited `pdfjs-dist` pin, Zod, and security-related environment-variable templates. Current `npm audit` reports zero known vulnerabilities.
- Added `npm run test:security` to prevent regressions in these controls and explicitly verify that the global call ticker remains mounted and its public CAD read endpoint remains present.

## Preserved Boundaries

- The public call ticker, weather/time/moon shell, CAD read endpoint, Lounge navigation, and site-wide visual components were not redesigned or removed.
- `/api/admin/calls*` and `/api/admin/cad-poll*` retain the named ticker-editor authorization path.
- Billing card data continues to stay outside this repository and with the existing third-party processor.
- The financial request hub remains production-disabled behind its existing feature gates.

## Remaining Launch Blockers

| Severity | Gap | Required action |
| --- | --- | --- |
| Critical | Existing sensitive objects created before this change may still have public Vercel Blob URLs. | Execute the reviewed private-object migration in `SECURITY_DATA_MIGRATION.md`, verify authorization, then delete old public objects. |
| High | Existing incident, employee medical, profile-change, and public-form rows may remain plaintext. | Back up, migrate legacy rows to the versioned encrypted envelopes, reconcile counts, and test restoration. |
| High | Board accounts do not yet have MFA. | Add and test named-account MFA in protected staging before treating the Board portal as ready for confidential records. |
| High | Inventory and truck-check legacy shared credentials remain for compatibility. | Migrate every operator to a named account, verify attribution, then disable the shared paths. |
| High | Lounge/Board auth remains locally maintained rather than migrated to an approved identity provider. | Conduct a staged identity architecture review; do not replace live auth without account migration, recovery, and rollback tests. |
| High | Lounge messages, wall media, some policies, truck-check files, and other legacy media still use public client-upload workflows. | Design an authenticated direct-upload/private-delivery flow, migrate data, and preserve mobile large-file behavior. |
| High | No approved malware scanner/quarantine is connected to uploads. | Select a scanner and private quarantine workflow; block staff access until verdict and log every disposition. |
| High | Production log retention, alerting, WAF rules, encrypted backups, and restore tests were not available for verification. | Configure them in the hosting/database accounts and retain dated evidence. |
| High | Vendor BAA/contract status for database, blob, email/SMS, and hosting providers is unknown. | Privacy/legal leadership must classify data flows and execute required agreements before PHI-adjacent use. |
| Medium | Full repository lint has substantial pre-existing failures outside this change. | Triage and fix without weakening rules; run full CI before release. |

## Required Organizational Work

- Own and approve a formal HIPAA/security risk analysis and system scope.
- Maintain workforce training, sanctions, access reviews, and immediate joiner/mover/leaver revocation.
- Assign incident commander, privacy lead, counsel, communications lead, and vendor contacts in a secure runbook.
- Complete a professional penetration test against protected staging.
- Exercise backup restoration and incident response at least annually and after material architecture changes.

The source is materially safer for new activity, but the blockers above must not be represented as complete until production evidence exists.

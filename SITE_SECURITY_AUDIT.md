# Millstadt EMS Full-Site Security Audit

> This is the Phase 0 pre-change snapshot. See `SECURITY_IMPLEMENTATION_REPORT.md` for controls implemented afterward and the current residual-risk register.

Review date: 2026-08-16
Branch: `feat/millstadt-ems-information-hub-request-approval-dev-only`
Posture: staging/source review. No production deployment was performed.

This audit covers the public website, public forms, Employee Lounge, Board portal, administrator routes, inventory, truck-check, billing handoff, uploads, authentication, storage, dependencies, live response headers, and high-confidence secret patterns. It does not certify HIPAA compliance. Administrative safeguards, workforce training, formal risk analysis, vendor contracts/BAAs, and production infrastructure evidence remain the organization's responsibility.

The complete source-derived list of all 149 pages and 266 API handlers is in `SECURITY_ROUTE_INVENTORY.md`.

## Route and Data Inventory

| Surface | Routes | Data and storage | Current access boundary | Security classification |
| --- | --- | --- | --- | --- |
| Public content | `/`, `/about`, `/billing`, `/board-minutes`, `/bulletin`, `/careers`, `/commercial-club`, `/community-education/*`, `/contact`, `/donate`, `/events`, `/fleet`, `/gallery`, `/kids-club/*`, `/leadership`, `/links`, `/medical-control`, `/movies`, `/news`, `/privacy`, `/senior-center`, `/statistics`, `/testimonials`, `/traffic`, `/weather*`, `/whats-happening` | Published site/database content, public media, weather/CAD summaries | Public | Public |
| Public request forms | `/forms/*`, `/careers/apply`, `/billing/run-number` and `/api/contact`, `/api/apply` | Names, contact details, DOB on some forms, event/request details, employment history, license details, signatures, attachments, patient identifiers on run-number request; Neon JSON and Gmail delivery | Public submission, administrator review | PII; run-number is PHI-adjacent |
| Financial hub | `/financials-information-hub`, `/api/financials/*`, `/admin/financials`, `/api/admin/financials/*` | Public Form 990s; signed access requests; restricted-document approvals; signed PDFs; accuracy reports | Production disabled; localhost feature gate; admin for review | PII/restricted business records |
| Employee Lounge | `/lounge/*`, `/api/lounge/*` | Employee profiles, phone/email/DOB, SSN ciphertext, medical profile fields, messages/media, forms, incidents, policies, acknowledgments, certificates | Named Lounge account and MFA path | Sensitive workforce data; some PHI-adjacent |
| Administrator | `/admin/*`, `/api/admin/*` | Employees, applicants, personnel records, incidents, forms, analytics, uploads, site content, operational data | Lounge administrator plus legacy shared-admin compatibility | Highly sensitive |
| Board portal | `/board/*`, `/api/board/*` | Named users, minutes, transcripts/drafts, votes/requests, workbook, audit trail | Separate named board account and role checks | Confidential governance records |
| Inventory | `/inventory/*`, `/api/inventory/*` | Medication/supply counts, submissions, photos, audit history | Lounge SSO or legacy inventory credential | Internal operational data |
| Truck check | `/truckcheck/*`, `/api/truckcheck/*` | Vehicle/equipment inspection answers, photos, generated PDFs | Lounge SSO or legacy truck-check credential | Internal operational/safety data |
| CAD/ticker | `/api/cad/*`, `/api/admin/calls/*`, `/api/lounge/ticker-control/calls` and global ticker UI | Dispatch/run categories, display settings, curated public operational summaries | Public read; named authorized editor/admin write | Operational; explicit regression boundary |
| Scheduled/webhook | `/api/cron/*`, `/api/sms/reply`, `/api/revalidate` | Maintenance jobs, notification state, inbound provider data | Shared secrets/provider signatures vary by route | Privileged integration |

## Form Inventory

| Form | Collected data | Delivery/storage | PHI determination |
| --- | --- | --- | --- |
| Education request | Name, phone, email, organization, audience, date/time, location, details | Neon form submission and Gmail notification | PII; free text could receive health details |
| Equipment request | Name, phone, email, organization, requested item, dates, purpose/location/details | Neon and Gmail | PII; not inherently PHI |
| Event appearance | Name, phone, email, organization, event/date/location/attendance/details | Neon and Gmail | PII; not inherently PHI |
| Ride-along | Name, phone, email, DOB, school, purpose/date/hours/notes | Neon and Gmail | PII; free text could receive health details |
| Birthday appearance/station | Requester contact, child's first name/age, date/time/address/notes | Neon and Gmail | PII involving a minor |
| Short employment form | Name, contact/address, license/certification/experience/availability/notes | Neon and Gmail | Sensitive employment PII |
| Full careers application | Identity/contact, DOB, SSN last four, driver/professional license data, background answers, history, references, signature, uploaded records | Neon metadata and Gmail body/PDF/attachments | Sensitive employment data; immunization uploads are health information |
| Run-number request | Patient name, DOB, date of service, requester contact and relationship | General Neon form submission and Gmail | PHI-adjacent and inappropriate for the general website/email pipeline |

## PHI and Sensitive-Data Findings

Treat the following as PHI-adjacent until counsel/privacy leadership confirms otherwise:

1. `/billing/run-number` collects patient identity plus date of service and submits through `/api/contact`.
2. Lounge incident reports contain patient-involvement, location, narrative, actions, witness, and photo fields. Their JSON is plaintext, and new PDFs/photos are currently uploaded with public blob access and emailed.
3. Employee profile `allergies`, `medical_conditions`, and `blood_type` fields are plaintext. SSNs use AES-256-GCM, but other medical fields do not.
4. Personnel, onboarding, clinical, write-up, profile-change, certificate, policy, message, and completed-form files use publicly addressable Vercel Blob URLs in several handlers even though metadata APIs are authenticated.
5. The careers application offers an immunization-record upload and emails all accepted attachments. The application PDF also contains sensitive identity/license information.
6. Lounge free-text messages, incident narratives, uploads, and form responses can receive patient details regardless of intended use.

## Authentication and Sessions

### Employee Lounge

- Named employee accounts stored in Neon.
- Passwords use salted scrypt hashes.
- TOTP, SMS, and WebAuthn flows exist; first enrollment is supported.
- Session cookies are HttpOnly, Secure in production, SameSite=Lax, and expire after 15 minutes.
- Password changes invalidate sessions because the password hash participates in signing.
- Gaps: no login throttling/lockout, non-constant-time password comparison, session/preauth signing can derive from insufficient fallback material, and trusted-device bypass lasts 365 days.

### Board

- Separate named accounts, roles, salted scrypt passwords, password-bound signed cookies, 30-minute expiry, and append-only audit inserts.
- Gaps: no MFA, in-memory one-minute login throttle, no breached-password service, and no proven session revocation workflow beyond account deactivation/password change.

### Administrator

- Most routes use Lounge admin authorization.
- A legacy `mas_admin` shared-password session remains in the auth helper/API even though the visible login redirects to Lounge.
- Proxy middleware previously treated any Lounge-cookie presence as enough to pass its preliminary gate; individual route authorization remains essential.

### Inventory and Truck Check

- Both accept Lounge SSO.
- Legacy shared credential/session paths remain for compatibility. These do not provide unique-user attribution and conflict with least-privilege/unique-login goals.

## Dependencies

- `npm audit --omit=dev`: zero known advisories at review time.
- Patch/minor updates are available for several packages; major upgrades require compatibility testing.
- `pdfjs-dist` is intentionally pinned to `5.5.207` because the newer available release was inside a known affected advisory range during the financial-hub review.
- Automated dependency update configuration was not present at review start.

## Hosting, DNS, TLS, and Headers

- `millstadtems.org` redirects to `www.millstadtems.org` and is hosted on Vercel.
- DNS uses Google Domains nameservers with the `www` CNAME directed to Vercel.
- The observed certificate was issued by Let's Encrypt for `www.millstadtems.org`, valid from 2026-08-06 through 2026-11-04.
- HTTPS redirect and `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` were observed.
- `nosniff`, `DENY` framing, referrer policy, and a permissions policy were observed.
- A site-wide Content-Security-Policy, `X-Robots-Tag` on Lounge/Board, and removal of `X-Powered-By` were not observed.

## Secret Review

- `.env*`, Vercel metadata, private keys, and local financial data are ignored.
- No high-confidence AWS, Google API, GitHub, OpenAI, Slack, Twilio account SID, or private-key pattern was found in tracked source.
- Environment variable names were reviewed without printing values.
- Git history and hosting secret-store configuration require an approved dedicated scanner and owner verification before release; source inspection alone is not proof of absence.

## Prioritized Findings

| Severity | Finding | Required disposition |
| --- | --- | --- |
| Critical | Patient/incident data can be written to public blobs and sent by ordinary email. | Stop new public storage/delivery, provide authenticated private retrieval, inventory and migrate/delete existing public objects, and obtain approved secure communications/storage with appropriate vendor agreements. |
| Critical | Run-number form sends patient identifiers through the general form and Gmail pipeline. | Remove online collection until an approved patient-record/billing workflow is available; direct users to an authorized verification channel. |
| High | Multiple confidential workforce/Board artifacts use public blob URLs. | Make new uploads private, proxy retrieval through authorization, migrate existing objects, and add access auditing. |
| High | Public forms lack strict server schemas, CSRF tokens, durable throttling, and bounded bodies; employment email templates do not consistently escape untrusted values. | Add strict validation, same-origin/double-submit CSRF, distributed throttling, MIME/content inspection, output escaping, and generic notifications. |
| High | Board has no MFA; shared admin/inventory/truck-check paths remain. | Require named MFA accounts and retire shared credentials through a staged migration. |
| High | Medical employee fields and incident payloads are plaintext at application level. | Encrypt new writes, provide an explicit migration for existing rows, restrict reads, and log access. |
| Medium | Global CSP/noindex/header policy is incomplete. | Add a tested CSP compatible with Next.js, protected-route noindex/cache policy, HTTPS enforcement, and remove framework disclosure. |
| Medium | Rate limits are process-memory only or absent. | Use a shared durable store or edge/WAF rules; retain application fallback limits and alerts. |
| Medium | Monitoring, encrypted offsite backups, restore evidence, WAF/bot policy, preview protection, and incident alerting are not proven. | Hosting/security owner must configure and retain evidence before release. |

## Organizational Work That Code Cannot Complete

- Formal HIPAA risk analysis and documented scope decision.
- Vendor BAAs/contracts for any service handling PHI-adjacent data.
- Workforce security/privacy training and sanction policy.
- Joiner/mover/leaver access-revocation process and periodic access review.
- Breach/incident response ownership and legal notification decision process.
- Professional penetration test against a protected staging deployment.
- Backup restoration exercise and documented recovery objectives.

No statement of “HIPAA compliant” should be made from this technical work alone.

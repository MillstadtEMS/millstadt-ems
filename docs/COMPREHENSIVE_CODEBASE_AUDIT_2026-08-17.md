# Millstadt EMS Comprehensive Codebase Audit

**Audit date:** August 17, 2026  
**Branch reviewed:** `codex/truckcheck-p0-5`  
**Repository state:** Isolated local development branch; no audit changes pushed or deployed  
**Review scale:** 1,180 tracked files; 798 TypeScript/TSX files; 152 page routes; 266 API handlers; approximately 140,500 TypeScript/TSX lines

## 1. Executive Summary

The reviewed baseline had a strong visual foundation and several thoughtful fail-closed controls, but the combined public, employee, board, CAD, financial, and analytics systems exposed five release-blocking security or data-integrity defects. This isolated branch now implements the four non-CAD P0 corrections: Lounge MFA/setup credentials, private Board document delivery for new uploads, and durable TruckCheck persistence. The CAD authorization finding remains a recommendation only because the owner designated CAD polling, parsing, database behavior, and the public ticker as protected; those files were restored to the branch baseline and pass their hash invariant. Broad consistency debt remains, including uneven mutation protection and legacy public Blob objects that require an owner-approved migration rather than automatic deletion.

**Post-audit implementation status:** P0.1, P0.2, P0.3 for new uploads/access paths, and P0.5 are implemented with focused tests on `codex/truckcheck-p0-5`. The August 17 Lounge/Board follow-up also closes P1.9, applies the P1.12 same-origin boundary to every Lounge and Board mutation, and closes the production-development-account portion of P1.17. P0.4 and every other CAD/ticker recommendation are unimplemented by design. Deployment still requires the documented development-database migration, full build/type/lint gates, and a real browser preview.

### What Is Working Well

- `npm run test:elite-protected` passed and confirms the named protected-area invariants.
- `npm run test:security` passed 30 security checks plus eight TruckCheck boundary assertions.
- `npm run test:reports` produced and validated 14 fictional PDF samples without sending mail.
- `npm run test:public-experience` passed 47 assertions.
- `npx tsc --noEmit --pretty false` passed before the final narrow sports and lazy-import corrections; the final rerun produced no diagnostic but did not complete within the bounded sandbox window, so it is not counted as a final pass.
- Public image-path validation found no missing hard-coded image or font asset.
- The employment application and public contact endpoints use bounded payloads, strict schemas, CSRF tokens, rate limits, escaped email, and protected database storage.
- The financial prototype and optional analytics are currently gated off in production when required controls are absent.
- Production `https://www.millstadtems.org/` was visually inspected and still showed the hero photography, CAD ticker, weather strip, Lounge control, and current public site. No push or deployment occurred during this audit.

### Verification Limits

- `npm run lint -- --format json` completed with **76 errors and 48 warnings** across 817 files. The dominant rules were `react-hooks/set-state-in-effect` (53), unused variables (25), raw image elements (15), and unescaped entities (11).
- `npm run test:financials` could not start its local test server because this task sandbox rejects loopback binds with `EPERM`; this is an environment limitation, not a claimed test pass.
- `npm audit --omit=dev --json` could not reach `registry.npmjs.org` from the restricted environment. Current dependency advisories remain unverified and must run in CI or another networked environment.
- Live databases, Blob contents, Gmail, Twilio, external cron-job.org configuration, and production secrets were not read or mutated.
- The localhost screenshot that appeared to have broken images, fonts, weather, sports, and ticker data was a stale service-worker/offline-cache shell after the dev server stopped. Production was not changed.

### Lounge and Board Backend Verification Addendum

The focused follow-up inventoried **40 Employee Lounge and Board pages** and **93 dedicated Lounge/Board API handlers**. `scripts/test-lounge-board-boundary.ts` now fails if those inventories unexpectedly shrink, a protected route loses its recognized authentication boundary, a Board portal page loses its role/access gate, or the shared same-origin mutation guard is removed. The review also covered the shared employee-admin layout, employee creation/reset routes, Lounge MFA and trusted-device lifecycle, Board sessions, Board role-specific navigation and direct page authorization, private workbook/budget delivery, acknowledgments, messaging, forms, uploads, incidents, policies, notifications, maintenance, games, and TruckCheck SSO boundaries.

Confirmed corrections in this checkpoint:

- Every `POST`, `PUT`, `PATCH`, and `DELETE` request under `/api/lounge/*` and `/api/board/*` now passes one fail-closed same-origin check in `proxy.ts`, while existing route-level authentication and validation remain intact.
- Targeted acknowledgments now enforce the intended employee target when read, viewed, or acknowledged; guessed IDs return not found. Administrators use a separate explicit unrestricted lookup for roster review.
- Message read receipts require conversation participation, and a reply can reference only a message in the same conversation.
- Production Board login and session verification reject `is_dev_login` accounts even when a credential is otherwise valid.
- Board portal pages retain independent role/governance checks in addition to the authenticated portal layout. New Board workbook and draft-budget objects remain private and are streamed only through authenticated, no-store application routes.

Verification passed: `npm run test:lounge-board` (40 pages, 93 APIs), `npm run test:security`, `node scripts/test-auth-p0-hardening.mjs`, `npm run test:board-private-documents` (seven tests), `npm run test:elite-protected`, and `git diff --check`.

This is strong source and executable boundary evidence, but it is **not a truthful 100% live-system certification**. The sandbox could not start a local server, and this review did not use real employee/Board credentials, mutate the live Neon database, upload to live Blob storage, send Twilio/Gmail traffic, or execute every UI workflow in a browser. Lounge message/Wall/policy legacy public Blob URLs, Board MFA, server-side absolute/idle revocation, production database dev-account inventory, and the broader admin mutation/audit backlog remain open P1 work below. Those items must be completed and exercised in a credentialed preview before the backend can be called fully production-verified.

## 2. Prioritized Action Items

### P0 - Security Breach, Data Loss, or Production-Critical Integrity

#### P0.1 Lounge TOTP enrollment discloses an enrolled secret and bypasses MFA

**Affected files/functions:** `app/api/lounge/login/route.ts` password-success flow; `app/api/lounge/setup-2fa/route.ts` `GET` and `POST`; `lib/lounge/auth.ts` pre-auth token creation and verification; `lib/lounge/trusted-devices.ts` trusted-device issuance.

**Problem:** After a valid password, the generic pre-auth cookie can call the setup endpoint even when TOTP is already enrolled. `GET /api/lounge/setup-2fa` returns the existing secret, and `POST` accepts a code generated from that disclosed secret, creates a full session, and defaults to a 30-day trusted device. A password-only attacker can therefore defeat the second factor, including for administrators.

**Fix prompt:**

> In `app/api/lounge/login/route.ts`, `app/api/lounge/setup-2fa/route.ts`, `app/api/lounge/verify-2fa/route.ts`, `lib/lounge/auth.ts`, and `lib/lounge/trusted-devices.ts`, replace the generic pre-auth flow with a short-lived, server-recorded challenge containing employee ID, purpose (`verify_totp`, `verify_sms`, or `enroll_totp`), nonce, issued time, and one-use state. Never return an existing TOTP secret. Permit enrollment only when no factor is enrolled or after an authenticated recovery/reset workflow. Require the challenge purpose to match the endpoint, consume it atomically, default trusted-device issuance to false, rate-limit and audit every attempt, and revoke on replay. Add regression tests proving that a password plus `setup-2fa` cannot bypass an enrolled factor and that only a fresh enrollment challenge can receive a new secret. Preserve the normal Microsoft Authenticator and optional verified-SMS login experience.

#### P0.2 Predictable bootstrap passwords bypass forced-change restrictions at the API layer

**Affected files/functions:** `lib/lounge/employees.ts` create/reset password logic; `app/api/admin/employees/[id]/reset-password/route.ts`; `lib/lounge/auth.ts` session resolution; `app/lounge/page.tsx`; `lib/board/auth.ts`; `app/board/(portal)/layout.tsx`; board user initialization scripts.

**Problem:** New/reset Lounge passwords are set to the username. `mustChangePassword` is enforced by selected pages rather than central authorization, so a session with a known temporary password can call many APIs before changing it. The Board portal has the same central-enforcement gap. This can compromise new or reset accounts.

**Fix prompt:**

> Replace username-based Lounge and Board bootstrap passwords with cryptographically random, expiring, single-use setup tokens. Add a central authorization state that permits only `me`, logout, password-change, and approved factor-enrollment endpoints while `mustChangePassword` is true; reject every other API and page server-side. Revoke all sessions and trusted devices on password reset. Remove deterministic fallback credentials from scripts, audit creation/reset/first-use, and add integration tests that direct API calls cannot bypass the forced-change state. Preserve named employee and board roles and do not alter production data without an approved migration and credential-rotation plan.

#### P0.3 Complete Board and draft financial files are publicly downloadable

**Affected files/functions:** `public/board/referendum/current.xlsx`; `public/board/referendum/current.json`; `app/api/board/workbook/route.ts`; `lib/board/workbook.ts`; `app/board/(portal)/referendum/page.tsx`; `app/api/admin/budget-documents/route.ts`; `proxy.ts` extension-path bypass.

**Problem:** The complete referendum workbook and its parsed JSON are tracked under `public/`, so they bypass portal authentication and sheet-level audience filtering. New uploads and draft budget documents also use `access: "public"`. This exposes financial formulas, salary/budget data, and content intentionally hidden from some board roles.

**Fix prompt:**

> Migrate Board workbooks, parsed workbook data, and draft budget documents out of `public/` and public Vercel Blob storage. Store objects privately, retain a durable object manifest, and stream them only through authenticated endpoints that enforce Board role and sheet-level audience rules before serialization. Inventory existing public URLs, preserve an encrypted backup, remove tracked public copies only after the private path is verified, revoke or delete historical public Blob objects, and document the exposure response. Add anonymous, wrong-role, correct-role, range-download, cache-header, and sheet-filtering tests. Do not publish or deploy until the owner reviews the migration preview.

#### P0.4 CAD poll authorization trusts a spoofable header and a leak-prone query secret

**Affected files/functions:** `app/api/cad/poll/route.ts` `isAuthorized`, `GET`, and `POST`; cron-job.org scheduler configuration; CAD Gmail read-state and SMS side effects.

**Problem:** Any nonempty `x-vercel-cron-signature` header currently authorizes the route. The route also accepts a query-string secret, which can appear in logs and monitoring URLs. An external caller can trigger Gmail reads, database changes, and SMS sends. The route comment describes a Vercel schedule that is not in `vercel.json`; the actual free cron-job.org scheduler must be preserved.

**Fix prompt:**

> In a protected CAD-only checkpoint, keep cron-job.org as the scheduler but replace `isAuthorized` with fail-closed, constant-time verification of one high-entropy configured secret. Prefer a custom `Authorization: Bearer` header if the cron-job.org account supports it; if query authentication is unavoidable, use a dedicated rotated token, reject missing/empty configuration, redact the query from all logs, and never trust a header merely because it exists. Add a durable single-flight/idempotency lock, bounded rate limiting, and security audit events. Write contract tests for missing, wrong, spoofed-signature, correct, duplicate, and concurrent requests before touching production. Do not alter CAD parsing, `ACTIVE_MINUTES = 120`, ticker rendering, or the external schedule in the same change.

#### P0.5 TruckCheck reports success after authoritative persistence fails

**Affected files/functions:** `app/api/truckcheck/submit/route.ts` normalized inserts, legacy writes, PDF/email side effects, and final response; TruckCheck database schema and idempotency helper.

**Problem:** Database errors in both normalized and legacy writes are swallowed, then the route unconditionally returns `{ ok: true }`. Compliance records can be lost or internally inconsistent while the user is told submission succeeded.

**Fix prompt:**

> Refactor `app/api/truckcheck/submit/route.ts` so one authoritative TruckCheck record and its required items are persisted transactionally before returning success. Fail with a retryable response when durable storage is not achieved. Use an idempotency key to make retries safe, record partial legacy-migration failures separately, and move PDF/email generation to a durable outbox that cannot reverse the saved result. Add tests for each failed insert, transaction rollback, duplicate retry, PDF failure, email failure, and successful replay. Preserve the existing TruckCheck fields, military-time presentation, protected storage, and user workflow.

### P1 - Likely Bugs, Material UX Degradation, or High Security Risk

#### P1.1 Lounge messages, Wall media, policies, and some financial files use public Blob URLs

**Affected files/functions:** `components/lounge/MessengerClient.tsx`; `components/lounge/Wall.tsx`; `app/api/lounge/messages/media/route.ts`; `app/api/lounge/feed/media/route.ts`; `app/api/lounge/policies/route.ts`; `components/lounge/PoliciesClient.tsx`.

**Problem:** Internal files remain accessible to anyone possessing the URL, even after logout, employee deactivation, conversation removal, or policy revocation. Messenger permits wildcard binary uploads up to 500 MB, creating confidentiality, malware-hosting, and cost-abuse exposure.

**Fix prompt:**

> Convert Lounge message, Wall, and policy objects to private storage and serve each through a no-store authorization proxy that checks active employee status plus conversation/resource membership. Validate magic bytes, cap sizes by media class, transcode safe images when practical, add malware quarantine/scanning, per-user quotas, durable rate limits, and orphan cleanup. Verify attachment ownership when a post/message is created. Migrate existing public objects without breaking message history, then revoke the old URLs. Add tests for anonymous, former employee, nonparticipant, participant, deleted-resource, oversized, MIME-spoofed, and malware-quarantine cases.

#### P1.2 Password and factor resets do not revoke all bypass credentials

**Affected files/functions:** `app/api/admin/employees/[id]/reset-2fa/route.ts`; `app/api/admin/employees/[id]/reset-password/route.ts`; `lib/lounge/trusted-devices.ts`; Lounge session token/version logic.

**Problem:** Resetting TOTP/SMS/passkeys leaves trusted-device tokens valid. A stolen trusted cookie plus a password can continue bypassing newly reset factors for up to 30 days. Password resets also need central session revocation.

**Fix prompt:**

> Make password and 2FA reset operations transactional: clear factors as requested, delete every trusted device, increment an account/session version, revoke outstanding sessions and pre-auth challenges, and create a durable audit event. Require recent administrator reauthentication for factor, role, SSN, and credential operations. Add tests showing old sessions, old trusted cookies, old passkeys, and old pre-auth challenges all fail after reset.

#### P1.3 TruckCheck SSO tokens are not bound to an employee identity

**Affected files/functions:** `lib/truckcheck/auth.ts`; `app/api/lounge/sso/[target]/route.ts`; `app/api/truckcheck/submit/route.ts` attendant resolution.

**Problem:** The 12-hour SSO token contains only a timestamp signed with a shared password. It survives Lounge logout/deactivation and allows the request body to supply the attendant name, so records can be misattributed.

**Fix prompt:**

> Bind TruckCheck SSO tokens to employee ID, active-account/session version, audience, issued-at, nonce, and short expiry; verify all fields server-side and resolve the attendant from the authenticated employee rather than request text. Revoke tokens on logout, deactivation, password/factor reset, and account-version change. Preserve any approved public kiosk flow as a separate explicitly limited mode. Add attribution and revocation tests.

#### P1.4 CAD time parsing and closeout matching can corrupt operational state

**Affected files/functions:** `lib/cad/parser.ts` dispatch regexes, Chicago conversion, status parsing, and closeout identity; `lib/cad/db.ts` closeout fallback.

**Problem:** Parser probes show that AM/PM can be discarded and server-local time is treated as Chicago time. Multiword statuses such as `On Scene` are not fully captured. When closeout identity does not match, the database can close the most recent open call for that date, potentially closing the wrong incident.

**Fix prompt:**

> In an isolated protected-CAD change, retain meridiem in every dispatch regex, convert explicitly with `America/Chicago`, parse full normalized multiword statuses, and quarantine unmatched closeouts instead of closing the latest call. Require a unique event number or an exact validated dispatch identity. Add table-driven tests for AM/PM, CST/CDT, both DST transitions, midnight, `On Scene`, duplicate dispatches, missing event numbers, and ambiguous closeouts. Compare the parser against sanitized real email fixtures before release. Do not change ticker visuals or the 120-minute rule in this patch.

#### P1.5 Failed CAD and weather feeds become false reassuring states

**Affected files/functions:** `components/cad/CallTicker.tsx`; `components/CallVolumeCounter.tsx`; `app/statistics/page.tsx`; `components/Nav.tsx`; `app/weather/WeatherClient.tsx`.

**Problem:** CAD fetch failures can display `In Service`, `No active incidents`, or zero calls. NWS failures can display `No active weather alerts`, and missing ceiling/visibility can contribute to `LIKELY TO ACCEPT FLIGHT`. Unavailable data is not the same as a verified all-clear.

**Fix prompt:**

> Add explicit `loading`, `verified_clear`, `active`, `stale`, and `unavailable` feed states with last-success timestamps. Never derive `In Service`, zero calls, no alerts, or flight acceptance from a failed, incomplete, or stale request. Retain the last verified value only for a bounded interval and label it stale. Preserve the CAD ticker’s current complaint-only public display and existing weather-alert animation. Add failure, timeout, stale, recovery, and partial-input tests.

#### P1.6 Public CMS hero and gallery requests are blocked by the admin proxy

**Affected files/functions:** `components/HeroCarousel.tsx`; `app/gallery/GalleryGrid.tsx`; `app/api/admin/media/route.ts`; `proxy.ts` `/api/admin/*` gate.

**Problem:** Public clients call `/api/admin/media`; the handler’s GET intends to be public, but the proxy returns 401 before it runs. Every visit incurs a failed request and silently falls back to static images.

**Fix prompt:**

> Add a dedicated read-only `/api/public/media` endpoint returning only approved public hero/gallery fields through a minimal DTO and cache policy. Update public components to use it. Keep create/update/delete operations under authenticated admin routes. Add anonymous-read, unpublished-item exclusion, admin-mutation, empty-set, and one-image carousel tests.

#### P1.7 Community source gates are bypassed and sports status is incomplete

**Affected files/functions:** `lib/feature-flags/public-features.ts`; `lib/integrations/sports/public-status.ts`; `lib/community/alerts.ts`; `components/CommunityAlertTicker.tsx`.

**Problem:** Sports, school, and astronomy fetches can publish without consulting the declared verified-provider gates. Cardinals and Blues feeds expose scores but omit normalized inning/half/period/clock fields; CITY has schedule data but no dependable authorized live-score source. Time-derived cleanup can hide a late or extra-inning game before actual completion.

**Fix prompt:**

> Enforce an independent enabled-and-verified gate for every community source, defaulting to no icon when a source is disabled, unverified, stale, or invalid. Extend the normalized sports alert model with `gameStatus`, home/away scores, inning and half for MLB, period and clock for NHL, match half/time only when a dependable authorized soccer feed provides it, `lastUpdatedAt`, and final state. Keep schedule-only CITY data when no reliable live feed exists; never invent a score or timer. Show one logo per team with all same-day events in its branded hover/click panel, begin at 07:00 Chicago, and retain live games through completion plus the approved postgame window. Test doubleheaders, overtime, extra innings, postponements, west-coast games crossing midnight, finals, source failure, and stale data.

#### P1.8 Operational endpoints fail open or permit unauthenticated invalidation

**Affected files/functions:** `app/api/cron/fetch-newsletters/route.ts`; `app/api/revalidate/route.ts`; other cron handlers for comparison.

**Problem:** If `CRON_SECRET` is missing, `Bearer undefined` authenticates the newsletter cron. The global revalidation POST is unauthenticated. Attackers can trigger work or cache invalidation.

**Fix prompt:**

> Require a nonempty configured secret before comparing credentials, use constant-time comparison, accept one documented authentication transport, rate-limit calls, and audit failures without logging secrets. Authenticate `/api/revalidate`, constrain it to an allowlist of paths/tags, and add replay protection. Test absent, empty, wrong, malformed, correct, replayed, and over-limit requests.

#### P1.9 Secondary Lounge message and acknowledgment reads miss object authorization

**Local checkpoint status:** Remediated. Read receipts now include the requesting participant predicate, replies must stay in the same conversation, and targeted acknowledgment reads/writes enforce the intended employee. The new Lounge/Board boundary suite protects these source contracts; a credentialed database integration test remains a release gate.

**Affected files/functions:** `app/api/lounge/messages/[id]/route.ts`; `lib/lounge/messages.ts` read-state and reply hydration; `lib/lounge/acks.ts` targeted acknowledgment queries.

**Problem:** A nonparticipant who knows an object ID can receive participant/read metadata. A reply can reference a message from another conversation and hydrate its author/body preview. Targeted acknowledgment filtering ignores the requesting user in one query path.

**Fix prompt:**

> Add conversation-participant and acknowledgment-target predicates to every primary and secondary read/mutation query. Validate that `replyToId` belongs to the same conversation before insertion, return 404 before loading metadata when unauthorized, and cover participant, nonparticipant, removed participant, cross-thread reply, targeted acknowledgment, and guessed-ID cases with tests.

#### P1.10 Sensitive administrator actions lack strict validation and durable audit guarantees

**Affected files/functions:** `app/api/admin/employees/[id]/route.ts`; employee create/deactivate/reset routes; `app/api/admin/employees/[id]/ssn/route.ts`; `lib/security/audit.ts`.

**Problem:** Some role/profile updates cast raw JSON to TypeScript types without runtime validation. High-risk changes do not consistently record before/after audit events, and SSN disclosure proceeds when its improvised log write fails.

**Fix prompt:**

> Add strict schemas with unknown-field rejection for employee lifecycle operations, centralized authorization, recent step-up authentication, immutable before/after audit records, request IDs, reason fields, and security notifications for role, SSN, password, factor, and deactivation actions. Use a durable audit outbox or fail closed when the highest-risk audit write cannot be guaranteed. Add authorization, invalid-shape, privilege-escalation, audit-failure, and concurrent-update tests.

#### P1.11 Personnel PII and deterministic credential setup are committed in source

**Affected files/functions:** `scripts/lounge-init.mjs`; `scripts/board-dev-logins.mjs`; repository history and CI artifacts.

**Problem:** A tracked initializer contains a real personnel/contact roster and prints predictable credentials. Board development accounts have deterministic fallback passwords, and runtime auth does not categorically reject `is_dev_login` in production.

**Fix prompt:**

> Move personnel migration data to a controlled, encrypted, access-logged HR input outside source control. Remove the roster and deterministic credentials from current source and, through an approved history-rewrite/incident process, from repository history and cached artifacts. Rotate affected credentials. Make production Board authentication reject `is_dev_login` unconditionally and add a deployment assertion that no active dev account exists. Preserve anonymized fixtures for tests.

#### P1.12 Mutation protection is inconsistent across the API surface

**Local checkpoint status:** Partially remediated. Every Lounge and Board browser mutation now passes the centralized same-origin guard. Admin, inventory, onboarding, public-form, webhook, and scheduled-job routes still require the broader route-family classification and migration described below.

**Affected files/functions:** 149 of 186 files under `app/api` that export `POST`, `PUT`, `PATCH`, or `DELETE` but contain no explicit same-origin/CSRF check; `lib/security/http.ts`; authenticated Board, Lounge, admin, upload, maintenance, onboarding, and policy routes.

**Problem:** SameSite cookies reduce risk but are not a complete, consistently reviewed mutation boundary. Some routes use `isSameOriginRequest` or double-submit CSRF correctly while many neighboring routes do not.

**Fix prompt:**

> Inventory every mutating API route and classify it as browser-cookie, bearer/cron, webhook, or public form. Create one shared browser-mutation guard that enforces method, same-origin, content type/length, authentication, optional CSRF scope, and no-store errors. Apply it domain by domain without altering CAD scheduler or webhook authentication. Add a route-matrix test that fails when a new mutation lacks an explicit approved guard. Document exceptions with owner and rationale.

#### P1.13 Localhost service-worker registration serves a stale, partially broken site

**Affected files/functions:** `components/PwaRegistration.tsx`; `public/sw.js`; service-worker cache names and offline routing.

**Problem:** Development registers the production worker. When the dev server stops, stale cached HTML remains while uncached Next chunks, optimized images, fonts, and APIs fail. This produced the observed broken localhost page and can mislead testing.

**Fix prompt:**

> In nonproduction or on loopback hosts, do not register `/sw.js`; unregister only Millstadt-owned workers and delete only caches whose names begin with the Millstadt public-cache prefix. Preserve production offline support. Version production caches by build revision, avoid caching authenticated/API content, and test first visit, update, server restart, offline reload, recovery, and unrelated-cache preservation.

#### P1.14 Contact submissions can report success without durable storage

**Affected files/functions:** `app/api/contact/route.ts` database and email branches.

**Problem:** If database storage fails but notification email succeeds, the endpoint returns success even though the email intentionally omits requester details. The organization receives no usable submission while the visitor believes it was saved.

**Fix prompt:**

> Make protected database persistence the required success boundary for contact submissions, matching the employment application pattern. Return a retryable failure when storage fails, and send email/Lounge notifications only after a durable submission ID exists using an outbox or retry record. Preserve PII omission from ordinary email. Add database-failure, email-failure, duplicate-submit, notification-retry, and success tests.

#### P1.15 Financial prototype identity and state are unsafe for production activation

**Affected files/functions:** `app/api/financials/access-requests/me/route.ts`; `app/api/financials/viewer-sessions/route.ts`; `lib/financials-hub/dev-store.ts`; `lib/financials-hub/accuracy-store.ts`; `lib/financials-hub/config.ts`.

**Problem:** A caller-supplied header/body user ID acts as identity, while request/session/audit/document state lives in process memory. Restarts or multiple instances lose/diverge records. Production correctly fails closed today.

**Fix prompt:**

> Keep Financial & Information Transparency under construction and production-disabled. Before activation, bind identity to a real authenticated session, move requests, approvals, agreements, audits, documents, idempotency, and rate limits to durable storage, use private files, and test restart/multi-instance behavior, role separation, revocation, replay, and audit export. Preserve the current single compact public entry point and do not publish unfinished financial documents.

#### P1.16 Geography retention exceeds its declared configured lifetime

**Affected files/functions:** `lib/analytics/config.ts`; `lib/analytics/store.ts` event schema and `pruneExpiredAnalytics`; `ANALYTICS_DATA_GOVERNANCE.md`.

**Problem:** Country/region/city are columns on event rows deleted by `eventDays`; `geographyDays` does not null those columns. When geography retention is shorter, data remains longer than the governance document states.

**Fix prompt:**

> Add an independent geography cutoff that nulls event geography fields at `geographyDays` while retaining non-geographic event data until `eventDays`. Run pruning durably on a schedule rather than probabilistically only during traffic, and verify database backups follow the declared retention. Add boundary, disabled, zero-day, shorter-than-event, longer-than-event, and idempotent-prune tests before enabling optional analytics.

#### P1.17 Board portal lacks strong MFA and can admit development identities in production

**Local checkpoint status:** Partially remediated. Production Board login and session verification now reject development identities. Strong MFA, server-side idle plus absolute expiry, account-version revocation, and a production database inventory remain required.

**Affected files/functions:** `lib/board/auth.ts`; `lib/board/db.ts`; `scripts/board-dev-logins.mjs`; Board login/session routes.

**Problem:** Password-only Board access protects highly sensitive financial and governance material. Sessions are described as inactivity-based but use a fixed issued timestamp, and `is_dev_login` is not rejected by production auth. Exploitability of development accounts depends on deployed database state.

**Fix prompt:**

> Add phishing-resistant passkey or TOTP MFA for Board users, recent reauthentication for workbook/role/signature actions, server-side idle plus absolute session expiry, account/session version revocation, and a hard production rejection of development accounts. Inventory the production database for dev identities before release. Add MFA enrollment/recovery, idle expiry, absolute expiry, reset revocation, and dev-account denial tests.

### P2 - Compounding Technical Debt, Refactors, and Pattern Inconsistency

#### P2.1 Public CAD endpoints overexpose internal fields

**Affected files/functions:** `app/api/cad/latest/route.ts`; `app/api/cad/log/route.ts`; `lib/cad/db.ts` `Call` model.

**Problem:** The public DTO removes only edit fields and can expose Gmail message IDs, event numbers, unit/agency/disposition metadata, and other fields unused by the public components.

**Fix prompt:**

> Define explicit public CAD DTOs per endpoint containing only fields rendered by the ticker/statistics experience. Map fields by allowlist rather than object rest, add response-schema tests that forbid Gmail IDs, internal event IDs, notes, editor fields, and operational-only details, and verify existing public numbers and complaint display remain unchanged.

#### P2.2 Statistics make redundant full-log requests and overfetch individual calls

**Affected files/functions:** `components/CallVolumeCounter.tsx`; `components/CallStatsExtras.tsx`; `components/TopCallCategories.tsx`; `components/PublicStatsSummary.tsx`; `app/statistics/page.tsx`; `/api/cad/log`; `/api/cad/stats`.

**Problem:** The homepage polls several overlapping endpoints every 45-60 seconds. Some download complete current-year call arrays only to count them, while `/api/cad/stats` returns aggregate and individual data together.

**Fix prompt:**

> Preserve every displayed statistic but split aggregate public DTOs from detailed protected data, compute counts/grouping in SQL, add appropriate date/category indexes, cache aggregates briefly, and use one shared client cache/revalidation interval per dataset. Add equivalence tests against sanitized fixtures and measure payload size/query count before and after.

#### P2.3 Analytics loses SPA dwell time and lacks privacy-safe click coverage

**Affected files/functions:** `components/analytics/AnalyticsTracker.tsx`; `lib/analytics/types.ts`; `lib/analytics/validation.ts`.

**Problem:** Client navigation resets the active path without flushing the previous route, so dwell time is lost. Click collection exists only for a few explicit financial markers and cannot support the requested sitewide click report.

**Fix prompt:**

> Flush the previous route before pathname state changes, count only visible active time, cap and bucket durations, and prevent duplicate `pagehide` sends. Add a small allowlist of semantic CTA IDs to explicitly approved public controls; never collect arbitrary element text, DOM paths, query strings, restricted-document actions, or sensitive URLs. Test SPA navigation, tab visibility, back/forward, pagehide, consent withdrawal, and duplicate events.

#### P2.4 AI analytics input must be isolated from identified admin data

**Affected files/functions:** `app/api/admin/analytics/summary/route.ts`; `lib/analytics/financial-workflows.ts`; proposed weekly reporting endpoint.

**Problem:** The existing admin summary can include identified workflows, preservation holds, names, emails, document IDs, and admin IDs. Passing it directly to a model would create an avoidable PII path.

**Fix prompt:**

> Create a separate authenticated read-only weekly aggregate endpoint that emits only closed-week counts, semantic CTA counts, visible-time buckets, coarse referrer categories, and country/region cohorts meeting the configured minimum group size. Exclude raw events, city, IP, user agent, hashes, consent IDs, document IDs, financial workflows, preservation holds, and security events. Label all results as consenting traffic and include data-completeness/staleness fields. Add snapshot tests proving forbidden fields cannot appear.

#### P2.5 Weather code is duplicated and the toolbar scope is mislabeled

**Affected files/functions:** `components/Nav.tsx`; `components/WeatherAlertBar.tsx`; `app/weather/WeatherClient.tsx`; NWS client fetching.

**Problem:** Multiple components independently fetch and interpret NWS data with different error behavior. The toolbar queries St. Clair County but labels a clear result as Millstadt-specific. The green check mark is unwanted.

**Fix prompt:**

> Build one server-side NWS adapter with timeout, schema validation, freshness, and normalized active/verified-clear/stale/unavailable states. Reuse it in the toolbar and weather page. Query the Millstadt point when point-specific language is used, otherwise label it St. Clair County. Remove the green check mark next to the clear message without changing active-alert animation. Add no-alert, multiple-alert rotation, county-versus-point, timeout, malformed, stale, and recovery tests.

#### P2.6 Community alerts can expire late, shift all-day dates, or crowd the toolbar

**Affected files/functions:** `app/api/public/community-alerts/route.ts`; `lib/community/alerts.ts`; `components/CommunityAlertTicker.tsx`; `components/Nav.tsx` alert columns.

**Problem:** `stale-while-revalidate` can keep expired notices, the client does not locally prune `endsAt`, date-only calendar values can shift one Chicago day under UTC, and up to 40 fixed-width alert groups can overlap at tablet widths.

**Fix prompt:**

> Remove stale serving for time-critical active alerts or bound it below the display-expiry tolerance, prune `endsAt` client-side, preserve date-only calendar semantics using Chicago-local day boundaries, and cap visible groups with an accessible overflow control. Keep desktop-only event logos and alternate placement from the EMS/Lounge sides as approved. Test 0/1/many alerts at 768, 1024, and 1440 pixels, all-day dates, DST, expiry during hover, and provider failure.

#### P2.7 Incident deletion leaves related private artifacts and records behind

**Affected files/functions:** `app/api/lounge/incidents/[id]/route.ts`; `lib/lounge/incidents.ts`; `app/api/lounge/incidents/route.ts`; `app/api/lounge/incidents/blob/route.ts`.

**Problem:** Deleting an incident removes only the main row while photos, generated PDF, and linked personnel records can remain. Whether deletion means erasure or retention is not documented.

**Fix prompt:**

> Define an approved incident retention policy distinguishing soft deletion, legal hold, and erasure. Record every derived artifact ID, make soft-deleted resources inaccessible immediately, and use an audited transaction plus durable cleanup job for authorized erasure. Add tests for attachments, PDF, personnel links, legal hold, cleanup retry, and authorization. Do not delete live data until the policy owner approves.

#### P2.8 Signature endpoints accept unbounded data URLs

**Affected files/functions:** `app/api/lounge/acks/[id]/ack/route.ts`; `app/api/board/meetings/minutes/finalize/route.ts`; PDF generators.

**Problem:** Authenticated callers can submit arbitrarily large `data:image/` strings that are stored and rendered into PDFs, causing memory, database, and CPU pressure.

**Fix prompt:**

> Enforce request-body and decoded-image limits, validate PNG/JPEG magic bytes, reject SVG and malformed data URLs, normalize dimensions, and store signatures as private objects referenced by ID. Rate-limit signing and make signatures immutable after finalization except through an audited correction workflow. Add oversized, decompression-bomb, spoofed MIME, malformed, duplicate, and valid-signature tests.

#### P2.9 Production email delivery is opt-out rather than explicitly enabled

**Affected files/functions:** `lib/reports/gmail-message.ts` `outboundEmailAllowed` and shared sender; report workflows.

**Problem:** Any production-classified runtime with Gmail credentials can send unless explicitly disabled. That is risky for sensitive reports and accidental production-like environments.

**Fix prompt:**

> Require an explicit production delivery flag plus per-workflow recipient allowlists. Keep preview/test delivery disabled by default, log only message IDs and workflow metadata, and never log body/attachments. Add tests for absent flag, wrong environment, unapproved recipient, approved recipient, and dry-run rendering.

#### P2.10 Runtime code performs schema DDL and some throttles are instance-local

**Affected files/functions:** `lib/analytics/store.ts`; `lib/analytics/http.ts`; multiple `ensure*Schema` functions throughout `lib`; `lib/security/rate-limit.ts` for the preferred pattern.

**Problem:** Cold requests create/alter tables and indexes, requiring broad runtime database privileges and adding latency/race risk. Analytics throttling uses an instance-local map, which resets and splits across serverless instances.

**Fix prompt:**

> Move schema creation and alteration into versioned, idempotent deployment migrations with a migration ledger and restricted runtime DB role. Replace optional analytics memory throttling with the shared durable rate limiter. Add migration-from-clean, migration-from-current, concurrent-migration, rollback/restore, and distributed-limit tests.

#### P2.11 Hero carousel swaps data after mount, leaks timers, and ignores reduced motion

**Affected files/functions:** `components/HeroCarousel.tsx` media fetch and scheduling.

**Problem:** The blocked CMS request causes a post-mount fallback path, pending timeouts are not all cleared, and auto-rotation/transitions ignore `prefers-reduced-motion`. A one-image managed result can also violate the initial two-slot assumption.

**Fix prompt:**

> After adding the public media endpoint, normalize 0/1/many images before setting carousel state, retain and clear every interval/timeout, pause when hidden, and show a stable first image for reduced-motion users. Keep the existing photo roulette for other visitors. Add unmount, one-image, fetch-failure, visibility, and reduced-motion tests.

#### P2.12 Navigation, gallery, and page landmarks have accessibility defects

**Affected files/functions:** `components/Nav.tsx`; `components/SiteShell.tsx`; pages that render their own `<main>`; `app/gallery/GalleryGrid.tsx`.

**Problem:** Visually closed navigation remains keyboard-focusable, several routes nest `<main>` inside the shell’s `<main>`, and gallery tiles/lightbox lack button/dialog semantics and focus management.

**Fix prompt:**

> Make closed navigation unmounted or `inert`, move focus to the first item on open and back to the trigger on close, retain only one main landmark per page, convert gallery tiles to semantic buttons, and implement an accessible modal dialog with label, focus trap, Escape close, and focus restoration. Add keyboard-only and automated accessibility tests on desktop and mobile.

#### P2.13 Bulletin and monthly document fetches can show endless or stale results

**Affected files/functions:** `app/bulletin/page.tsx`; `app/commercial-club/page.tsx`; `app/senior-center/page.tsx`.

**Problem:** Bulletin lacks complete `response.ok`, catch, and finally handling, while month changes can retain the previous month’s data after a failed later request.

**Fix prompt:**

> Use one shared abortable document-fetch state with explicit loading, success, verified-empty, error, and retry states. Clear month-keyed data when the key changes, ignore superseded responses, and never present prior-month content as current. Add failed fetch, non-OK, rapid month switch, abort, retry, and empty tests.

#### P2.14 Badge print layout is clipped and includes site chrome

**Affected files/functions:** `app/kids-club/badge/[slug]/page.tsx`; global print styles; `components/SiteShell.tsx`.

**Problem:** A fixed 8.5-inch article is clipped on small screens, and print rules do not consistently hide Nav/Footer or remove shell padding.

**Fix prompt:**

> Add a responsive on-screen badge preview, a clear Print icon button, and scoped print rules that hide site chrome, reset shell dimensions, and produce the intended paper size and margins. Verify print preview, PDF output, iPhone-width screen, long names, and invalid badge slugs.

#### P2.15 Footer remains oversized and its collapsed control is too small

**Affected files/functions:** `components/Footer.tsx`; mobile Nav stacking and page-bottom spacing.

**Problem:** The expanded footer uses excessive vertical space and many link columns for limited content. Its collapsed 14-pixel control is not a usable touch target, and fixed positioning can conflict with mobile navigation.

**Fix prompt:**

> Redesign `components/Footer.tsx` as a genuinely compact two-row/two-zone footer with fewer link groups while preserving every destination, address, email, privacy control, version, and build number. Use a familiar icon with tooltip for expansion, a minimum 44-pixel interactive target, normal-flow behavior on mobile, and correct offsets so it never overlaps the Serenity Prayer, ambulance art, or mobile navigation. Verify desktop/mobile screenshots, keyboard, touch, reduced motion, and longest link labels.

#### P2.16 Lint is not a reliable quality gate and CI is absent

**Affected files/functions:** repository-wide ESLint output; `package.json`; missing `.github/workflows`; current test scripts.

**Problem:** Lint fails with 124 findings, and there is no checked-in CI workflow to run typecheck, tests, dependency review, or protected-invariant checks on every change. Existing security tests pass while missing the most serious MFA/public-file/CAD-auth defects.

**Fix prompt:**

> Establish a reviewed baseline, then fix lint by rule and domain without disabling rules globally or rewriting protected behavior. Add CI with least-privilege permissions to run typecheck, lint, protected invariants, security, reports, public experience, financial integration with fixtures, dependency audit, and targeted security regression tests. Block merge on new errors and on changes to protected CAD/ticker files unless their focused tests pass. Do not give CI production database, Blob, Gmail, Twilio, CAD, or deployment credentials.

#### P2.17 Security headers are split and internally inconsistent

**Affected files/functions:** `next.config.ts` headers; `proxy.ts` headers and CSP.

**Problem:** Header policy is defined in two locations, including conflicting `X-Frame-Options` values. CSP permits broad inline styles/scripts, and behavior differs depending on proxy matching.

**Fix prompt:**

> Consolidate security headers into one documented policy with route-specific exceptions only where proven necessary. Use a nonce-compatible CSP rollout in report-only mode first, reconcile frame policy, preserve required maps/PDF/WebAuthn functionality, and add header snapshot tests for public, admin, Lounge, Board, API, and static-asset routes. Promote enforcement only after violation review.

### P3 - Polish, Consistency, and Developer Experience

#### P3.1 Large components and stores obscure ownership boundaries

**Affected files/functions:** `app/financials-information-hub/FinancialsArchivePrototype.tsx` (about 2,150 lines); `components/lounge/MessengerClient.tsx` (about 1,945); `components/lounge/LoungeShell.tsx` (about 1,565); `components/lounge/Wall.tsx` (about 1,466); `app/truckcheck/TruckCheckForm.tsx` (about 1,322); `lib/financials-hub/dev-store.ts` (about 1,289).

**Problem:** UI, network, state, validation, and formatting responsibilities are interleaved, increasing regression risk and re-render cost.

**Fix prompt:**

> Refactor one large module at a time around existing domain boundaries: pure schema/types, server/data adapter, focused hooks, presentation components, and mutation commands. Preserve DOM behavior and API contracts with characterization tests before extraction. Do not create generic abstractions unless at least two real call sites benefit.

#### P3.2 Handwritten Tailwind fallback utilities duplicate the build system

**Affected files/functions:** `app/globals.css` utility block around line 273; `app/kids-club/layout.tsx` duplicated spacing fallback.

**Problem:** Hundreds of manually recreated utility rules increase CSS size and can diverge from Tailwind’s generated behavior.

**Fix prompt:**

> Capture desktop/mobile visual baselines, prove the current Tailwind build emits every used utility, then remove the handwritten fallback block and Kids Club duplicate incrementally. Compare computed styles and screenshots for home, Kids Club, Lounge login, statistics, and financial under-construction pages.

#### P3.3 Serenity Prayer image is eagerly loaded below the fold

**Affected files/functions:** `components/SerenityPrayer.tsx` image loading.

**Problem:** The approximately 1.4 MB prayer art is below the fold but marked eager, competing with first-viewport hero resources.

**Fix prompt:**

> Keep the current transparent Star of Life, cursive prayer, blue-page blend, and `In God We Trust` layout unchanged, but lazy-load the below-fold image with stable width/aspect-ratio placeholders. Verify no crop, text readability, layout shift, or background-color seam on desktop and mobile.

#### P3.4 Dependency classification and naming need cleanup

**Affected files/functions:** `package.json` name and dependency groups.

**Problem:** The package is named `millstadt-tmp`, and several `@types/*` packages are runtime dependencies instead of development dependencies.

**Fix prompt:**

> Rename the private package to a stable Millstadt EMS identifier without changing deployment identity, move type-only packages to `devDependencies`, refresh the lockfile, and run build, typecheck, tests, and a networked dependency audit. Do not upgrade major runtime dependencies in the same change.

#### P3.5 Route and scheduler documentation has drifted from reality

**Affected files/functions:** `app/api/cad/poll/route.ts` header comment; `vercel.json`; operations documentation for cron-job.org.

**Problem:** The source claims Vercel five-minute scheduling while the owner uses cron-job.org. Future maintainers may “fix” the wrong scheduler or break the free working arrangement.

**Fix prompt:**

> Document cron-job.org as the authoritative CAD trigger, including owner, cadence, authentication transport, timeout, retry behavior, monitoring, and secret-rotation runbook. Remove inaccurate Vercel-schedule comments while keeping the route behavior unchanged. Add a synthetic scheduler health check that never exposes operational call data.

#### P3.6 Error handling and naming patterns vary across neighboring features

**Affected files/functions:** public document pages, community fetchers, weather clients, report/email workflows, Board/Lounge mutation handlers.

**Problem:** Similar operations use different loading, stale, error, validation, and audit patterns, making UX and security behavior difficult to predict.

**Fix prompt:**

> Define small domain-level conventions for fetch state, mutation guards, validation errors, audit events, and background side effects. Migrate neighboring features in small batches with behavior tests. Keep public wording plain and operational; do not introduce explanatory marketing panels or new pages.

## 3. Quick Wins

These are low-risk only after the P0 branch is protected and the affected screens have characterization tests.

1. Remove the green check glyph from the verified-clear weather toolbar text while preserving state and animation.
2. Move public hero/gallery reads from `/api/admin/media` to a dedicated read-only endpoint.
3. Fail closed when `CRON_SECRET` is absent and authenticate `/api/revalidate`.
4. Disable/unregister the Millstadt service worker on localhost while preserving production PWA behavior.
5. Make contact-form success depend on durable database storage.
6. Add size/content limits to signature endpoints.
7. Remove the 25 lint-confirmed unused bindings listed below.
8. Change the Serenity image from eager to lazy with a stable aspect ratio.
9. Correct CAD poll comments to name cron-job.org without changing the protected route behavior.
10. Add `typecheck` and a non-networked test aggregate script to `package.json`.

**Batch fix prompt:**

> Apply only the audit’s Quick Wins on a new local checkpoint. Preserve the CAD ticker, all statistics, homepage photography, Serenity Prayer artwork/font/background, Lounge, weather active-alert animation, sports layout, Kids Club logo, and financial production gate. Add or update focused tests for each change, run typecheck/lint/scoped suites, capture desktop and mobile screenshots, show the diff for review, and do not commit, push, deploy, delete live data, or change cron-job.org.

## 4. Redundancy Removal Log

The following current bindings are confirmed unused by ESLint and can be deleted or simplified without changing intended behavior. Re-run lint and focused tests after the batch.

- `app/admin/calls/page.tsx:179` - delete unused `startEdit`.
- `app/admin/forms/page.tsx:110` - delete unused `bulkOnly`.
- `app/admin/inventory-settings/page.tsx:65` - remove unused `res` binding while preserving response handling.
- `app/admin/media/page.tsx:64` - delete unused `inp`.
- `app/admin/onboarding/page.tsx:17` - delete unused `FinalOutcome` type/import.
- `app/admin/submissions/page.tsx:60` - delete unused `statusCounts` or render it if it is an omitted requirement; deletion is the current-code cleanup.
- `app/admin/volunteers/page.tsx:218` - remove unused callback index `i`.
- `app/api/bulletin/route.ts:1` - delete unused `NextRequest` import.
- `app/api/bulletin/route.ts:2` - delete unused `createBulletinPost` import.
- `app/api/cad/latest/route.ts:15` - replace unused `_e`/`_a` rest destructuring with the explicit public DTO required by P2.1.
- `app/api/cad/log/route.ts:15` - replace unused `_e`/`_a` rest destructuring with the explicit public DTO required by P2.1.
- `app/api/lounge/forms/route.ts:56` - remove unused `_req` parameter if the framework signature permits it.
- `app/contact/page.tsx:3` - delete unused `Link` import.
- `app/medical-control/page.tsx:3` - delete unused `Link` import.
- `app/truckcheck/TruckCheckForm.tsx:6` - delete unused `TirePosition` import/type.
- `app/truckcheck/TruckCheckForm.tsx:754` - delete unused `tooHot` calculation after confirming no intended warning was omitted.
- `components/CallStatsExtras.tsx:695` - delete unused `PerMonthTable` component after visual confirmation it is not an accidentally disconnected requirement.
- `components/cad/CallTicker.tsx:98` - delete unused `natureColor` only through the protected ticker checkpoint.
- `components/lounge/MyCertsClient.tsx:3` - delete unused `Link` import.
- `components/lounge/MyCertsClient.tsx:382` - delete unused `backLinkStyle`.
- `components/lounge/MyCertsClient.tsx:390` - delete unused `titleStyle`.
- `lib/lounge/games/lead-ii/ecg/coronaryTerritory.ts:528` - delete unused `V5` binding after ECG fixture tests.
- `scripts/seed-state.mjs:1` - delete unused `createRequire` import.
- `app/globals.css` and `app/kids-club/layout.tsx` - delete duplicated fallback utility CSS only after P3.2 visual verification.
- `scripts/lounge-init.mjs` real roster and credential-printing blocks - remove from source through the approved P1.11 migration/incident process, not as an ordinary cleanup commit.
- `public/board/referendum/current.xlsx` and `current.json` - remove only after the P0.3 private-storage migration, backup, authorization tests, and exposure response are complete.

No whole file beyond the two migrated public Board artifacts is safe to delete outright from static evidence alone. Several large components should be split, not deleted.

## 5. Low-Cost OpenAI Monitoring Recommendation

### Nightly Security and Bug Review at 23:59 America/Chicago

Use a separate, read-only GitHub Actions workflow and separate OpenAI project. GitHub OIDC can exchange an Actions token for a short-lived OpenAI access token, avoiding a long-lived API key in repository secrets; the workflow needs only `contents: read` and `id-token: write` ([official OpenAI WIF documentation](https://developers.openai.com/api/docs/guides/workload-identity-federation/github-actions)). Give the OpenAI service account only model-request permission and no production database, Vercel, Blob, Gmail, Twilio, CAD, analytics, repository-write, PR, or deployment credential.

Run deterministic checks first: typecheck, lint delta, protected invariants, security tests, public-experience tests, financial fixture tests, dependency audit, secret scan, and changed-file classification. Send the model only sanitized tracked text changes plus deterministic findings; exclude `.env*`, logs, uploads, binaries, CAD audio/transcripts, incident/personnel data, analytics rows, and financial workbooks. Treat repository content as untrusted prompt data, give the model no tools, require strict JSON output, validate every returned file/line, permit one retry, save a private 14-day artifact, and **never** execute the model output or create a commit, issue, PR, deployment, or production mutation.

Use the Responses API with `store: false` and a cost-sensitive model such as `gpt-5.6-luna`, initially at low reasoning. Official documentation lists Luna at $0.20 per million input tokens and $1.20 per million output tokens with Structured Outputs support ([official model page](https://developers.openai.com/api/docs/models/gpt-5.6-luna)). A ceiling of 50,000 input and 1,500 output tokens is approximately **$0.0118 per run**, about **$0.36 per 30-day month** before retries; one retry every night would remain about **$0.71/month** at current standard pricing. Configure a separate project budget alert/hard operating cap around $5/month and a client-side token/request ceiling. Pricing and availability can change, so calculate from the current model page during setup.

OpenAI states that API data is not used to train models unless the customer opts in, but default abuse-monitoring logs may be retained up to 30 days and Responses application state is retained by default unless storage controls are used ([official data-controls documentation](https://developers.openai.com/api/docs/guides/your-data)). Therefore, `store: false` is necessary but not a reason to send PII, secrets, or operational records. Ask OpenAI about Modified Abuse Monitoring or Zero Data Retention only if organizational requirements justify it.

Schedule in the Chicago timezone if the workflow platform supports IANA timezones. Otherwise schedule both possible UTC minutes for CST/CDT and gate execution in code on Chicago local time plus a durable `YYYY-MM-DD` idempotency key. Scheduled automation is best effort, so report delayed/missed runs instead of silently backfilling with production access.

### Weekly Privacy-Safe Analytics Report

Do not use the current broad admin summary. After fixing P1.16, P2.3, and P2.4 and receiving privacy/legal approval, run Monday morning against a dedicated closed-week aggregate endpoint. The report should cover page-view totals, approved semantic CTA clicks, visible-time dwell buckets, coarse referrer categories, and country/region cohorts of at least 15 consenting observations. It must exclude city, IP, user agent, browser/session hashes, consent IDs, raw events, document IDs/actions, security events, preservation holds, financial workflows, CAD data, and employee/board activity.

Label the report **consenting traffic**, show completeness and staleness, and never imply it represents all visitors. Use the same no-tools/strict-schema/human-review boundary. At 5,000 input and 800 output tokens on Luna, one standard-price report is approximately **$0.00196**, or less than one cent per month for weekly runs. A separate $1/month project cap is ample. Reporting failure must never affect website traffic collection or production behavior.

Recommended rollout:

1. Deterministic nightly checks only.
2. Two weeks of AI shadow reports with no external actions.
3. Synthetic analytics and retention verification.
4. Consented aggregate reporting after owner/privacy approval.

## 6. Fifth-Grader Version

The website still works online, and nothing from this audit was pushed. But some locked rooms have bad locks: one employee login path can get around the second password step, some first passwords are too easy to guess, and some board money files are sitting where anyone with the address could read them. The ambulance call checker also trusts a label that a stranger could fake, and the truck-check form can say “saved” when saving failed.

We should fix those five things first. Then we should make private pictures and documents truly private, make broken weather/call feeds say “unavailable” instead of “all clear,” and keep sports scores only when a trustworthy source really provides them. After that, we can make the footer smaller, remove the weather check mark, improve the phone and keyboard experience, and clean up repeated code. Every change should be small, tested, shown on the local site, and approved before anything goes live.

The nightly AI idea should be like a smoke detector, not a robot mechanic. It can read safe code changes and test results, write a private report, and cost well under a few dollars per month. It must never see private records, change code, or publish the website by itself.

## 7. Master Execution Prompt

> Work in the Millstadt EMS repository on a new `codex/` branch created from the current reviewed local state. Read `docs/COMPREHENSIVE_CODEBASE_AUDIT_2026-08-17.md` completely. Implement approved items in priority order through small checkpoints: P0.1 Lounge MFA challenge separation; P0.2 random bootstrap credentials and central forced-change enforcement; P0.3 private Board/draft financial storage migration; P0.5 transactional TruckCheck durability; then approved non-CAD P1 items; then P2/P3 and Quick Wins. P0.4, P1.4, the CAD portion of P1.5, and any other CAD/ticker recommendation require a separate explicit owner-approved CAD-only project and must not be implemented in this pass. Before each checkpoint, add characterization tests for current intended behavior. After each checkpoint, run focused tests, typecheck, lint for touched files, and review the diff before continuing.
>
> Hard preservation rules: keep the existing CAD ticker complaint display, statistics and historical numbers, `ACTIVE_MINUTES = 120`, homepage photography/carousel, Serenity Prayer with transparent Star of Life and cursive text, `In God We Trust`, Lounge behavior, Kids Club logo, desktop event-logo concept, weather active-alert animation, military-time baseline, and every approved API/automation. Keep Financial & Information Transparency under construction and production-disabled. Keep cron-job.org as the CAD scheduler. Do not invent weather, alerts, schedules, scores, periods, innings, clocks, astronomy, school, or flag events; unreliable data is hidden or labeled unavailable. Do not create new public pages for toolbar events. Do not introduce marketing copy, oversized cards, generic AI phrasing, or broad redesigns.
>
> Security rules: never expose secrets or PII; migrate public internal files to private storage with authenticated proxies; use strict runtime schemas; central same-origin/CSRF guards; durable rate limits, audit, idempotency, and outboxes; explicit unavailable/stale states; least-privilege CI; and human approval for security findings or analytics recommendations. The OpenAI nightly/weekly monitors are read-only report generators with OIDC, separate budgets, sanitized aggregate inputs, `store:false`, strict JSON, no tools, no repository writes, no production credentials, and no auto-fixes.
>
> Verification rules: personally inspect the real local dev site in the browser at desktop and mobile sizes once a server can bind. Verify hero images, photo rotation, prayer art/font/background, Lounge, Kids Club logo, CAD ticker, all statistics, weather clear/active/unavailable states, one-logo-per-team sports panels with reliable live/final scores when available, event expiry, compact footer, keyboard navigation, console errors, network failures, offline/update behavior, and financial under-construction boundaries. Run build, typecheck, full lint, protected/security/report/public/financial tests, dependency audit, and targeted P0 regression tests. Produce a final evidence table and diff summary. Do **not** commit, push, deploy, delete live data, rotate production credentials, or modify external cron configuration until the owner explicitly approves the verified final state.

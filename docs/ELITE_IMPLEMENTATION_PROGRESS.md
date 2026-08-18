# Millstadt EMS Elite Implementation Progress

## Baseline

- Original master-prompt reference: `52eb73eedf86e90c19e332c503e20e3cc9b02899`
- Elite implementation baseline: `d4270d9f922fa79b81094a68ef0f91c7989d7fb6`
- Historical elite implementation branch: `feat/elite-master-implementation`
- Current isolated audit/hardening branch: `codex/truckcheck-p0-5`
- Current audit/hardening baseline: `0bd73e3e2be7a565138367c48a26eeca7580e957`
- Parent development branch: `feat/millstadt-ems-information-hub-request-approval-dev-only`
- GitHub tracker: issue `#13`
- Deployment policy: preview/development only unless the owner separately requests production.

The owner separately directed production promotions on August 17, 2026. The current
verified production deployment is `dpl_HCgWxmDjEyPfLST6PUzgh3TDXwCh`, build
`83a8477c`, at `https://www.millstadtems.org/`. Remaining master work continues on
the isolated development branch.

## Protected Areas

These values were recorded at elite baseline `d4270d9`:

| Area | Baseline invariant |
| --- | --- |
| CAD polling | `app/api/cad/poll/route.ts` SHA-256 `fa5918fb0bf2f46ac5c58beecbea5c9220b749c0c1c19598f4215a0c86fed63c` |
| Public ticker | `components/cad/CallTicker.tsx` SHA-256 `119b2cd80079463b0cf0ac07f2a1d70272908c3ee084a9a9ddf9dc21e06e5756` |
| Ticker duration | `ACTIVE_MINUTES = 120` |
| Homepage Financial & Information Transparency hero entry | SHA-256 `c15289197f67515f61120ff6981c7ca61ce358ba8ba526efb41f4df0665c7e85` |
| Navigation Financial & Information Transparency entry | SHA-256 `9ea8eeda7eca6c5a3aa03bf2f201d5db0b440b1209bbad2d87b0ed17db1c138c` |

Run `npm run test:elite-protected` before every checkpoint commit.

On August 17, 2026, the owner explicitly retired the second, wide homepage
Financial Information feature entry. Later that day, the owner renamed the remaining
entry to Financial & Information Transparency. The protected homepage invariant now
requires exactly one entry: the compact button in the hero. Production Financials
remains Coming Soon, and all public financial APIs remain disabled.

## Completed Checkpoints

### Phase 1: Serenity Prayer Homepage Finish

- Status: complete and verified in production at the owner's direction.
- Commits: `985a360`, `d4270d9`
- Files: `app/page.tsx`, `components/SerenityPrayer.tsx`, transparent PNG asset.
- Behavior: homepage-only closing section after Support/Donate and before the footer;
  cursive prayer; transparent, fully contained Star of Life/cross; eager image load;
  desktop and mobile sizing; no animation or controls.
- Verification: targeted ESLint, TypeScript, full Next.js build, desktop/mobile browser
  screenshots, console review, live production DOM and image check.
- Preview: `https://millstadt-g6qrkrvx8-kennethjames-7371s-projects.vercel.app`
- Production deployment explicitly requested by owner:
  `https://millstadt-5pg3wox6m-kennethjames-7371s-projects.vercel.app`
- Revert: `git revert d4270d9`, then `git revert 985a360`.

### Phase 5: Header-Only Community Monitors

- Status: complete to the authorized schedule-only scope and verified in production.
- Commits: `bca6d31`, `eef9052`, `83a8477`.
- Owner-directed presentation: no new public dashboard or permanent team buttons.
  `/community/today` redirects home. Verified items appear only in the existing top
  bar when they apply that day.
- One logo represents each brand, including doubleheaders or multiple same-brand
  events. Distinct brands alternate from the EMS and Lounge sides while retaining a
  consistent full-size treatment. Event logos are desktop-only; phone navigation is
  unchanged and remains reserved for weather warnings and existing controls.
- Hover, keyboard focus, and click/tap expose source-attributed details. Times use
  military time first with a 12-hour value in parentheses.
- Connected sources: official MLB Cardinals schedule, official NHL Blues schedule,
  official CITY SC calendar, Millstadt EMS public calendar, St. James official
  calendar, Millstadt CCSD official athletics feed, Belleville West official
  athletics feed, and a local solar-eclipse calculation.
- Visibility starts at 07:00 America/Chicago. Normal game-day display ends at local
  midnight; late games use the documented two-hour carryover rule. Same-brand events
  are deduplicated into one logo.
- Weather failures remain silent rather than displaying an inaccurate unavailable
  banner. Multiple real warnings rotate one at a time, with the complete list
  available on hover, focus, or tap.
- Source requests use timeouts, schema validation, five-minute revalidation, and
  per-source failure isolation. Manual school, flag, and sky entries require an
  explicit verified marker and source URL.
- Production deployment: `dpl_HCgWxmDjEyPfLST6PUzgh3TDXwCh`.
- Verification: targeted ESLint, TypeScript, 118-route optimized build, protected
  invariant test, 50 financial integration checks, desktop and 390px browser review,
  live API review, and a ten-perspective audit.
- Revert: `git revert 83a8477`, then `git revert eef9052`, then `git revert bca6d31`.

### Phase 2: Foundation Security and Reliability

- Status: complete on the development branch; preview verification pending.
- Testimonial moderation links are now review-only. A mail scanner, prefetcher, or
  replayed GET cannot approve, deny, or delete a submission. Named administrators,
  same-origin JSON mutations, rate limits, deterministic outcomes, and immutable
  audit records protect moderation actions.
- Public testimonial submissions retain anonymous use while adding bounded input,
  a honeypot, IP throttling, HTML escaping, sanitized mail headers, plain-text email,
  and preview-safe delivery controls.
- Inventory QR possession no longer reveals operational stock data or authorizes a
  write. Item, QR, and submission mutations require a named active employee,
  same-origin JSON, rate limits, strict validation, optimistic versions, durable
  idempotency keys, and employee-attributed audit history.
- The native inventory API boundary and current Neon mapping are documented in
  `docs/IOS_INVENTORY_API_CONTRACT.md`. Mobile write endpoints remain intentionally
  deferred until an approved employee-bound native authentication flow exists.
- DEA registration number and expiration collection were removed from the public
  employment application, validation, flags, and generated administrative copy.
  Historical encrypted submissions were not changed. The complete field audit is
  in `docs/EMPLOYMENT_APPLICATION_FIELD_AUDIT.md`.
- Weather behavior preserves the owner's explicit override: a successful empty
  official response is treated as clear, while a source failure is hidden rather
  than presented as an unavailable banner. No protected CAD or ticker code changed.
- Verification: TypeScript, targeted ESLint, 27 security checks, 50 Financials
  integration checks, protected-area invariants, route authorization probes,
  whitespace checks, and a complete 119-page optimized production build.

### Public-Only Offline Mode

- Status: complete on the development branch; preview verification pending.
- The installable site caches a bounded list of public informational pages and
  public static assets after an online visit. Navigation uses a network-first
  strategy with a dedicated `/offline` fallback; assets use stale-while-revalidate.
- `/api`, `/admin`, `/lounge`, `/board`, `/inventory`, `/truckcheck`, and
  `/financials-information-hub` are always network-only. Live weather, games, forms,
  employee tools, inventory synchronization, and protected documents continue to
  require internet access.
- Browser verification covered the offline page title, heading, service worker,
  manifest, and horizontal overflow. The Financials suite asserts that protected
  paths cannot enter the public cache.

## Current Checkpoint

### Comprehensive Audit and Non-Protected P0/P1 Hardening

- Status: implementation and focused regression verification complete on the
  isolated local branch; clean browser preview and full build verification pending.
- Audit report: `docs/COMPREHENSIVE_CODEBASE_AUDIT_2026-08-17.md`.
- Protected restoration: `app/api/cad/poll/route.ts`, `lib/cad/parser.ts`,
  `lib/cad/db.ts`, `app/api/cad/latest/route.ts`, `app/api/cad/log/route.ts`, and
  `components/cad/CallTicker.tsx` match branch baseline. The protected-invariant
  verifier also matches baseline and passes. CAD findings remain recommendations
  for a separately approved CAD-only project.
- Lounge authentication now uses purpose-bound, one-use preauthentication
  challenges and random expiring setup credentials. Forced password changes are
  enforced centrally for Lounge and Board sessions.
- New Board workbooks and draft budget files use private Blob storage and
  authenticated no-store streaming. The retained historical public artifacts are
  blocked by exact proxy matchers until owner-approved migration and deletion.
- TruckCheck submissions are employee-bound, idempotent, transactional, and saved
  before success is reported. PDF/email and legacy-copy work use a durable outbox;
  Chicago dates and military times are stored explicitly.
- Cardinals and Blues alerts now normalize official score state, inning/half or
  period/clock when provided, final scores, and live refresh. One team logo contains
  all same-day events; event logos remain desktop-only and alternate across the
  existing header.
- Public hero/gallery clients now use a read-only public media endpoint. Local and
  non-production service workers unregister old Millstadt caches. The compact footer
  remains in normal document flow, and the clear-weather checkmark is removed without
  changing weather alert logic.
- Focused verification passed: protected invariants; 30 security checks; TruckCheck
  boundary and 14 persistence/outbox tests; seven Board private-document tests; P0
  auth checks; operational correctness; analytics retention; sports score/final
  behavior; public media/weather/footer/PWA behavior; and `git diff --check`.
- Required before any preview or deployment: run
  `scripts/migrate-auth-p0-hardening.ts` against the development database, verify
  the retained Board-document migration plan, and complete a real desktop/mobile
  browser pass. No migration, commit, push, preview, or production promotion has
  occurred from this checkpoint.
- Environment limitation: this managed task sandbox rejects loopback TCP with
  `Operation not permitted`, so Next cannot bind a local dev port here. Full-project
  TypeScript and ESLint reruns were stopped after remaining silent for multiple
  minutes; focused executable tests report no failure.
- Revert: no checkpoint commit exists yet. Once committed, record the commit SHA and
  use `git revert <checkpoint-sha>`; do not reset shared history.

### Phase 3: PDF and Email Output Quality

- Status: complete on the isolated development branch; preview verification pending.
- Real email/SMS sends remain prohibited during development verification.
- Fictional data only is permitted for security, PDF, and email output tests.
- Five owner-supplied public Form 990 PDFs are loaded only in the ignored local
  development library. The archive labels the misnamed file as tax year 2021 and
  orders the real filings 2023, 2022, 2021, 2020, 2019. No real PDF is tracked by Git
  or available in production.
- Fourteen generated PDF families now share official identity, page totals, footer
  clearance, long-text pagination, stable Letter dimensions, and aspect-preserving
  signatures/images. A fictional 77-page registry was rendered through Poppler and
  visually checked; every page contains text, every file has a complete page-number
  sequence, internal manager notes are absent, and private personnel references do
  not print. The full registry is `docs/PDF_EMAIL_OUTPUT_REGISTRY.md`.
- Every non-CAD Gmail sender now uses one sanitized multipart composer with plain
  text and HTML alternatives, safe headers/recipients/attachments, and hard preview
  and development delivery gates. A fictional MIME fixture verifies injection,
  UTF-8 subjects, body parts, attachment metadata, and environment controls without
  sending a message.
- Employee forms, write-ups, onboarding, acknowledgments, truck-check PDFs,
  truck-check photos, personnel packets, and saved inventory reports use private
  storage or authenticated streaming. Truck-check JSON and photo uploads are bounded,
  schema-checked, signature-checked, same-origin, and authenticated. Legacy public
  truck-check photos require an owner-approved production migration; preview work
  intentionally does not mutate live records or storage.
- Inter, Dancing Script, IBM Plex Mono, Geist, and Geist Mono are bundled locally.
  The Serenity Prayer keeps its cursive treatment, the Lounge/Board font roles remain,
  Lead II no longer injects a remote stylesheet, and the CSP no longer permits Google
  font hosts. Production builds and installed public pages no longer depend on Google
  Fonts.
- Next 16 route-contract defects were removed by moving visual-editor auth and CAD
  aggregate helpers out of route modules. The testimonial page is runtime-dynamic and
  degrades to an empty approved list when Neon is unavailable, so deploy builds do not
  require a live database connection.
- Verification: targeted and changed-file ESLint, TypeScript, 30 security checks,
  protected-area invariants, the 14-PDF/one-email output suite, whitespace checks,
  and a complete offline webpack production build with 118 static pages. The 50
  Financials integration checks passed immediately before the workspace socket policy
  changed; the current sandbox cannot bind even to loopback, and subsequent changes
  do not touch Financials behavior.
- Two owner-supplied 2025 public hours and pay summaries were converted to polished,
  two-page Letter PDFs with agency-only metadata. They are stored as restricted
  non-990 records in the ignored local development library and are not tracked,
  public, cached offline, or available in production.

### Phase 4: Public Design, Accessibility, and Repeat Visits

- Status: complete on the isolated development branch; preview verification pending.
- Public ECG now provides synthetic Student and Clinician cases in Daily, Practice,
  and Timed modes with keyboard controls, pause support, Chicago-date rollover, and
  no accounts, leaderboard, submission, or storage.
- Kids Club now includes a guided 911 story and printable practice guide. It collects
  no child data, never directs children to handle medicine or equipment, and limits
  phone practice to a toy phone or paper keypad.
- Seasonal presentation uses one centralized Chicago-time configuration with preview,
  override, and disable controls. It adds only a restrained static header accent and
  does not create event claims, alerts, pages, or permanent team marks.
- Public chrome, Forms, and What's Happening were simplified to remove fake metrics,
  generic status copy, oversized decoration, and unnecessary motion. The footer now
  uses one compact agency block and one wrapping link group while retaining every
  destination and touch/keyboard access.
- The public service-worker cache includes the new ECG and Kids routes. Financials,
  APIs, admin tools, employee tools, inventory, and other live/protected paths remain
  network-only.
- The public Financials label is now Financial & Information Transparency. Exactly
  one compact homepage entry remains, production still shows Coming Soon, and all
  public Financials APIs remain disabled.
- Verification: webpack production build, TypeScript, 119 generated static pages,
  47 public-experience assertions, 30 security checks, 8 truck-check boundary checks,
  protected-area hashes, PDF metadata inspection, duplicate-safe restricted-document
  import, and whitespace checks. The ten-perspective review is recorded in
  `docs/PUBLIC_EXPERIENCE_AUDIT.md`.

## Remaining Phases

- Publish and verify a preview checkpoint only when network access is available.
- Keep Financial & Information Transparency under construction in production until
  the owner separately authorizes public release.
- Do not promote this development checkpoint to production without a separate,
  explicit owner instruction.

## Known External Dependencies

- Licensed/authorized live-score provider credentials or contract. Official
  schedule-only behavior is active without this dependency.
- Official school closure/safety notice integration and administrator approval
  workflow. Athletics/calendar feeds are connected where available.
- Official federal and Illinois flag-status sources suitable for automation.
- Curated meteor-shower and conjunction source. Solar-eclipse calculation is active;
  other sky notices require a verified manual record.
- Owner-approved notification recipients and production delivery configuration.
- Medical-director review for advanced public ECG content.

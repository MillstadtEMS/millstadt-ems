# Millstadt EMS Board Portal Forensic Audit

Date: July 18, 2026
Branch: `codex/board-portal-forensic-correction`
Prompt source: `/Users/kj/.codex/attachments/ff0947cc-c5b5-4400-a258-36400dbce144/pasted-text.txt`
Workbook reviewed: `/Users/kj/Desktop/Millstadt EMS District Budget FY2026-27 final1.xlsx`

Supersession note: the active portal source has since been changed to `/Users/kj/Desktop/Millstadt_EMS_Referendum_Financial_Model (1).xlsx`. This audit preserves the earlier review trail; current workbook mapping and smoke values are documented in `docs/excel-integration.md` and `docs/board-portal-test-report.md`.

## Pre-Change Safety Record

| Item | Result |
| --- | --- |
| Starting branch | `main` |
| Working tree before edits | Clean |
| Last commit before edits | `b03265d Board Portal: reframe financials as Referendum model; Fire Board = guests` |
| Pre-change tracked diff backup | `/tmp/millstadt-ems-pre-codex.patch` empty |
| Pre-change untracked backup | `/tmp/millstadt-ems-pre-codex-untracked.txt` empty |
| Working branch created | `codex/board-portal-forensic-correction` |

## Prompt Section Coverage

This table maps every numbered section of the master prompt to a final status. Some sections describe complete product modules that were not present in the existing Board Portal; those are not claimed complete.

| Section | Requirement Area | Final Status | Evidence / Limitation |
| --- | --- | --- | --- |
| 1 | Repository and project location | Verified Complete | Work performed in `/Users/kj/millstadt-ems` on `codex/board-portal-forensic-correction`. |
| 2 | Repository safety check | Verified Complete | Clean pre-change tree recorded; external patch/untracked backups created; no destructive git command used. |
| 3 | Project and local Next instructions | Verified Complete | `AGENTS.md` and local Next routing/layout/API/auth docs were read before changes. |
| 4 | Board Portal code locations | Verified Complete | Work was limited to Board routes/components/libs/scripts/docs/assets. |
| 5 | Environment and secrets | Verified Complete | `.env.local` contents were not exposed; Board seed scripts now require configured env passwords and do not print formulas. |
| 6 | Protect public website | Verified Complete | Public source files were not intentionally changed; public route smoke passed. |
| 7 | Forensic audit before development | Verified Complete | Board files and workbook were audited; results are recorded here. |
| 8 | Requirements audit document | Verified Complete | This file exists and contains final requirement statuses. |
| 9 | Correction plan | Verified Complete | `docs/board-portal-correction-plan.md`. |
| 10 | Treat Claude handoff as unverified | Verified Complete | Existing claims were rechecked against code/workbook behavior. |
| 11 | Fire Board requirements | Verified Complete | Fire Board no longer treated as guests; Fire has own meeting calendar/eligibility. Final policy still needs Kenneth review. |
| 12 | Board meeting schedules | Verified Complete | EMS second Wednesday and Fire last Thursday at 7:00 PM, 100 East Laurel Street, Millstadt, Illinois. |
| 13 | Quorum | Verified Complete | EMS quorum seeded/fallback to 3; quorum status uses objective labels. |
| 14 | Attendance | Verified Complete | Planned RSVP and official confirmed attendance are separate; late/early/recused/status vocabulary added. |
| 15 | Attendance requests and notifications | Future Feature | RSVP exists; notification/reminder lifecycle is not implemented. |
| 16 | Pre-meeting questions and concerns | Verified Complete | Categories, visibility, urgent reason, deadline flag, and confidential review are supported. |
| 17 | Question response workflow | Future Feature | Submission and response fields exist, but no complete response/assignment UI workflow exists. |
| 18 | Board Briefings | Future Feature | No briefing generation, release, recipient, version, or archive workflow exists yet. |
| 19 | Meeting packets | Future Feature | No one-click meeting-packet PDF generation exists yet. |
| 20 | Meeting recording and minutes | Future Feature | No Board recording/transcript/minutes workflow exists yet. |
| 21 | Board officers | Future Feature | Current users have `officer_title`; no officer-history table/workflow exists. |
| 22 | User roles | Needs Review by Kenneth James | Roles exist for admin/submitter/EMS/Fire/audit, but proposal/vote/signature permissions are future work and final Fire/audit policy needs approval. |
| 23 | Login and authentication | Verified Complete | Clean login/change-password flow, server-side auth, hashed passwords, secure cookie settings. |
| 24 | Personalized home page | Verified Complete | `/board` uses `Welcome, {firstName}` and governance dashboard content. |
| 25 | Separate financial data purposes | Verified Complete | Referendum model separated from future actual/Sage sources. |
| 26 | Financial architecture | Complete but Requires External Configuration | Boundary modules exist; actuals/Sage/Graph remain unconfigured. |
| 27 | Referendum section | Verified Complete | Projected model lives under `/board/referendum/*`; top-level financial routes redirect there. |
| 28 | Referendum labels | Verified Complete | Subjective/recommendation wording removed from visible Referendum UI. |
| 29 | Remove AI-generated interface copy | Verified Complete | Board-scope copy scan passed; remaining formula comment is in unrelated lounge script. |
| 30 | Fiscal-year wording | Verified Complete | Visible formal labels use `FY 2026–27`; exact workbook filename documented separately. |
| 31 | Proposed staffing model | Verified Complete | Staffing page labels proposed future staffing and not current staffing. |
| 32 | Personnel costs | Needs Review by Kenneth James | Portal imports workbook personnel groups/costs; full workbook-source validation remains owner/accounting review. |
| 33 | PTO and training | Needs Review by Kenneth James | Workbook includes PTO/training assumptions; portal displays imported totals but not every underlying formula line. |
| 34 | Levy calculator | Verified Complete | Inputs/results/actions implemented on `/board/referendum/levy`. |
| 35 | Editable EAV | Complete but Requires External Configuration | Scenario edit works; admin save audits portal cache. Excel writeback requires Graph configuration. |
| 36 | Levy scenarios | Verified Complete | 0.20/0.25/0.30/0.35/0.40 scenarios and approved result labels implemented. |
| 37 | Cash flow | Verified Complete | Unsupported monthly cash flow hidden by default behind actual-cash-flow feature flag. |
| 38 | Microsoft Excel and OneDrive | Complete but Requires External Configuration | Workbook identity/owner/field map documented; Graph not configured. |
| 39 | Controlled two-way workbook connection | Complete but Requires External Configuration | Approved-cell architecture and admin EAV API exist; Graph read/write/conflict handling not complete. |
| 40 | Preserve workbook features | Complete but Requires External Configuration | Upload parser reads workbook/cache and does not alter formulas; Graph write safety still required. |
| 41 | Model Review admin area | Complete but Requires External Configuration | `/board/admin/model-review` exists; external connection statuses remain configuration-required/future. |
| 42 | Workbook download | Future Feature | No secure expiring password-protected workbook download exists yet. |
| 43 | Proposals | Future Feature | No Board proposal lifecycle exists yet. |
| 44 | Voting | Future Feature | No voting workflow exists yet. |
| 45 | Electronic signatures | Future Feature | No Board signature workflow or final PDF generation exists yet. |
| 46 | Archives and version history | Future Feature | Audit rows exist, but full archive/version system is not implemented. |
| 47 | Audit trail | Future Feature | Important current Board actions are audited; full page-view/search/download/vote/signature/session audit scope is not complete. |
| 48 | Kenneth development activity | Future Feature | No activity-report split exists yet; important admin/financial actions remain auditable. |
| 49 | Fire Board access report | Future Feature | Logging notice exists; no Fire access report UI or estimated viewing time exists yet. |
| 50 | Board Portal rebrand | Verified Complete | Separate Board-specific visual shell, color system, typography, and logo assets. |
| 51 | Application shell | Verified Complete | Desktop left nav, mobile top/menu pattern, content area, and restricted admin link handling. |
| 52 | Typography | Verified Complete | Instrument Sans and IBM Plex Mono configured; serif removed from portal UI. |
| 53 | Color system | Verified Complete | Requested dark/light variables implemented; large gradients/glass/neon removed from Board UI. |
| 54 | Component design | Needs Review by Kenneth James | Core cards/buttons/tables/forms use 6-10px radius, borders, focus; loading skeletons/sticky headers are not universal. |
| 55 | Logo and PNG assets | Verified Complete | Required PNGs exist, are visually inspected, and dark/light variants are transparent. |
| 56 | Security | Future Feature | Server auth/roles/hash/cookies/file validation exist in part; CSRF, rate limits, malware scanning, signed downloads, backups, and full headers review remain. |
| 57 | Independent Vera review | Blocked — Reason Documented | Vera-style subagent was attempted but did not complete; limitation documented in `docs/vera-independent-review.md`. |
| 58 | Testing | Blocked — Reason Documented | Build/scoped lint/smoke/calculation checks passed; unit/integration/mobile/accessibility/authenticated E2E tests are not complete. |
| 59 | Required functional tests | Blocked — Reason Documented | Many workflows are future features or require authenticated production-like accounts/configuration. |
| 60 | Required deliverables | Blocked — Reason Documented | Required docs/assets exist; before screenshots are unavailable and after screenshots are blocked by unavailable browser tooling. |
| 61 | Final requirements matrix | Verified Complete | Matrix exists in this document with allowed final statuses. |
| 62 | Definition of complete | Blocked — Reason Documented | Not all product modules are built; every known miss is labeled as future/configuration/decision/blocker. |

## Final Requirements Matrix

Final status values follow the master prompt: Verified Complete, Complete but Requires External Configuration, Future Feature, Blocked — Reason Documented, or Needs Review by Kenneth James.

| Requirement | Final Status | Route / Component / File | Data Source | Current Behavior | Remaining Problem / Risk | Test Required |
| --- | --- | --- | --- | --- | --- | --- |
| Protect public website and avoid starting over | Verified Complete | Board-scoped files under `app/board`, `app/api/board`, `components/board`, `lib/board`, `scripts/board-*`, `public/board/branding` | Git diff | Public app routes were not edited; legacy public pages still return 200 in smoke test. | No before screenshot was captured before edits. | Repeat public route smoke and visual screenshots before deploy. |
| Read local instructions before route/API/auth changes | Verified Complete | `AGENTS.md`, local Next docs in `.claude/docs`, Board code | Local files | Board changes follow existing App Router and route-handler patterns. | None known. | Build and scoped lint. |
| Board-only professional design system | Verified Complete | `app/board/board.css`, `app/board/layout.tsx`, `app/board/(portal)/layout.tsx` | CSS and Next font config | Uses Instrument Sans and IBM Plex Mono, restrained dark/light palette, sidebar/top shell, 8px cards/buttons. | Needs final human visual review on actual devices. | Browser screenshot review. |
| Transparent Board Portal logo assets | Verified Complete | `public/board/branding/*.png`, `components/board/BoardLogo.tsx` | Existing EMS emblem asset | Dark and light transparent PNGs exist; white-background print PNG exists. | None known. | Inspect against dark, light, and print backgrounds. |
| Clean login screen | Verified Complete | `/board/login`, `app/board/login/page.tsx` | Auth API | Login shows only branding, username, password, Sign In, and error state. No example username or temporary-password formula. | Forgot-password is not shown because no functional reset flow exists. | Manual login flow with valid and invalid credentials. |
| No visible Board temporary-password formula | Verified Complete | `scripts/board-setup.mjs`, `scripts/board-seed-members.mjs`, `scripts/board-fire-photos.mjs`, `.env.example` | Environment variable | Board seed scripts require `BOARD_INITIAL_TEMP_PASSWORD`; optional dev account requires `BOARD_DEV_PASSWORD`. Values are not printed. | Unrelated `scripts/lounge-init.mjs` still has an old lounge formula comment and was left out of scope. | Secret/copy scan before deploy. |
| Authenticated home greeting | Verified Complete | `/board`, `app/board/(portal)/page.tsx` | `currentBoardUser()` | Renders `Welcome, {user.firstName}`. | Needs logged-in browser verification with Kenneth's account. | Authenticated route smoke. |
| Home page as governance dashboard, not financial overview | Verified Complete | `/board`, `app/board/(portal)/page.tsx` | Governance DB | Shows next meeting, attendance, quorum, questions, governance metrics, and one Referendum card. Full financial projection is removed. | Several governance modules are marked Future Feature rather than implemented. | Authenticated UI review. |
| Board Briefings metric | Future Feature | `/board` | None yet | Visible as a governance metric only. | No briefing generation/distribution/archive code exists. | Implement and test briefing lifecycle. |
| Items requiring vote, proposals, minutes approval, tasks, documents, notifications | Future Feature | `/board` | None yet | Visible as dashboard metrics only. | No underlying tables/APIs/workflows exist. | Implement real workflows before marking complete. |
| Referendum model separated from current actuals | Verified Complete | `/board/referendum/*`, `lib/board/financialData/*` | FY 2026-27 workbook cache | Referendum pages carry the required notice and objective labels; top-level financial routes redirect into Referendum. | User must continue treating workbook values as projected planning data. | Copy scan and route review. |
| Required Referendum notice appears once | Verified Complete | `app/board/(portal)/referendum/layout.tsx` | Static layout notice | Notice states the figures are a projected financial model and not current staffing or Sage actuals. | None known. | Visual review across subroutes. |
| Unsupported monthly cash flow hidden | Verified Complete | `/board/cashflow`, `lib/board/financialData/featureFlags.ts` | `ENABLE_ACTUAL_CASH_FLOW` | Cash-flow route redirects to Referendum unless actual cash-flow feature is enabled. | Actual cash flow is not available yet. | Env-flag test. |
| Actual financials and Sage separated from Referendum | Future Feature | `lib/board/financialData/actuals/*`, `/board/admin/model-review` | No configured Sage/API source | Actual adapters return Future Feature or Configuration Required; Sage is not marked complete. | Requires supported Sage API, verified export, or approved actuals workbook. | Integration test with real source. |
| Workbook identity documented | Complete but Requires External Configuration | `lib/board/financialData/referendum/workbookMapping.ts`, `docs/excel-integration.md` | Prompt + workbook | Workbook file and OneDrive owner are recorded; editable field map exists. | Microsoft Graph auth/read/write/conflict handling is not configured. | Graph sandbox test. |
| EAV scenario editing | Verified Complete | `/board/referendum/levy`, `components/board/LevyCalculator.tsx` | `board_finance.district_eav` | EAV can be edited locally, rejects invalid values, Calculate updates scenario, Reset restores saved value. | Needs logged-in browser test for user role differences. | Manual form test. |
| Save as Model Value for EAV | Complete but Requires External Configuration | `/api/board/referendum/eav`, `components/board/LevyCalculator.tsx` | `board_finance`, audit table | Admin-only save requires confirmation and reason; records old/new value and sync status in audit; refreshes linked views. | Current save updates portal cache only and marks workbook sync Configuration Required. | Authenticated admin API test, then Graph write test. |
| Levy scenario rates and allowed result labels | Verified Complete | `lib/board/financialData/referendum/levyCalculations.ts`, `components/board/LevyCalculator.tsx` | Workbook EAV and required levy revenue | Preserves 0.20%, 0.25%, 0.30%, 0.35%, 0.40%; result strings are only the approved objective labels. | None known. | Unit-style calculation check. |
| Fiscal-year wording | Verified Complete | Referendum source labels | Prompt | Visible source labels use `FY 2026–27` where formal wording is needed. | Exact file name remains documented separately. | Copy scan. |
| Subjective financial commentary removed | Verified Complete | Referendum pages, cash-flow page | Static copy | Removed recommendation-style labels and "money picture" language. | Workbook itself still contains narrative text outside portal UI. | Copy scan. |
| Proposed staffing not presented as current staffing | Verified Complete | `/board/referendum/staffing` | Personnel cache | Page says Proposed Future Staffing and displays a notice that it is not current staffing. | None known. | Visual review. |
| EMS recurring meetings | Verified Complete | `lib/board/governance.ts`, `scripts/board-meetings-seed.mjs` | Date math + DB seed | EMS recurring meetings use second Wednesday, 7:00 PM, 100 East Laurel Street, Millstadt, Illinois. | Existing DB rows may need reseed if previously created with old values. | Run seed in target DB and inspect rows. |
| Fire Board recurring meetings | Verified Complete | `lib/board/governance.ts`, `scripts/board-meetings-seed.mjs` | Date math + DB seed | Fire Board now has its own last-Thursday recurring calendar at 7:00 PM and the same address. | Existing DB rows may need reseed. | Run seed and inspect Fire rows. |
| EMS quorum is 3 | Verified Complete | `lib/board/governance.ts`, `scripts/board-meetings-seed.mjs` | `board_quorum_rules` | EMS quorum is seeded as 3 and fallback is 3. | Target DB must be migrated/seeded. | DB row check. |
| Attendance response vs official attendance | Verified Complete | `components/board/AttendanceControl.tsx`, `components/board/ConfirmAttendance.tsx`, `app/api/board/meetings/*` | Governance DB | Planned attendance and secretary-confirmed official status are separate; official status vocabulary is expanded. | Official attendance does not yet drive historical attendance reports. | Authenticated meeting workflow test. |
| Questions before meeting | Verified Complete | `QuestionForm`, `app/api/board/meetings/question`, `lib/board/governance.ts` | Governance DB | Category, visibility, urgent reason, confidential review, and after-deadline flag are supported. | No generated briefing packet yet. | Submit questions under different roles. |
| Fire Board visibility | Needs Review by Kenneth James | `userBoards`, `isEligibleMember`, `BoardNav` | Role records | Fire members see Fire meetings; EMS financial permission remains separate. Admin/audit/president can see both calendars. | Final real-world visibility policy needs Kenneth approval, especially audit reviewer access to Fire. | Role-based browser matrix. |
| Administrator model review | Complete but Requires External Configuration | `/board/admin/model-review` | Workbook mapping + adapter statuses | Admin-only page shows workbook, actuals, Sage, editable field map, and review items. | External integrations remain unconfigured. | Admin browser smoke. |
| Workbook upload cache refresh | Verified Complete | `/api/board/admin/import`, `components/board/WorkbookUpload.tsx`, `lib/board/import.ts` | Uploaded workbook | Admin upload refreshes referendum model cache and audits import; copy avoids actual cash-flow claims. | Blob-stored workbook download is not a secure expiring download flow. | Admin upload test. |
| Secure workbook downloads | Future Feature | No route yet | None | Not implemented. | Requires signed/expiring download route and access logging. | Implement and security-test. |
| Audit trail | Verified Complete | `lib/board/db.ts`, Board API routes | `board_audit` | Login, logout, password change, import, attendance, questions, and EAV save write audit entries. | No UI audit dashboard yet. | DB audit verification. |
| Audit dashboard | Future Feature | No page yet | None | Not implemented. | Required for convenient review of administrator actions. | Implement admin audit page. |
| Archives, generated PDFs, signatures | Future Feature | No Board modules yet | None | Not implemented. | Required by master prompt definition of complete but no existing implementation surface was present. | Implement full lifecycle. |
| Public site regression report | Verified Complete | `docs/public-site-regression-report.md` | Git diff, route smoke | Report exists and records current public route checks. | Missing true before screenshots. | Manual screenshot pass. |
| Test report | Verified Complete | `docs/board-portal-test-report.md` | Local commands | Report exists with build, scoped lint, route smoke, calculation checks, and known full-repo lint noise. | Needs authenticated browser/E2E tests. | Add Playwright or similar. |
| Permission matrix | Verified Complete | `docs/board-portal-permission-matrix.md` | Code + prompt | Role/feature permissions documented. | Needs Kenneth review before production policy lock. | Role-based manual test. |
| Vera independent review | Needs Review by Kenneth James | `docs/vera-independent-review.md` | Independent subagent + local checks | Review document records independent findings and limitations. | Any unverified workbook/legal/accounting assumptions need owner review. | Kenneth review and external source verification. |

## High-Risk Gaps That Remain

1. Microsoft Graph workbook writeback is not configured, so EAV saves are portal-cache changes with audit status `Configuration Required`.
2. Sage actuals are a Future Feature and must not be represented as complete.
3. Board Briefings, proposals, voting, signatures, secure downloads, PDFs, archives, and notifications remain Future Feature work.
4. The existing production database must be reseeded or migrated for Fire Board recurring meetings and EMS quorum rule updates.
5. Public-site before screenshots were not captured before edits; current route smoke passed, but screenshot regression remains a manual follow-up.

## Deliverables Inventory

| Deliverable | Status | Location / Note |
| --- | --- | --- |
| Forensic audit | Verified Complete | `docs/board-portal-forensic-audit.md` |
| Correction plan | Verified Complete | `docs/board-portal-correction-plan.md` |
| Excel integration document | Verified Complete | `docs/excel-integration.md` |
| Public-site regression report | Verified Complete | `docs/public-site-regression-report.md` |
| Permission matrix | Verified Complete | `docs/board-portal-permission-matrix.md` |
| Test report | Verified Complete | `docs/board-portal-test-report.md` |
| Vera independent review | Blocked — Reason Documented | `docs/vera-independent-review.md`; independent reviewer did not complete. |
| Before-and-after screenshots | Blocked — Reason Documented | Before screenshots were not captured before edits. Browser-control tooling was unavailable for reliable after screenshots in this session. |
| Transparent dark PNG logo | Verified Complete | `public/board/branding/millstadt-ems-board-portal-dark.png` |
| Transparent light PNG logo | Verified Complete | `public/board/branding/millstadt-ems-board-portal-light.png` |
| White-background PNG logo | Verified Complete | `public/board/branding/millstadt-ems-board-portal-white-background.png` |
| List of files changed | Verified Complete | See "Files Changed" below. |
| List of routes changed | Verified Complete | See "Routes Changed" below. |
| Database migrations | Verified Complete | No standalone migration file; idempotent schema/table updates are in existing Board setup/governance code. See "Database Changes". |
| Remaining external configuration | Verified Complete | See "Remaining External Configuration". |
| Final requirements matrix | Verified Complete | This document. |
| Public website not unintentionally altered | Verified Complete | Public route smoke passed; public source files were not intentionally changed. |

## Files Changed

Tracked modified files:

- `app/board/(portal)/admin/page.tsx`
- `app/board/(portal)/cashflow/page.tsx`
- `app/board/(portal)/layout.tsx`
- `app/board/(portal)/meetings/[id]/page.tsx`
- `app/board/(portal)/meetings/page.tsx`
- `app/board/(portal)/page.tsx`
- `app/board/(portal)/referendum/debt/page.tsx`
- `app/board/(portal)/referendum/detailed/page.tsx`
- `app/board/(portal)/referendum/fleet/page.tsx`
- `app/board/(portal)/referendum/forecast/page.tsx`
- `app/board/(portal)/referendum/levy/page.tsx`
- `app/board/(portal)/referendum/page.tsx`
- `app/board/(portal)/referendum/staffing/page.tsx`
- `app/board/board.css`
- `app/board/change-password/page.tsx`
- `app/board/layout.tsx`
- `app/board/login/page.tsx`
- `components/board/AttendanceControl.tsx`
- `components/board/BoardLogo.tsx`
- `components/board/ConfirmAttendance.tsx`
- `components/board/LevyCalculator.tsx`
- `components/board/NextMeetingCard.tsx`
- `components/board/QuestionForm.tsx`
- `components/board/WorkbookUpload.tsx`
- `lib/board/governance.ts`
- `scripts/board-fire-photos.mjs`
- `scripts/board-meetings-seed.mjs`
- `scripts/board-seed-members.mjs`
- `scripts/board-setup.mjs`

New tracked files to add:

- `app/api/board/referendum/eav/route.ts`
- `app/board/(portal)/admin/model-review/page.tsx`
- `docs/board-portal-correction-plan.md`
- `docs/board-portal-forensic-audit.md`
- `docs/board-portal-permission-matrix.md`
- `docs/board-portal-test-report.md`
- `docs/excel-integration.md`
- `docs/public-site-regression-report.md`
- `docs/vera-independent-review.md`
- `lib/board/financialData/actuals/actualsAdapter.ts`
- `lib/board/financialData/actuals/sageAdapter.ts`
- `lib/board/financialData/actuals/types.ts`
- `lib/board/financialData/actuals/verifiedWorkbookAdapter.ts`
- `lib/board/financialData/featureFlags.ts`
- `lib/board/financialData/referendum/excelAdapter.ts`
- `lib/board/financialData/referendum/levyCalculations.ts`
- `lib/board/financialData/referendum/modelTypes.ts`
- `lib/board/financialData/referendum/workbookMapping.ts`
- `public/board/branding/millstadt-ems-board-portal-dark.png`
- `public/board/branding/millstadt-ems-board-portal-light.png`
- `public/board/branding/millstadt-ems-board-portal-white-background.png`

Ignored local files touched but not tracked by git:

- `.env.example`
- `.env.local.example`

Because `.env*` files are ignored in this repository, required Board env names are also documented in `docs/excel-integration.md` and this audit.

## Routes Changed

| Route | Change |
| --- | --- |
| `/board/login` | Clean private login screen with Board branding only. |
| `/board/change-password` | Board-branded first-login password change. |
| `/board` | Governance dashboard, no financial overview. |
| `/board/meetings` | EMS/Fire schedule copy and generated-default chip cleanup. |
| `/board/meetings/[id]` | Updated attendance/quorum/question language and official-attendance behavior. |
| `/board/referendum` | Projected EMS District financial model overview with required notice from layout. |
| `/board/referendum/detailed` | Objective projected model labels and fiscal-year source wording. |
| `/board/referendum/staffing` | Proposed Future Staffing language. |
| `/board/referendum/fleet` | Truck Maintenance worksheet source and objective labels. |
| `/board/referendum/debt` | Projected debt/obligation wording. |
| `/board/referendum/forecast` | Objective five-year projection labels. |
| `/board/referendum/levy` | Editable EAV, Calculate, Save as Model Value, Reset, and scenario table. |
| `/board/cashflow` | Redirects by default unless actual-cash-flow feature flag is enabled. |
| `/board/admin` | Adds Model Review entry point. |
| `/board/admin/model-review` | New admin-only model review/status page. |
| `/api/board/referendum/eav` | New admin-only audited EAV save route. |

## Database Changes

No standalone migration file was added. The existing Board pattern uses idempotent schema creation in runtime/setup code.

| Area | Change |
| --- | --- |
| `board_quorum_rules` | EMS quorum rule seeded as `3` when absent. |
| `board_meetings` | EMS and Fire recurring meetings generated/updated with correct recurring dates, time, address, and confirmed details. |
| `board_attendance` | Official confirmation status, arrival, and departure fields are used by updated UI/API. |
| `board_questions` | Existing fields support categories, visibility, urgent reason, after-deadline status, and response fields. |
| `board_finance` | EAV save upserts `district_eav`, marks review/sync pending, and records audit detail. |
| `board_audit` | Used for login/logout/password/import/attendance/question/EAV events. |

## Remaining External Configuration

| Configuration | Status |
| --- | --- |
| `DATABASE_URL` | Required for Board runtime and seed scripts. |
| `BOARD_INITIAL_TEMP_PASSWORD` | Required locally before Board user seed scripts run. |
| `BOARD_DEV_PASSWORD` | Optional local-only dev account password; skipped when unset. |
| Microsoft Graph workbook auth/read/write | Required before EAV save can update Excel. |
| OneDrive workbook stable ID | Required for safe Graph integration. |
| Sage API/export/verified actuals workbook | Required before actual financials or actual cash flow can be enabled. |
| Secure signed workbook downloads | Future Feature. |
| Authenticated test accounts for every role | Required for full permission and visual E2E testing. |
| Browser screenshot tooling | Required for screenshot deliverables and viewport visual tests. |

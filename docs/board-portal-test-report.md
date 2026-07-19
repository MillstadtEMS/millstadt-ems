# Board Portal Test Report

Date: July 18, 2026
Branch: `codex/board-portal-forensic-correction`

## Commands Run

| Check | Result | Notes |
| --- | --- | --- |
| Pre-change `git status --short` | Pass | Clean before edits. |
| Scoped Board ESLint | Pass | `node node_modules/eslint/bin/eslint.js app/board app/api/board components/board lib/board scripts/board-setup.mjs scripts/board-seed-members.mjs scripts/board-meetings-seed.mjs scripts/board-fire-photos.mjs` |
| `npm run build` | Pass | Next.js production build completed; compilation, TypeScript, page data, and static generation all succeeded. |
| Full-repo `npm run lint` | Blocked — Reason Documented | The local `.bin/eslint` shim is malformed and fails before linting. Direct ESLint full-repo run also reports many pre-existing admin/lounge violations outside Board scope. |
| Public route smoke | Pass | `/`, `/about`, `/contact`, `/fleet` returned 200 from local dev server. |
| Board auth route smoke | Pass | `/board/login` returned 200; unauthenticated `/board` and `/board/referendum` landed on `/board/login`. |
| New referendum workbook parse | Pass | Reviewed `/Users/kj/Desktop/Millstadt_EMS_Referendum_Financial_Model (1).xlsx`; sheets and mapped cells matched importer expectations. |
| Levy scenario arithmetic | Pass | EAV `350,704,800`; required property-tax revenue `1,094,966.024666667`; scenarios preserve required result labels. |
| Targeted changed-file ESLint | Pass | Direct CLI entrypoint used because repo `.bin` wrappers are malformed: `node node_modules/eslint/bin/eslint.js ...changed files...`. |
| TypeScript | Pass | `node node_modules/typescript/lib/tsc.js --noEmit` passed after Next regenerated route types. |
| Recurring meeting date math | Pass | EMS second Wednesdays and Fire last Thursdays verified for Jul-Oct 2026. |
| Branding file check | Pass | Dark/light transparent PNGs and white-background PNG exist with expected dimensions and RGBA mode. |
| Forbidden Board copy/credential scan | Pass with out-of-scope note | Board files clean; unrelated `scripts/lounge-init.mjs` still contains a lounge formula comment. |

## Levy Scenario Smoke Values

| Levy Rate | Projected Levy Revenue | Funding Margin or Gap vs Required Revenue | Result |
| --- | ---: | ---: | --- |
| 0.20% | $701,409.60 | -$393,556.42 | Does Not Fully Fund Projected Model |
| 0.25% | $876,762.00 | -$218,204.02 | Does Not Fully Fund Projected Model |
| 0.30% | $1,052,114.40 | -$42,851.62 | Does Not Fully Fund Projected Model |
| 0.35% | $1,227,466.80 | $132,500.78 | Fully Funds Projected Model |
| 0.40% | $1,402,819.20 | $307,853.18 | Fully Funds Projected Model |

Required levy rate from workbook values: `0.312219%`.

## New Workbook Smoke Values

| Field | Workbook Value |
| --- | ---: |
| `Levy Calculator!B5` EAV | 350,704,800 |
| `Levy Calculator!B6` Selected levy rate | 0.004 |
| `Levy Calculator!E10` Total projected revenue | $1,782,619.20 |
| `Levy Calculator!E11` Total projected annual need | $1,474,766.02 |
| `Levy Calculator!E12` Funding margin | $307,853.18 |
| `Proposed Staffing!D31` Personnel total | $989,102.62 |
| `Operating Needs!G13` Operating total | $264,151.30 |
| Fleet lines from `Operating Needs` | $94,148.34 |
| `Debt & Liabilities!E12` Annual debt service | $115,580.11 |
| `Debt & Liabilities!D20` Payable catch-up | $28,165.33 |
| `Capital Reserves!F17` Capital reserve | $77,766.67 |

## Route Smoke Details

| Route | HTTP / Final Behavior |
| --- | --- |
| `/` | 200 |
| `/about` | 200 |
| `/contact` | 200 |
| `/fleet` | 200 |
| `/board/login` | 200 |
| `/board/referendum` unauthenticated | Final page `/board/login`, 200 |
| `/board` unauthenticated | Final page `/board/login`, 200 |

## Untested or Needs Manual Verification

1. Authenticated Kenneth login and first-name greeting.
2. Admin EAV save through the browser, including confirmation and reason.
3. Database audit rows in the target production database.
4. Meeting seed execution against the production database.
5. Role-by-role Fire Board visibility.
6. Microsoft Graph live workbook pull, because tenant/drive/item environment variables are not configured.
7. Sage actuals, because they are a Future Feature.
8. Screenshot-level public site regression.

## Required Functional Test Coverage

| Test Area | Status | Evidence / Limitation |
| --- | --- | --- |
| Login | Needs Manual Verification | Login route loads and API exists; no valid production credential was used in this pass. |
| Personalized welcome | Needs Manual Verification | Code renders `Welcome, {user.firstName}`; authenticated browser test not completed. |
| First-login password change | Needs Manual Verification | Route/API exist and build; no live credential test completed. |
| Logout | Needs Manual Verification | API exists and audits logout; authenticated browser test not completed. |
| Session timeout | Needs Manual Verification | Cookie max age exists in auth code; time-based browser test not run. |
| Forgot Password | Not Implemented | Not displayed because no functional reset flow exists. |
| No temporary-password formula visible | Pass | Board-scope scan passed; unrelated lounge seed comment remains outside Board scope. |
| No example username visible | Pass | Board login scan passed. |
| Kenneth administrator | Needs Manual Verification | Admin routes/API enforce `isAdmin`; live Kenneth login not tested. |
| Jennifer submitter | Needs Manual Verification | Role exists; full role browser test not run. |
| EMS Board | Needs Manual Verification | Role exists; full role browser test not run. |
| EMS president | Needs Manual Verification | Role exists; full role browser test not run. |
| Fire Board | Needs Manual Verification | Fire meeting eligibility coded; live role browser test not run. |
| Audit Reviewer | Needs Manual Verification | Role exists; final visibility policy needs Kenneth review. |
| Restricted URL rejection | Needs Manual Verification | Admin EAV/model-review routes enforce server-side admin checks; broader matrix not manually tested. |
| Restricted search/file-download rejection | Future Feature | Board search and secure workbook downloads are not implemented. |
| EMS second Wednesday | Pass | Date math checked for Jul-Oct 2026; seed code updated. |
| Fire Board last Thursday | Pass | Date math checked for Jul-Oct 2026; seed code updated. |
| Meeting time/address | Pass | Seed/default code uses 7:00 PM and 100 East Laurel Street, Millstadt, Illinois. |
| RSVP | Needs Manual Verification | API/component build and scoped lint pass; live submission not run. |
| EMS quorum of 3 | Pass | Seed/fallback code checked. |
| Official attendance, late arrival, early departure | Needs Manual Verification | Component/API updated; live secretary workflow not run. |
| One-instance change, series change, cancellation, special meeting | Future Feature | No management UI/workflow exists yet. |
| Questions before deadline / late / confidential | Needs Manual Verification | Code supports status/visibility/deadline; live role test not run. |
| Response workflow | Future Feature | No complete response-management UI exists. |
| Briefing generation/versioning/permission packets/archive retrieval | Future Feature | Not implemented. |
| Referendum route/projected language/no actual implication | Pass | Route smoke, copy scan, and source review passed. |
| Editable EAV, Calculate, Reset | Pass | Component logic and arithmetic checks passed; browser interaction still recommended. |
| Save as Model Value | Needs Manual Verification | API/UI implemented; Graph writeback remains Configuration Required. |
| Levy scenarios/funding margin/property-tax impact | Pass | Arithmetic smoke values documented above. |
| Five-year projection | Needs Manual Verification | Page reads imported workbook cache; visual/data reconciliation not fully tested. |
| Workbook download | Future Feature | Not implemented. |
| Model Review | Needs Manual Verification | Admin page builds; authenticated admin browser test not run. |
| Proposals/voting/signatures/final PDF | Future Feature | Not implemented. |
| Audit login/attendance/question/financial-model change | Needs Manual Verification | Audit calls exist; target DB audit rows not inspected. |
| Audit vote/download/permission/export | Future Feature | Related workflows not implemented. |
| Branding PNGs | Pass | Files exist and were visually inspected. |
| Responsive header and visual viewports | Blocked — Reason Documented | Browser-control tooling was unavailable; no Playwright/Chrome dependency exists in repo. |

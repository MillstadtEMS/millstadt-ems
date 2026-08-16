# Financial Information Hub Test Evidence

Evidence date: 2026-08-16. All test identities use reserved `.test` addresses and fictional names.

## Automated checks

| Command/check | Result |
| --- | --- |
| `npm run test:financials` | **26 checks passing.** Covers development availability/security headers, old dev-PIN rejection, PWA no-cache contract, privacy-shield state, Form 990 physical pages, CSRF/cross-site rejection, missing signature, persistence-before-success, idempotency, changed-payload conflict, pending viewer denial, signed PDFs, admin authorization, approval, stale approval, watermarking, revocation, accuracy CSRF/idempotency/upload magic, admin review, test-sink filtering, delivery-matrix routing/subjects/attachments, no recipient leakage, no URL identity, and rate limiting. |
| `npx tsc --noEmit` | Passing. |
| Scoped ESLint over all changed financial/PWA/security files | Passing. |
| `NEXT_DIST_DIR=.next-financials-build npm run build` | Passing on Next.js 16.3.1; 116 static pages generated and dynamic financial routes compiled. |
| `npm audit` and `npm audit --omit=dev` | Zero known vulnerabilities after updates. |
| Tracked-source and Git-history credential-pattern scan | Passing across 1,067 staged/tracked paths and Git patch history: zero AWS, Google API, GitHub token, OpenAI key, bounded Twilio SID, Slack token, or private-key markers. |
| Full `npm run lint` | **Not passing:** 93 errors and 67 warnings in pre-existing unrelated admin/lounge/game/CAD files. No rule was disabled. This remains a release blocker. |

## Financial integration result

The final run reported `26 financial hub integration checks passed.` The suite launches an isolated Next development server on port 3031, forces synthetic-only mode, clears Gmail/Twilio credentials, enables only an allowlisted `.test` sink, verifies a non-sink address is filtered, restores `tsconfig.json`, and stops the server after testing. Empty Gmail/Twilio credentials ensure no message can leave the test process.

## Production pre-launch smoke evidence

An isolated production build was started on port 3040 with hub production mode and delivery disabled. `/financials-information-hub` returned 200 with the exact `Financial Records Request`, `Coming Soon`, and construction wording; it omitted operational request/public-filing text and returned `Cache-Control: no-store, private`, financial CSP, and noindex headers. Status, document catalog, Form 990 catalog, and access-request APIs returned 404. The legacy lounge development login, development admin page, and development admin API returned 404. `/admin/financials` redirected to authentication. The temporary production server was stopped after verification.

## Browser evidence

- Chromium in-app browser: 390×844, 768×1024, and 1440×900.
- At each viewport: `Financial Information` rendered, no horizontal document overflow, no application error.
- Restricted `Call Volume Requests` selection -> `Continue`: URL remained `/financials-information-hub`, `Your information` rendered with six inputs, and page body remained nonblank.
- Keyboard traversal from `Full name` moved through six form inputs.
- Manual privacy activation produced an opaque `rgb(0, 0, 0)` sensitive-content layer with return warning and button.
- Current financial tab console: zero warnings/errors during the verified flow.
- Captures: `financial-information-mobile.png`, `financial-information-tablet.png`, `financial-information-desktop.png`, `financial-request-signature.png`, and `financial-privacy-shield.png` in the task output directory.

## PDF evidence

| Sanitized sample | Pages | Inspection |
| --- | ---: | --- |
| Synthetic Form 990 2023 | 2 | US Letter, searchable text, unique/readable pages, page numbers, rendered every page. |
| Synthetic Form 990 2024 | 3 | US Letter, searchable text, unique/readable pages, page numbers, rendered every page. |
| Signed restricted access request | 5 | Fictional Morgan Avery; ID/version/action/signature/page numbers; no blank/duplicate/orphaned pages; rendered every page. |
| Signed accuracy report | 4 | Fictional Taylor Morgan; report ID/version/signature/page numbers; no blank/duplicate pages; rendered every page. |
| Call Volume Requests bundle | 16 | Supplied 2022-2026 source PDFs merged; page count/text/contact sheet inspected. |

## Not run

Safari/WebKit and Firefox device runs, automated WCAG scanning, screen-reader sessions, authorized DAST, production database transaction tests, provider timeout/bounce/webhook tests, backup restore, production malware scanning, and protected-staging infrastructure tests could not run because those browsers/services/environments are not configured here. They are not marked passed.

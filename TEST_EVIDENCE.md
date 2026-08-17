# Financial Information Hub Test Evidence

Evidence date: 2026-08-16. All test identities use reserved `.test` addresses and fictional names.

## Automated checks

| Command/check | Result |
| --- | --- |
| `npm run test:financials` | **49 checks passing.** Covers the established financial and privacy controls plus the required production Coming Soon source, login return routing, administrator authorization, protected PDF upload and original-file access, private catalog persistence, archive/restore, exact public Form 990 delivery, malformed-PDF rejection, and approval-controlled viewing of an uploaded restricted document. |
| `npm run test:security` | **22 checks passing.** Covers public-form CSRF/schema/rate boundaries, retired patient/identity fields, encrypted new writes, private sensitive uploads and byte-signature checks, authenticated private reads, named admin access, session/login controls, headers, dependency automation, and the ticker/CAD shell contract. |
| `npx tsc --noEmit` | Passing. |
| Scoped ESLint over all changed financial/PWA/security files | Passing. |
| `NEXT_DIST_DIR=.next-security-build npm run build` | Passing on Next.js 16.3.1; 116 static pages generated and all reviewed public, Lounge, administrator, financial, privacy, and security routes compiled. Temporary build output and generated `tsconfig.json` edits were removed afterward. |
| `npm audit` and `npm audit --omit=dev` | Zero known vulnerabilities after updates. |
| Tracked-source and Git-history credential-pattern scan | Passing across 1,067 staged/tracked paths and Git patch history: zero AWS, Google API, GitHub token, OpenAI key, bounded Twilio SID, Slack token, or private-key markers. |
| Full `npm run lint` | **Not passing:** 93 errors and 67 warnings in pre-existing unrelated admin/lounge/game/CAD files. No rule was disabled. This remains a release blocker. |

## Financial integration result

The final run reported `49 financial hub integration checks passed.` The suite launches an isolated Next development server on port 3031, uses a temporary private document-library directory, forces synthetic-only financial and analytics stores, clears Gmail/Twilio credentials, enables an allowlisted `.test` sink plus one synthetic exact-address allowlist entry, verifies a non-allowlisted address is filtered, tests consent and withdrawal, audits requester signed-copy and decision-email attempts, exercises upload/catalog/approval/viewer/revocation behavior, restores `tsconfig.json`, removes the entire isolated Next build tree, and stops the server after testing. Empty Gmail/Twilio credentials ensure no message can leave the test process.

## Production pre-launch smoke evidence

An isolated production build was started on port 3040 with hub production mode and delivery disabled. `/financials-information-hub` returned 200 with the exact `Financial Records Request`, `Coming Soon`, and construction wording; it omitted operational request/public-filing text and returned `Cache-Control: no-store, private`, financial CSP, and noindex headers. Status, document catalog, Form 990 catalog, and access-request APIs returned 404. The legacy lounge development login, development admin page, and development admin API returned 404. `/admin/financials` redirected to authentication. The temporary production server was stopped after verification.

## Browser evidence

- Chromium in-app browser: 390×844, 768×1024, and 1440×900.
- Privacy page and preference dialog: existing weather/navigation/ticker shell remained present, no console errors, focusable close and equal-choice controls rendered, and limited mode accurately disclosed that optional analytics are disabled.
- Privacy page at 390×844: `scrollWidth` 385 with `innerWidth` 390, confirming no horizontal overflow; the footer Privacy link remained in the accessibility tree.
- Financial hub at 390×844: ticker and weather both loaded, `scrollWidth` 385 with `innerWidth` 390, and no application error.
- `Call Volume Requests` selection -> `Continue`: URL remained `/financials-information-hub`, the requester form and `Review terms and submit` rendered, and the page remained nonblank.
- At each viewport: `Financial Information` rendered, no horizontal document overflow, no application error.
- Restricted `Call Volume Requests` selection -> `Continue`: URL remained `/financials-information-hub`, `Your information` rendered with six inputs, and page body remained nonblank.
- Restricted terms acknowledgment remains visibly checked while the signature panel is open. Applying a signature reveals the separate final electronic-submission confirmation, and `Sign and submit request` stays disabled until that final confirmation is checked.
- Pointer-coordinate verification covers mouse, touch, and pen coordinate scaling through the canvas backing-store mapping at desktop, tablet, and phone sizes.
- Terms/report dialogs render above the fixed site ticker/header; the visible Close control and Escape both dismiss the dialog without changing routes.
- The live terms dialog renders the supplied administrative-review, accuracy, provenance, AI-processing, technical-control, and applicable-rights copy with no horizontal overflow.
- Keyboard traversal from `Full name` moved through six form inputs.
- Manual privacy activation produced an opaque `rgb(0, 0, 0)` sensitive-content layer with return warning and button.
- Current financial tab console: zero warnings/errors during the verified flow.
- Captures: `financial-information-mobile.png`, `financial-information-tablet.png`, `financial-information-desktop.png`, `financial-request-signature.png`, and `financial-privacy-shield.png` in the task output directory.

## PDF evidence

| Sanitized sample | Pages | Inspection |
| --- | ---: | --- |
| Synthetic Form 990 2023 | 2 | US Letter, searchable text, unique/readable pages, page numbers, rendered every page. |
| Synthetic Form 990 2024 | 3 | US Letter, searchable text, unique/readable pages, page numbers, rendered every page. |
| Signed restricted access request | 7 | Fictional Morgan Avery; exact acknowledgment, signature full name, electronic signature, final confirmation, terms, AI/provenance notices, methodology appendix, audit hash/filename, and page numbers; no clipping or overlap; rendered every page. |
| Signed accuracy report | 4 | Fictional Taylor Morgan; report ID/version/signature/page numbers; no blank/duplicate pages; rendered every page. |
| Call Volume Requests bundle | 16 | Supplied 2022-2026 source PDFs merged; page count/text/contact sheet inspected. |

## Not run

Safari/WebKit and Firefox device runs, automated WCAG scanning, screen-reader sessions, authorized DAST, production database transaction tests, provider timeout/bounce/webhook tests, backup restore, production malware scanning, and protected-staging infrastructure tests could not run because those browsers/services/environments are not configured here. They are not marked passed.

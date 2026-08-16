# Financial Information Hub Delivery Matrix

This matrix records the financial-information workflows implemented in this repository. It does not create new business rules. Production operation and real delivery remain disabled until the owner gives the exact command `GO LIVE` and the blockers in `BLOCKERS.md` are resolved.

## Restricted document access request

| Rule | Source of truth |
| --- | --- |
| Exact form name | `Review terms and submit` / restricted document access request. UI: `app/financials-information-hub/FinancialsArchivePrototype.tsx`; legal action label: `lib/financials-hub/types.ts` (`ACCEPTED_BUTTON_TEXT`). |
| Route | `POST /api/financials/access-requests`. Route: `app/api/financials/access-requests/route.ts`. |
| Required fields | Full name, email address, mailing address, city, state, ZIP code, one or more restricted document IDs, the exact acknowledgment text/action, and a valid signature. Validation: `lib/financials-hub/dev-store.ts` (`validateRequestInput`). |
| Optional fields | Address line 2 is accepted by the server but is not currently displayed in the public form. The requester may also ask for a signed-PDF copy by email. Source: `CreateRequestInput` in `lib/financials-hub/dev-store.ts`. |
| Field wording | Public labels and concise identification notice are in `FinancialsArchivePrototype.tsx`; approved acknowledgment text is `ACCEPTED_CHECKBOX_TEXT` in `lib/financials-hub/types.ts`. |
| Validation | Required-value checks, email format, catalog allowlist, exact acknowledgment/action text, typed-name equality, PNG signature structure/size, request source, CSRF, body limits, rate limit, and idempotency. Sources: route and store files above. |
| Signature | Required. Drawn PNG or typed full legal name. Signature is applied only after an affirmative action and is included in the server-generated signed agreement. Sources: `FinancialsSignaturePad.tsx`, `dev-store.ts`, `agreement-pdf.ts`. |
| Agreement/disclosure versions | `TERMS_VERSION`, `AI_NOTICE_VERSION`, and `PRIVACY_VERSION` in `lib/financials-hub/types.ts`; exact accepted versions are retained with the request and PDF. |
| Approval step | Required before restricted content can be viewed. An authorized administrator selects approved requested documents and an expiration. Source: `approveAccessRequest` in `lib/financials-hub/dev-store.ts`. |
| Authorized approver | Existing Millstadt administrator authentication, enforced server-side by `requireFinancialsAdmin` and `requireAdmin`. Development header bypass is available only when a server-side development admin code is configured and the hub is in development mode. Sources: `lib/financials-hub/api-helpers.ts`, `lib/admin/auth.ts`. |
| Approval trigger | Intentional `POST /api/admin/financials/access-requests/{id}/approve` from the protected admin route. The server rechecks request state, selected IDs, and document versions. |
| Delivery trigger | No file is delivered at submission. After approval, a short-lived viewer session may be created only for the exact approved request, user, document, and version. Sources: viewer-session routes and `createViewerSession`/`getViewerPage` in `dev-store.ts`. |
| Initial admin recipient | Server-only test recipient group configured by environment. Recipient addresses are intentionally not stored in source. Local delivery requires an explicit transport gate plus either a reserved sink domain or an exact-address test allowlist. Production remains disabled. Source: `lib/financials-hub/config.ts`. |
| CC/BCC | None implemented. Notification code passes one server-side `to` group and no CC/BCC. Source: `lib/financials-hub/notifications.ts`. |
| Subject | `[Millstadt EMS] New information request {request ID}`. Source: `notifyFinancialsHubAdmins`. |
| Email body | Deterministic plain-text body built by `buildAdminNotificationBody` in `notifications.ts`; it includes request metadata, requested documents, automated flags, and review instructions. |
| Attachments | Signed agreement PDF when generation succeeds. Source: `signedAgreementForRequest` and `notifyFinancialsHubAdmins`. |
| Requester confirmation | On-page confirmation is always shown. If the optional checkbox is selected, the signed request PDF is emailed after persistence and PDF generation, but only when the requester address passes the test-recipient allowlist and Gmail is configured. Approval, denial, revocation, and expiration actions send a separate requester decision email through the same allowlist. Source: `notifyRequesterSignedAgreement` and `notifyRequesterAccessDecision`. |
| Failure/retry | A valid request is persisted in the development store before notification. Notification failure does not erase the request. Durable provider retries are not implemented and remain a production blocker. |
| Retention | Development-only in-memory store; records are lost on process restart and may be reset by a protected development endpoint. No production retention schedule or persistent schema is implemented. |

## Accuracy or document-integrity report

| Rule | Source of truth |
| --- | --- |
| Exact form name | `Report an Accuracy or Document-Integrity Concern`. UI and exact disclosure text: `FinancialsArchivePrototype.tsx`; record definitions: `lib/financials-hub/accuracy-types.ts`. |
| Route | `GET /api/financials/accuracy-reports` prepares CSRF state; `POST /api/financials/accuracy-reports` submits multipart form data. |
| Required fields | Reporter full name, email, referenced document, page/section/location, concern category, specific concern, both exact good-faith acknowledgments, and a valid signature. Sources: route and `validateAccuracyInput` in `accuracy-store.ts`. |
| Optional fields | Telephone, supporting source, and one supporting PDF, DOCX, PNG, or JPEG up to 10 MB. |
| Field wording | `AccuracyReportDialog` in `FinancialsArchivePrototype.tsx` and constants in `accuracy-types.ts`. |
| Validation | Client and server required fields, email format, category allowlist, exact acknowledgment state, typed-name equality or PNG signature, same-origin/CSRF checks, rate limit, upload extension/MIME/magic/size checks, filename normalization, and development content scan. |
| Signature | Required. Drawn PNG or typed reporter name. Included in a deterministic server-generated signed report PDF. Sources: `FinancialsSignaturePad.tsx`, `accuracy-store.ts`, `accuracy-report-pdf.ts`. |
| Agreement/disclosure version | `ACCURACY_REPORT_VERSION` in `accuracy-types.ts`; retained on the report and signed PDF. |
| Approval step | Submission creates a private administrative-review report in `Received` status. It does not publish a correction or alter a source document. Authorized staff may update status, private note, and resolution in the protected admin route. |
| Authorized reviewer | Existing server-enforced Millstadt administrator authentication through `requireFinancialsAdmin`. |
| Review trigger | Intentional protected update to `PATCH /api/admin/financials/accuracy-reports/{id}`. |
| Delivery trigger | Initial private admin notification occurs only after the report and signed PDF are generated and stored. No public publication or requester delivery is implemented. |
| Initial admin recipient | Server-only environment-configured group. Source addresses are not committed. Real delivery is disabled during local, automated, preview, and pre-launch operation. |
| CC/BCC | None implemented. |
| Subject | `[Millstadt EMS] Accuracy report {report ID}`. Source: `notifyAccuracyReportAdmins`. |
| Email body | Deterministic body built by `buildAccuracyNotificationBody` in `notifications.ts`. |
| Attachments | Signed report PDF. A supporting upload is retained for authorized admin download and is not attached to the notification. |
| Requester confirmation | On-page receipt with reference number only. No requester email is implemented or authorized. |
| Failure/retry | The report is retained if notification fails. Durable delivery retry and provider-state tracking are not implemented and remain production blockers. |
| Retention | Development-only in-memory records and attachment buffers. No production persistence, encryption-at-rest configuration, or approved retention schedule is implemented. |

## Protected administrator actions

| Action | Route | Preconditions | Result |
| --- | --- | --- | --- |
| Approve access | `POST /api/admin/financials/access-requests/{id}/approve` | Authorized admin; current pending/under-review request; matching request version; selected requested documents; unchanged document versions | Records approval and expiration; enables later controlled-viewer authorization; attempts an allowlisted requester decision email. |
| Deny access | `POST /api/admin/financials/access-requests/{id}/deny` | Authorized admin; current pending/under-review request; matching request version | Records denial; no document access; attempts an allowlisted requester decision email. |
| Revoke access | `POST /api/admin/financials/access-requests/{id}/revoke` | Authorized admin; current approved request; matching request version | Removes approved IDs, invalidates active viewer sessions, and attempts an allowlisted requester decision email. |
| Expire access | `POST /api/admin/financials/access-requests/{id}/expire` | Authorized admin; current approved request; matching request version | Expires access, invalidates active viewer sessions, and attempts an allowlisted requester decision email. |
| Review accuracy report | `PATCH /api/admin/financials/accuracy-reports/{id}` | Authorized admin; allowed status; current report version/state | Records status, private note, resolution, reviewer, and timestamp in report activity. |

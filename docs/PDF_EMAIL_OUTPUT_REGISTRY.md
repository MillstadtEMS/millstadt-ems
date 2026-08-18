# PDF and Email Output Registry

## Scope and verification policy

This registry covers generated PDFs, uploaded PDF passthroughs, and non-CAD email
delivery. It deliberately excludes the protected CAD poller and call ticker.

- Development tests use fictional data only.
- Preview and development environments do not send email. Development delivery
  requires the explicit `ALLOW_DEVELOPMENT_OUTBOUND_EMAIL=true` override; Vercel
  preview remains disabled even when that override is present.
- `DISABLE_OUTBOUND_EMAIL=true` disables non-CAD delivery in every environment.
- Generated private employee and operational PDFs use private Vercel Blob references
  and authenticated application download routes. They are never returned as public
  Blob URLs.
- The five owner-supplied real Form 990 files remain ignored local development data.
  They are not tracked, previewed, emailed, or deployed.

## Generated PDF registry

All generators use Letter-size pages, a Millstadt EMS identity header, explicit
page totals, footer clearance, wrapping for unbounded text, and contained image
placement that preserves aspect ratio unless noted otherwise.

| Family | Generator and route | Authorization and storage | Filename / notable content | Verification |
| --- | --- | --- | --- | --- |
| Incident report | `lib/lounge/incident-pdf.ts`; `POST /api/lounge/incidents` | Named active employee; record visibility controls; email attachment is generated in memory | `incident-report-<id>.pdf`; incident metadata, narrative, people, actions, attachment thumbnails | Fictional 6-page stress sample; portrait and landscape images; no blank page |
| Employee form | `lib/lounge/forms/pdf.ts`; employee self-finalization and admin form routes | Employee may finalize their permitted form; admin routes require named admin; finalized copies are private | Registry-derived form filename; sections, answers, refusal state, signatures, rescission state | Fictional 10-page annual evaluation; long fields and signatures |
| Corrective action / write-up | `lib/lounge/writeup-pdf.ts`; admin finalize and PDF routes | Named admin; finalized saved copy is private; employee access only when explicitly shared | `corrective-action-<employee>-<date>.pdf`; draft/final state, facts, expectations, response, signatures | Fictional 7-page sample; internal manager note proven absent |
| Onboarding checklist | `lib/lounge/onboarding/pdf.ts`; admin finalize route | Named admin; finalized saved copy is private | `onboarding-checklist-<employee>-<date>.pdf`; requirements, notes, outcome, employee/admin/witness signatures | Fictional 5-page sample; long checklist labels and final notes |
| Policy acknowledgment memorandum | `lib/lounge/ack-pdf.ts`; employee acknowledgment route | Named employee acknowledging assigned notice; private saved copy | `acknowledgment-<notice>-<employee>.pdf`; official memorandum, notice ID, electronic acknowledgment | Fictional 3-page sample; long memorandum and contained signature |
| Truck check | `lib/truckcheck/pdf.ts`; `POST /api/truckcheck/submit` | Valid truck-check session or active Lounge employee; bounded same-origin JSON; saved PDF and signature-checked photos are private; submitting employee and admins may read the PDF | `truck-check-<unit>-<timestamp>.pdf`; 24-hour time, review result, item tables, comments, refill request, protected-photo labels, signatures | Fictional 8-page sample; long tables and narratives; private URLs excluded from PDF text |
| Personnel packet | `lib/lounge/personnel-pdf.ts`; admin packet route | Named admin only; generated on demand; download audited and `no-store` | `personnel-packet-<employee>-<date>.pdf`; cover, summary, records, attachment filenames | Fictional 6-page sample; private URLs proven absent |
| Board meeting minutes | `lib/board/minutes-pdf.ts`; board minutes PDF route | Signed-in board user with board access or minutes-edit authority; finalized signed EMS minutes only | `Millstadt-EMS-Board-Minutes-<date>.pdf`; meeting metadata, minutes, secretary certification | Fictional 8-page sample; 31 long agenda items |
| Inventory order / expired count | `lib/inventory/orderPdf.ts`; inventory email workflow | Named admin initiates delivery; generated in memory for email | `Back_Stock_Order_<date>.pdf` or `Expired_Count_<date>.pdf`; grouped shortfall or expired counts | Fictional 3-page order; fixed printable-width columns; no overflow warning |
| Saved inventory reports | `lib/inventory/pdf.ts`; admin inventory reports route | Named admin; private Blob storage; admin download through Lounge file route | `Order_Report_<date>.pdf`, `Expired_Items_<date>.pdf`, `Full_Inventory_<date>.pdf` | Fictional 6-page landscape full inventory; narrow numeric columns remain readable |
| Inventory QR sheet | `lib/inventory/qr-pdf.ts`; admin QR route | Named admin and same-origin POST | `QR_Codes_<category>.pdf`; 3 by 5 labels, item, location, inventory URL | Fictional 3-page sheet; QR quiet zones and full codes visible |
| Financial access agreement | `lib/financials-hub/agreement-pdf.ts`; protected Financials development workflows | Financials capability and request-token/admin rules; production capability disabled | Request-specific agreement filename; request metadata, terms, acknowledgment, signature | Fictional 4-page sample |
| Financial accuracy report | `lib/financials-hub/accuracy-report-pdf.ts`; protected Financials development workflows | Financials capability and request-token/admin rules; production capability disabled | Accuracy-agreement/report filename; concern, source, identity notice, signature | Fictional 5-page sample |
| Public Form 990 inspection copy | `lib/financials-hub/form990.ts`; Form 990 PDF route | `public990s` capability required; production capability disabled | `<id>-PUBLIC-FORM-990.pdf`; synthetic development document and provenance | Fictional 3-page synthetic sample only |

## Uploaded and passthrough PDFs

These files retain their supplied PDF bytes rather than being regenerated. Upload
routes validate PDF type and size according to their local workflow.

| Family | Ingestion / delivery | Visibility | Intentional treatment |
| --- | --- | --- | --- |
| Commercial Club bulletin | Admin upload or authorized fetch; Commercial Club public view | Public | Community publication; public Blob is intentional |
| Public newsletter archive | Scheduled authorized fetch and public archive | Public | Community publication; public Blob is intentional |
| Senior Center publication | Senior Center administrator upload and public page | Public | Community publication; public Blob is intentional |
| Approved budget / public board document | Admin upload and public budget or board surface | Public when explicitly published | Public-record publication; source PDF remains unchanged |
| Lounge personnel/supporting attachment | Employee/admin protected workflow and `/api/lounge/files` | Private unless the record explicitly grants employee visibility | Private Blob reference; authenticated streaming; `no-store`, `nosniff`, and no-index headers |
| Financial supporting document | Financials admin upload and protected document route | Financials capability/admin only; production capability disabled | No public Blob URL; original supplied PDF preserved |
| Truck-check photo | Authenticated, same-origin truck-check upload and photo streaming route | Private; valid truck-check session or active Lounge employee required | Byte signature checked; private reference is streamed with `no-store`, `nosniff`, and no-index headers |

## Email registry

Every non-CAD Gmail sender delegates MIME creation and delivery to
`lib/reports/gmail-message.ts`. The shared composer validates and deduplicates
addresses, flattens control characters in headers, encodes non-ASCII subjects,
provides both plain-text and HTML bodies, sanitizes attachment filenames and MIME
types, and uses correctly nested `multipart/alternative` and `multipart/mixed`
parts.

| Family | Trigger / recipients | Attachment | Delivery and idempotency notes |
| --- | --- | --- | --- |
| Testimonial moderation | Public submission to configured moderators | None | Submission persists if mail fails; review mutation requires named admin and is audited; scanner-safe links cannot mutate |
| Contact form | Public contact submission to configured EMS inbox | None | Bounded and escaped fields; notification omits unnecessary personal data; send failure is non-fatal |
| Employment application | Public application to configured hiring inbox | None | Notification omits full application contents and sensitive identifiers; saved submission remains authoritative |
| Applicant interview | Named admin schedules an applicant interview | None | Subject/header fields sanitized; application status records authoritative state |
| Employee message | Form assignment, form finalization/rescission, write-up, profile request, onboarding/administrative workflows | Optional private application link or generated PDF according to caller | Recipient lookup is employee-bound; per-workflow database state prevents duplicate finalized actions; generic helper itself is intentionally stateless |
| Administrator notification | Lounge requests, maintenance, truck wash, hospital suggestions, form workflow, weekly digest | Optional caller-provided PDF | Named workflow controls; generic helper is stateless, so repeat suppression remains caller-owned |
| Incident report | Employee incident submission to configured recipients | Generated incident PDF | Incident record stores email state; failure remains visible for administrative follow-up |
| Truck check report | Authenticated truck-check submission to configured recipients | Generated truck-check PDF | One report per saved submission; email failure does not discard the submission |
| Inventory notice | Count completed, QR recommendation, password change, order, or expired-count action | Order/expired PDF where applicable | Escaped employee/category/note content; durable inventory action/idempotency records are authoritative |
| Certification alert | Scheduled or workflow-triggered employee/admin certification warning | None | Certification event/audit state is authoritative; generic sender remains stateless |
| Board calendar reminder | Authorized cron to configured board recipients | None | `CRON_SECRET` required even when misconfigured; sent state is written only after actual delivery |
| Submission reminder | Authorized cron to assigned employees | None | Reminder timestamp is written only after actual delivery; preview-disabled calls do not create false sent state |
| Financials development notification | Access request, decision, document delivery, accuracy report, or administrative review | Agreement or protected report when configured | Test allowlist/sink only; Financials production capabilities and production data remain disabled |

## Automated verification

- `npm run test:reports` generates 14 fictional PDFs and one fictional `.eml` under
  ignored `tmp/` paths. It never sends mail.
- The PDF suite currently covers 77 nonblank pages. Extracted text confirms a
  complete `Page n of N` sequence on every file, no internal write-up note, and no
  private personnel attachment reference.
- Poppler-rendered contact sheets were visually inspected for clipping, blank final
  pages, footer collisions, table overflow, signature distortion, image cropping,
  and unreadable long-name behavior.
- The email fixture exercises control-character injection, duplicate/invalid
  recipients, UTF-8 subject encoding, plain-text conversion, HTML, attachment MIME
  metadata, filename sanitization, and all environment delivery gates.

## Residual operating requirements

- Delivery recipients and Gmail credentials must be owner-approved and configured
  in production before real delivery is enabled.
- Generic employee/admin email helpers are intentionally stateless. New callers must
  establish their own durable business-event idempotency before invoking them.
- Uploaded public PDFs require the same editorial approval as their public page.
- Legacy truck-check photos created before private storage was introduced require a
  separately approved production migration and public-Blob cleanup; preview work does
  not mutate existing production records or storage.
- Visual regression samples are fictional QA artifacts and remain ignored by Git.

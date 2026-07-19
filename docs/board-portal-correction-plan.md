# Board Portal Correction Plan

Date: July 18, 2026

## Completed in This Pass

| Area | Correction |
| --- | --- |
| Safety | Started from a clean tree, created `codex/board-portal-forensic-correction`, and preserved pre-change diff artifacts in `/tmp`. |
| Branding | Added transparent dark/light Board Portal lockups and a white-background print asset under `public/board/branding/`. |
| Login | Removed instructional/temporary-password copy and example username from `/board/login`. |
| Shell and design | Reworked the private Board shell with Board-specific sidebar/top navigation, Instrument Sans, IBM Plex Mono, and the requested dark/light color system. |
| Governance home | Replaced the financial overview on `/board` with a governance dashboard and one Referendum card. |
| Referendum separation | Kept projected financial model pages under `/board/referendum/*`; existing top-level financial routes redirect there. |
| Actuals separation | Added financial-data boundary modules so Referendum model data is separate from future Sage/actual financials. |
| Cash flow | Hid unsupported cash-flow page behind `ENABLE_ACTUAL_CASH_FLOW`; default redirects to Referendum. |
| EAV and levy | Added editable EAV scenario testing, Calculate, Reset, admin-only Save as Model Value, audit logging, and objective levy scenarios. |
| Meetings | Added EMS and Fire recurring meeting generation, correct schedule/time/address, Fire Board eligibility, and EMS quorum default of 3. |
| Attendance | Separated planned attendance responses from official secretary-confirmed attendance statuses. |
| Questions | Updated question categories, visibility labels, after-deadline marking, and confidential-review handling. |
| Credentials | Removed Board temporary-password formulas from Board seed scripts; moved seed/dev passwords to environment variables. |
| Documentation | Added forensic audit, correction plan, Excel integration, public regression, permission matrix, test report, and Vera review documents. |

## Remaining Future Feature Work

| Feature | Reason It Remains Future Feature |
| --- | --- |
| Microsoft Graph workbook sync | Needs tenant/app registration, delegated or application permissions, workbook drive item ID, read/write tests, conflict handling, and audit logging. |
| Sage actuals | No supported Sage API/export/actuals workbook is configured. |
| Board Briefings | Existing code supports pre-meeting questions but not generated briefing packets, distribution, or archives. |
| Proposals and voting | No Board proposal/vote/signature tables, APIs, or UI flows exist yet. |
| Minutes approval | No minutes document workflow exists yet. |
| Secure workbook downloads | Current workbook upload can cache/store a copy, but signed expiring download access is not implemented. |
| PDFs and archives | No Board PDF generation or archival index exists yet. |
| Notifications | Dashboard metric is present, but no Board notification workflow exists yet. |
| Audit dashboard | Audit entries exist, but no Board-facing audit review UI exists yet. |

## Deployment Notes

1. Run the Board meeting seed against the target database so EMS and Fire recurring meetings are corrected.
2. Set `BOARD_INITIAL_TEMP_PASSWORD` before running Board seed scripts.
3. Leave `ENABLE_ACTUAL_FINANCIALS=false` and `ENABLE_ACTUAL_CASH_FLOW=false` until a verified actual-financial source is connected.
4. Configure Microsoft Graph before treating EAV workbook writeback as complete.
5. Have Kenneth James review the Fire Board visibility policy and final financial-model assumptions before production use.

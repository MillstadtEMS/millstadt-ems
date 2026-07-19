# Excel Integration

Date: July 18, 2026

## Workbook Identity

| Field | Value |
| --- | --- |
| Purpose | Referendum Financial Model |
| OneDrive folder | `01. BOD WEBMASTER` |
| File | `Millstadt EMS referendum budget web master.xlsx` |
| Expected OneDrive path | `/01. BOD WEBMASTER/Millstadt EMS referendum budget web master.xlsx` |
| Fiscal year label | FY 2026-27 planning model |
| OneDrive owner | `millstadtems@gmail.com` |
| Historical local reviewed copy | `/Users/kj/Desktop/Millstadt_EMS_Referendum_Financial_Model (1).xlsx` |

This workbook is the projected planning model for the proposed EMS District. It is not the current Sage accounting ledger and must not be treated as actual current cash flow.

## Current Portal Behavior

| Flow | Status | Notes |
| --- | --- | --- |
| Admin workbook upload | Complete | `/api/board/admin/import` parses an uploaded `.xlsx` and refreshes the portal cache tables. |
| OneDrive workbook pull | Code complete; requires Microsoft configuration | `/api/board/referendum/sync` downloads the workbook from Microsoft Graph and runs the same importer. |
| Referendum read cache | Complete | Referendum pages read cached rows from `board_finance`, `board_budget_lines`, `board_personnel`, `board_truck`, `board_debt`, and `board_forecast`. |
| EAV scenario calculate | Complete | `/board/referendum/levy` calculates locally from workbook-sourced EAV, selected levy rate, current ambulance-fund revenue, and required levy revenue. |
| EAV save to portal cache | Complete | `/api/board/referendum/eav` requires admin permission, confirmation in UI, reason, old/new audit detail, and marks sync as pending. |

## OneDrive Sync Configuration

Set these environment variables in the deployed site:

| Variable | Purpose |
| --- | --- |
| `MICROSOFT_TENANT_ID` | Microsoft Entra tenant ID. |
| `MICROSOFT_CLIENT_ID` | App registration client ID. |
| `MICROSOFT_CLIENT_SECRET` | App registration secret. |
| `REFERENDUM_WORKBOOK_DRIVE_ID` | Stable Microsoft Graph drive ID containing the workbook. |
| `REFERENDUM_WORKBOOK_ITEM_ID` | Stable Microsoft Graph item ID for the workbook. |
| `REFERENDUM_WORKBOOK_EXPECTED_FOLDER` | Server-only guardrail. Defaults to `01. BOD WEBMASTER`. |
| `REFERENDUM_WORKBOOK_EXPECTED_FILENAME` | Server-only guardrail. Defaults to `Millstadt EMS referendum budget web master.xlsx`. |
| `REFERENDUM_WORKBOOK_EXPECTED_ACCOUNT` | Server-only guardrail. Defaults to `millstadtems@gmail.com`. |
| `BOARD_SYNC_SECRET` | Optional bearer secret for cron or webhook-triggered sync. |

Do not use a OneDrive folder or workbook sharing link as a credential, drive ID, or item ID. The shared links are only a way for an administrator to open the file in a browser. Production sync must use the `parentReference.driveId` and `item.id` returned by authenticated Microsoft Graph metadata for the exact workbook path above.

The sync endpoint supports both:

- Admin manual call while signed in: `POST /api/board/referendum/sync`
- Scheduled/webhook call: `GET /api/board/referendum/sync` with `Authorization: Bearer $BOARD_SYNC_SECRET`

The Microsoft Graph connection must be approved for the `millstadtems@gmail.com` OneDrive account. Workbook discovery should use delegated Graph access to locate `/01. BOD WEBMASTER/Millstadt EMS referendum budget web master.xlsx`, confirm the connected account, and then store only the stable Drive ID and Item ID in the deployed environment. The portal reads the workbook content and imports formula results; it does not store passwords, signatures, or audit records in Excel.

## Editable Field Map

| Portal Field | Workbook Location | Access | Roles Allowed to Edit | Validation |
| --- | --- | --- | --- | --- |
| Equalized Assessed Value (EAV) | `Levy Calculator!B5` | Editable | `admin` | Positive finite number; reject zero, negative, and non-numeric values. |
| Selected Levy Rate | `Levy Calculator!B6` | Editable in workbook | `admin` | Decimal rate, for example `0.0025` for 0.25% or `0.003` for 0.30%. |
| Collection Factor | `Levy Calculator!B7` | Editable in workbook | `admin` | Positive collection factor. |
| Projected Levy Revenue | `Levy Calculator!E5` | Read-only | None | Formula cell; do not write from portal. |
| Total Projected Revenue | `Levy Calculator!E10` | Read-only | None | Formula cell; do not write from portal. |
| Total Projected Annual Need | `Levy Calculator!E11` | Read-only | None | Formula cell tied to `Referendum Overview!F10`. |
| Projected Funding Margin/(Gap) | `Levy Calculator!E12` | Read-only | None | Formula cell; do not write from portal. |
| Break-Even Levy Rate | `Levy Calculator!E13` | Read-only | None | Formula cell; do not write from portal. |

## Imported Workbook Sections

| Worksheet | Portal Use |
| --- | --- |
| `Model Inputs` | Current ambulance-fund revenue, call-volume/billing assumptions, other projected revenue. |
| `Proposed Staffing` | Personnel groups, gross payroll, employer cost detail, projected personnel total. |
| `Operating Needs` | Detailed operating line items; Fleet category also powers the fleet page. |
| `Debt & Liabilities` | Debt schedule, annual debt service, payable catch-up, total obligations. |
| `Capital Reserves` | Capital replacement reserve line items and annual reserve total. |
| `Levy Calculator` | EAV, selected levy rate, projected revenue, margin/gap, break-even levy rate. |
| `Referendum Overview` | Annual need summary and source cross-checks. |

## Required Microsoft Graph Validation

Do not mark the live integration complete until all items below pass:

1. Authentication works for the approved Microsoft tenant/account.
2. Connected Microsoft account is exactly `millstadtems@gmail.com`.
3. The workbook path lookup is the URL-encoded equivalent of `/01. BOD WEBMASTER/Millstadt EMS referendum budget web master.xlsx`; do not build the URL from unsafe string concatenation.
4. The returned item name is exactly `Millstadt EMS referendum budget web master.xlsx`.
5. The returned parent folder is exactly `01. BOD WEBMASTER`.
6. The returned item is a file, not a folder.
7. The returned filename has the `.xlsx` extension.
8. The configured Drive ID is `parentReference.driveId` from Microsoft Graph.
9. The configured Item ID is `item.id` from Microsoft Graph.
10. No OneDrive sharing link is stored in `REFERENDUM_WORKBOOK_DRIVE_ID`, `REFERENDUM_WORKBOOK_ITEM_ID`, client code, or normal-user UI.
11. The portal can download the workbook and import `Levy Calculator!B5`, `B6`, `E10`, `E11`, and `E12`.
12. A scheduled sync or webhook updates the portal after a OneDrive edit.
13. Failed sync leaves the portal in an honest configuration/error state without pretending Excel was updated.
14. Audit logs record sync success/failure, actor or system user, timestamp, and imported row counts.

## Separation From Actual Financials

| Data Family | Source | Portal Module | Status |
| --- | --- | --- | --- |
| Referendum projected model | OneDrive referendum workbook | `lib/board/financialData/referendum/*` | Active cache and UI |

## Audit Expectations

Every administrator model change should write an append-only `board_audit` row. The EAV save route currently records:

- Acting user id, username, and role
- Action `referendum_eav_saved`
- Old value
- New value
- Reason
- Synchronization result
- Request IP when available

The workbook must never be used to store portal passwords, signatures, or audit records.

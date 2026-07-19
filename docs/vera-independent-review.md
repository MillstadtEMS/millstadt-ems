# Vera Independent Review

Date: July 18, 2026
Status: Blocked — Reason Documented

Supersession note: this blocked review was performed against the earlier workbook named `Millstadt EMS District Budget FY2026-27 final1.xlsx`. The active portal source has since been changed to `Millstadt_EMS_Referendum_Financial_Model (1).xlsx`; see `docs/excel-integration.md` and `docs/board-portal-test-report.md` for the current workbook mapping and smoke values.

## Independence Status

An independent Vera-style review subagent was started for this task with read-only instructions covering:

- Master prompt coverage
- Current Board Portal code
- The FY 2026–27 referendum workbook
- Security and permission concerns
- Numeric checks for EAV and levy scenarios

The reviewer did not return a final report before the task was interrupted and the agent was shut down. Therefore this file must not be treated as an independent Vera sign-off.

## Local Evidence Checked

| Evidence | Result |
| --- | --- |
| Master prompt | Read from `/Users/kj/.codex/attachments/ff0947cc-c5b5-4400-a258-36400dbce144/pasted-text.txt`. |
| Workbook | Opened `/Users/kj/Desktop/Millstadt EMS District Budget FY2026-27 final1.xlsx` with `xlsx`. |
| Workbook sheets | Verified sheets include Executive Dashboard, Assumptions, Tax Rate Calculator, Levy Comparison, Personnel, Truck Maintenance, Debt Schedule, Tax Distributions, Five-Year Forecast, Audit, Review Needed, and CFO Report. |
| EAV | `Assumptions!B66 = 350,704,800`. Workbook note says EAV is implied by district-provided levy figures and requires county-clerk verification. |
| Required levy revenue | `Executive Dashboard!B12 = 1,070,961.194666667`. |
| Total projected expenses | `Executive Dashboard!B6 = 1,450,761.194666667`. |
| 0.30% levy revenue | `Tax Rate Calculator!B8 = 1,052,114.4`. |
| Workbook review items | `Review Needed` flags EAV verification, EMS billing, billing rate, insurance, debt-rate details, starting cash, and other items as unresolved. |

## Numeric Cross-Check

Using EAV `350,704,800` and required levy revenue `1,070,961.194666667`:

| Levy Rate | Projected Levy Revenue | Margin / Gap vs Required Levy Revenue | Result |
| --- | ---: | ---: | --- |
| 0.20% | $701,409.60 | -$369,551.59 | Does Not Fully Fund Projected Model |
| 0.25% | $876,762.00 | -$194,199.19 | Does Not Fully Fund Projected Model |
| 0.30% | $1,052,114.40 | -$18,846.79 | Does Not Fully Fund Projected Model |
| 0.35% | $1,227,466.80 | $156,505.61 | Fully Funds Projected Model |
| 0.40% | $1,402,819.20 | $331,858.01 | Fully Funds Projected Model |

Computed required levy rate: `0.305374%`.

## Findings

| Finding | Severity | Evidence | Required Action |
| --- | --- | --- | --- |
| Independent review not completed | High | Subagent was started but returned no final report before shutdown. | Kenneth James should obtain a completed independent review before relying on this as final assurance. |
| EAV remains externally unverified | High | Workbook `Assumptions!C66` and `Review Needed #1` explicitly require county-clerk verification. | Confirm district EAV, boundaries, TIF/enterprise-zone exclusions, PTELL applicability, and first-year collection timing. |
| Sage actuals are not connected | High | Actual/Sage adapters return Future Feature or Configuration Required. | Do not present current financial actuals until a real Sage API, verified export, or approved actuals workbook is connected. |
| Graph workbook writeback is not configured | High | EAV save route updates portal cache and audit status only; docs mark Graph as Configuration Required. | Complete Microsoft Graph authentication, workbook read, approved write, conflict handling, and failure-state tests. |
| Board Briefings and other governance workflows remain future work | Medium | Audit matrix marks briefings, proposals, voting, signatures, PDFs, secure downloads, archives, and notifications as Future Feature. | Build and test each workflow before marking the portal complete under the master prompt definition. |
| Fire Board visibility needs owner approval | Medium | Code gives Fire members their own calendar and gives admin/audit/president both calendars. | Kenneth James should approve the final Fire visibility and audit-reviewer policy. |

## Final Independent Status

Needs Review by Kenneth James.

This pass corrected and tested substantial Board Portal behavior, but the independent Vera review requirement is not fully satisfied because the independent reviewer did not complete. The workbook numbers above were locally cross-checked, and the remaining external-verification issues are documented rather than treated as resolved.

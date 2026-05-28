@AGENTS.md

# Millstadt EMS Inventory App Rules

## Stack + Quality
- Follow existing project patterns before creating new ones.
- Prefer maintainable solutions over hacks.
- Keep UI premium, readable, and mobile-first.
- Never hardcode secrets in client-side code.
- All auth, passwords, tokens, and email credentials must stay server-side.

## Workflow
- Explore first, then plan, then implement.
- For large features, do not skip planning.
- After implementation, run typecheck, lint, and relevant tests.
- For UI work, verify responsive behavior on desktop and portrait mobile.
- Fix root causes, not surface symptoms.

## Inventory Module Requirements
- Source of truth for initial inventory is the attached Excel workbook:
  "2026 Millstadt EMS Order _ Inv Form.xlsx"
- Parse all workbook tabs and preserve tab names as categories.
- CSV files must not be used as the primary inventory source.
- /inventory must be password-protected server-side.
- /inventory/scan/[token] must remain limited-scope and public without exposing protected areas.
- /admin must contain inventory reports and inventory settings.
- Inventory password must be changeable in /admin by authorized admins only.
- Never expose the inventory password in the client bundle, public HTML, or API responses.

## Verification
- Verify login flow
- Verify admin password change flow
- Verify QR workflow
- Verify concurrent edits
- Verify PDF generation
- Verify email alert flow
- Verify mobile layout

## Treasurer / Budget Workflow (autonomous)
- Treasurer and master budget Excel files live on ~/Desktop:
  - Treasurer: ~/Desktop/Code Stuff/Final MEMS Budget/CPA/FINAL_Millstadt_Ambulance_Treasurer_Reports.xlsx
  - Master:    ~/Desktop/Budget/FY2025-2026/Millstadt_Ambulance_Financial_Master_FY2025-2026.xlsx
  - Monthly bills source: ~/Desktop/<Month YYYY> bills.xlsx (e.g. "April 2026 bills.xlsx")
- Always make a *.BACKUP_YYYY-MM-DD_pre_<reason>.xlsx copy before editing either file.
- When the user hands over a month of numbers:
  1. Read the bills workbook; treat the Operating Expenses tab as source of truth.
     The Income and Personnel tabs in the bills workbook are template leftovers — ignore unless the user tells you otherwise.
  2. Write April-style transactions into the Treasurer Transactions tab.
  3. Write line-itemized entries into the Master <Mon YY> monthly sheet, the Monthly Detail register, and the Revenue Detail.
  4. Repair any cross-sheet references that shifted (Dashboard, Fiscal Year Summary, Audit Trail).
  5. Run a full audit and tell the user the result.
- Do not ask yes/no permission questions for routine spreadsheet work in these files — make a decision using prior-month precedents and proceed.
- Acceptable autonomous decisions: category mappings using prior-month precedent; relabel duplicate template rows to defuse double-counting; remove unused/zero rows when account numbers change; update stale hard-coded reference values in the Audit Trail; fix vendor categorization errors discovered during audit.
- Always report what you changed at the end. If something genuinely cannot be inferred (e.g., a number the user hasn't shared yet), state the gap rather than guess.

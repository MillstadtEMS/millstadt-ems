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

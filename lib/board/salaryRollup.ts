export const SALARY_ROLLUP_LABEL = "Salaries";

const SALARY_ROLE_RE = /\b(?:chiefs?|paramedics?|medics?|emts?|emt)\b/i;
const NON_BASE_PAY_RE = /\b(?:holiday|premium|differential|overtime|allowance|pto|backfill|training|uniform|tax|benefit)\b/i;

export function isSalaryRoleLabel(label: string | null | undefined): boolean {
  const text = label ?? "";
  return SALARY_ROLE_RE.test(text) && !NON_BASE_PAY_RE.test(text);
}

export function cleanHeadcount(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (!Number.isInteger(value)) return null;
  if (value < 0 || value > 100) return null;
  return value;
}

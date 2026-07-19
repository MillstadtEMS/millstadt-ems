export const SALARY_ROLLUP_LABEL = "Salaries";

const SALARY_ROLE_RE = /\b(?:chiefs?|paramedics?|medics?|emts?|emt)\b/i;

export function isSalaryRoleLabel(label: string | null | undefined): boolean {
  return SALARY_ROLE_RE.test(label ?? "");
}

/** Board Portal — detailed projected line items from the imported workbook. */
import { ensureBoardSchema, sql } from "./db";

export interface BudgetLine { section: string; category: string; amount: number | null; status: string | null; sort: number }
export interface BudgetSection { name: string; total: number; lines: BudgetLine[] }

export async function getBudgetSections(): Promise<BudgetSection[]> {
  await ensureBoardSchema();
  const db = sql();
  let raw: Record<string, unknown>[] = [];
  try {
    raw = (await db`SELECT section, category, amount, status, sort FROM board_budget_lines ORDER BY sort ASC`) as Record<string, unknown>[];
  } catch { return []; }
  const map = new Map<string, BudgetSection>();
  for (const r of raw) {
    const section = String(r.section);
    const line: BudgetLine = {
      section,
      category: String(r.category),
      amount: r.amount != null ? Number(r.amount) : null,
      status: r.status != null ? String(r.status) : null,
      sort: Number(r.sort ?? 0),
    };
    if (!map.has(section)) map.set(section, { name: section, total: 0, lines: [] });
    const s = map.get(section)!;
    s.lines.push(line);
    s.total += line.amount ?? 0;
  }
  return Array.from(map.values());
}

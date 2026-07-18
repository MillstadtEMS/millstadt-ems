/** Board Portal — personnel cost breakdown (per group + employer detail). */
import { ensureBoardSchema, sql } from "./db";

export interface PersonnelGroup {
  name: string; count: number | null; rate: number | null; gross: number | null;
  taxes: number | null; benefits: number | null; uniform: number | null; training: number | null;
  total: number | null; perEmployee: number | null;
}
export interface CostLine { label: string; amount: number | null }

const n = (x: unknown) => (x != null ? Number(x) : null);

export async function getPersonnel(): Promise<{ groups: PersonnelGroup[]; costs: CostLine[] }> {
  await ensureBoardSchema();
  const db = sql();
  let groups: PersonnelGroup[] = [], costs: CostLine[] = [];
  try {
    const g = (await db`SELECT * FROM board_personnel ORDER BY sort ASC`) as Record<string, unknown>[];
    groups = g.map((r) => ({
      name: String(r.name), count: n(r.count), rate: n(r.rate), gross: n(r.gross),
      taxes: n(r.taxes), benefits: n(r.benefits), uniform: n(r.uniform), training: n(r.training),
      total: n(r.total), perEmployee: n(r.per_employee),
    }));
    const c = (await db`SELECT label, amount FROM board_personnel_costs ORDER BY sort ASC`) as Record<string, unknown>[];
    costs = c.map((r) => ({ label: String(r.label), amount: n(r.amount) }));
  } catch { /* not imported yet */ }
  return { groups, costs };
}

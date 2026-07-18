/** Board Portal — monthly cash flow series. */
import { ensureBoardSchema, sql } from "./db";

export interface CashMonth { idx: number; month: string; beginning: number | null; net: number | null; ending: number | null }

export async function getCashflow(): Promise<CashMonth[]> {
  await ensureBoardSchema();
  const db = sql();
  try {
    const raw = (await db`SELECT month_idx, month, beginning, net, ending FROM board_cashflow ORDER BY month_idx ASC`) as Record<string, unknown>[];
    return raw.map((r) => ({
      idx: Number(r.month_idx),
      month: String(r.month),
      beginning: r.beginning != null ? Number(r.beginning) : null,
      net: r.net != null ? Number(r.net) : null,
      ending: r.ending != null ? Number(r.ending) : null,
    }));
  } catch { return []; }
}

/** Board Portal — fleet maintenance, debt schedule, and five-year forecast read layer. */
import { ensureBoardSchema, sql } from "./db";

const n = (x: unknown) => (x != null ? Number(x) : null);

export interface TruckMonth { label: string; amount: number }
export interface TruckUnit { unit: string; fyTotal: number | null; months: TruckMonth[] }

export async function getTruckMaintenance(): Promise<TruckUnit[]> {
  await ensureBoardSchema();
  const db = sql();
  try {
    const rows = (await db`SELECT unit, fy_total, months FROM board_truck ORDER BY sort ASC`) as Record<string, unknown>[];
    return rows.map((r) => ({
      unit: String(r.unit),
      fyTotal: n(r.fy_total),
      months: (Array.isArray(r.months) ? r.months : []) as TruckMonth[],
    }));
  } catch { return []; }
}

export interface DebtRow {
  creditor: string; purpose: string | null; balance: number | null; rate: number | null;
  rateNote: string | null; monthly: number | null; annual: number | null; remaining: number | null;
  payoff: string | null; notes: string | null; kind: string;
}

export async function getDebt(): Promise<DebtRow[]> {
  await ensureBoardSchema();
  const db = sql();
  try {
    const rows = (await db`SELECT * FROM board_debt ORDER BY sort ASC`) as Record<string, unknown>[];
    return rows.map((r) => ({
      creditor: String(r.creditor), purpose: r.purpose ? String(r.purpose) : null,
      balance: n(r.balance), rate: n(r.rate), rateNote: r.rate_note ? String(r.rate_note) : null,
      monthly: n(r.monthly), annual: n(r.annual), remaining: n(r.remaining),
      payoff: r.payoff ? String(r.payoff) : null, notes: r.notes ? String(r.notes) : null,
      kind: String(r.kind),
    }));
  } catch { return []; }
}

export interface ForecastRow {
  scenario: string; category: string; y: (number | null)[]; isTotal: boolean;
}

export async function getForecast(): Promise<Record<string, ForecastRow[]>> {
  await ensureBoardSchema();
  const db = sql();
  const out: Record<string, ForecastRow[]> = {};
  try {
    const rows = (await db`SELECT * FROM board_forecast ORDER BY sort ASC`) as Record<string, unknown>[];
    for (const r of rows) {
      const s = String(r.scenario);
      (out[s] ??= []).push({
        scenario: s, category: String(r.category),
        y: [n(r.y1), n(r.y2), n(r.y3), n(r.y4), n(r.y5)],
        isTotal: Boolean(r.is_total),
      });
    }
  } catch { /* not imported yet */ }
  return out;
}

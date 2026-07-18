/**
 * Board Portal — financial read layer.
 *
 * Reads the cached figures in `board_finance` (populated from the workbook by
 * scripts/board-setup.mjs, and later by the live OneDrive/Graph sync). Every
 * value carries the source cell and a "needs review" flag so the portal can
 * be honest about what is estimated or unverified.
 */
import { ensureBoardSchema, sql } from "./db";

export interface FinanceRow {
  key: string;
  label: string;
  value: number | null;
  textValue: string | null;
  unit: string | null;
  grouping: string | null;
  sort: number;
  sourceCell: string | null;
  needsReview: boolean;
  updatedAt: string;
}

export async function getFinance(): Promise<{ rows: FinanceRow[]; byKey: Record<string, FinanceRow>; updatedAt: string | null }> {
  await ensureBoardSchema();
  const db = sql();
  const raw = (await db`SELECT * FROM board_finance ORDER BY sort ASC, key ASC`) as Record<string, unknown>[];
  const rows: FinanceRow[] = raw.map((r) => ({
    key: String(r.key),
    label: String(r.label),
    value: r.value != null ? Number(r.value) : null,
    textValue: r.text_value != null ? String(r.text_value) : null,
    unit: r.unit != null ? String(r.unit) : null,
    grouping: r.grouping != null ? String(r.grouping) : null,
    sort: Number(r.sort ?? 0),
    sourceCell: r.source_cell != null ? String(r.source_cell) : null,
    needsReview: r.needs_review === true,
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
  }));
  const byKey: Record<string, FinanceRow> = {};
  let latest: string | null = null;
  for (const r of rows) {
    byKey[r.key] = r;
    if (!latest || r.updatedAt > latest) latest = r.updatedAt;
  }
  return { rows, byKey, updatedAt: latest };
}

export function money(n: number | null | undefined, opts: { cents?: boolean } = {}): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: opts.cents ? 2 : 0, maximumFractionDigits: opts.cents ? 2 : 0,
  });
}
export function pct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

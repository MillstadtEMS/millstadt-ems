/**
 * Board Portal — fleet / debt / forecast detail seeder.
 *
 *   node scripts/board-detail-import.mjs ["/path/to/workbook.xlsx"]
 *
 * Populates board_truck, board_debt, and board_forecast from the FY workbook.
 * Mirrors the parsing in lib/board/import.ts (which the admin upload uses) so
 * the CLI can seed Neon directly. Reads DATABASE_URL from .env.local; contains
 * no financial data itself.
 */
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { neon } from "@neondatabase/serverless";

const WB = process.argv[2] || `${process.env.HOME}/Desktop/Millstadt EMS District Budget FY2026-27 final1.xlsx`;
const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const url = env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
if (!url) { console.error("DATABASE_URL not found in .env.local"); process.exit(1); }
const sql = neon(url);

const wb = XLSX.read(readFileSync(WB), { type: "buffer", cellDates: true });
const val = (s, a) => (s && s[a] ? s[a].v : null);
const numOrNull = (x) => (typeof x === "number" ? x : null);
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function fmtPayoff(v) {
  if (v == null) return null;
  if (v instanceof Date) return `${MONTHS[v.getUTCMonth()]} ${v.getUTCFullYear()}`;
  if (typeof v === "number") { const d = new Date(Date.UTC(1899, 11, 30)); d.setUTCDate(d.getUTCDate() + v); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; }
  return String(v).replace(/\s*00:00:00.*$/, "").trim();
}

// ── board_truck ──
await sql`CREATE TABLE IF NOT EXISTS board_truck (id BIGSERIAL PRIMARY KEY, unit TEXT NOT NULL, fy_total DOUBLE PRECISION, months JSONB, sort INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
const tm = wb.Sheets["Truck Maintenance"];
if (tm) {
  await sql`DELETE FROM board_truck`;
  const mcols = ["B","C","D","E","F","G","H","I","J","K","L","M"];
  let n = 0;
  for (let r = 5; r <= 7; r++) {
    const nameRaw = val(tm, `A${r}`);
    if (typeof nameRaw !== "string" || !nameRaw.trim()) continue;
    const unit = nameRaw.replace(/^Truck Repairs\s*/i, "Unit ").trim();
    const months = mcols.map((c) => ({ label: String(val(tm, `${c}4`) ?? c), amount: numOrNull(val(tm, `${c}${r}`)) ?? 0 }));
    await sql`INSERT INTO board_truck (unit, fy_total, months, sort) VALUES (${unit}, ${numOrNull(val(tm, `N${r}`))}, ${JSON.stringify(months)}::jsonb, ${(r - 5) * 10})`;
    n++;
  }
  console.log(`board_truck: ${n} units`);
}

// ── board_debt ──
await sql`CREATE TABLE IF NOT EXISTS board_debt (id BIGSERIAL PRIMARY KEY, creditor TEXT NOT NULL, purpose TEXT, balance DOUBLE PRECISION, rate DOUBLE PRECISION, rate_note TEXT, monthly DOUBLE PRECISION, annual DOUBLE PRECISION, remaining DOUBLE PRECISION, payoff TEXT, notes TEXT, kind TEXT NOT NULL DEFAULT 'amortizing', sort INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
const ds = wb.Sheets["Debt Schedule"];
if (ds) {
  await sql`DELETE FROM board_debt`;
  const rows = [[5,"amortizing"],[6,"amortizing"],[7,"amortizing"],[8,"amortizing"],[9,"amortizing"],[10,"amortizing"],[12,"payable"],[13,"payable"]];
  let sort = 0, n = 0;
  for (const [r, kind] of rows) {
    const creditor = val(ds, `A${r}`);
    if (typeof creditor !== "string" || !creditor.trim()) continue;
    const rateRaw = val(ds, `E${r}`);
    const rate = numOrNull(rateRaw);
    const rateNote = rate == null && typeof rateRaw === "string" ? rateRaw : null;
    const str = (a) => { const v = val(ds, a); return v != null ? String(v) : null; };
    sort += 10;
    await sql`INSERT INTO board_debt (creditor, purpose, balance, rate, rate_note, monthly, annual, remaining, payoff, notes, kind, sort)
              VALUES (${creditor.trim()}, ${str(`B${r}`)}, ${numOrNull(val(ds, `D${r}`))}, ${rate}, ${rateNote},
                      ${numOrNull(val(ds, `F${r}`))}, ${numOrNull(val(ds, `G${r}`))}, ${numOrNull(val(ds, `H${r}`))},
                      ${fmtPayoff(val(ds, `I${r}`))}, ${str(`J${r}`)}, ${kind}, ${sort})`;
    n++;
  }
  console.log(`board_debt: ${n} obligations`);
}

// ── board_forecast ──
await sql`CREATE TABLE IF NOT EXISTS board_forecast (id BIGSERIAL PRIMARY KEY, scenario TEXT NOT NULL, category TEXT NOT NULL, y1 DOUBLE PRECISION, y2 DOUBLE PRECISION, y3 DOUBLE PRECISION, y4 DOUBLE PRECISION, y5 DOUBLE PRECISION, is_total BOOLEAN NOT NULL DEFAULT FALSE, sort INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
const fc = wb.Sheets["Five-Year Forecast"];
if (fc) {
  await sql`DELETE FROM board_forecast`;
  const blocks = [["Low", 6], ["Expected", 16], ["High", 26]];
  const ycols = ["B","C","D","E","F"];
  let sort = 0, n = 0;
  for (const [scenario, start] of blocks) {
    for (let r = start; r <= start + 6; r++) {
      const cat = val(fc, `A${r}`);
      if (typeof cat !== "string" || !cat.trim()) continue;
      const isTotal = /total expenses|surplus|deficit/i.test(cat);
      const y = ycols.map((c) => numOrNull(val(fc, `${c}${r}`)));
      sort += 10;
      await sql`INSERT INTO board_forecast (scenario, category, y1, y2, y3, y4, y5, is_total, sort)
                VALUES (${scenario}, ${cat.trim()}, ${y[0]}, ${y[1]}, ${y[2]}, ${y[3]}, ${y[4]}, ${isTotal}, ${sort})`;
      n++;
    }
  }
  console.log(`board_forecast: ${n} rows across 3 scenarios`);
}

console.log("Board detail import complete.");

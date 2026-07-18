/**
 * Board Portal — workbook importer.
 *
 * Parses the FY budget workbook (a buffer) and refreshes the portal's cached
 * financial tables (board_finance, board_budget_lines, board_cashflow). Used
 * by the admin "Update financials from workbook" upload and by the CLI setup
 * script. This is the only path that changes displayed financials until the
 * live Graph/OneDrive sync is wired up — so replacing the workbook here IS how
 * an overhaul reaches the website.
 */
import * as XLSX from "xlsx";
import { ensureBoardSchema, sql } from "./db";

type Sheet = Record<string, { v?: unknown }>;
const val = (s: Sheet | undefined, a: string) => (s && s[a] ? s[a].v : null);
const numOrNull = (x: unknown) => (typeof x === "number" ? x : null);

const EXEC_MAP: [string, string, string, boolean, string, number][] = [
  ["rev_total", "Total Revenue", "B5", false, "top", 10],
  ["exp_total", "Total Expenses", "B6", false, "top", 20],
  ["surplus", "Operating Surplus/Deficit", "B7", false, "top", 30],
  ["ending_cash", "Projected Ending Cash", "B9", false, "top", 40],
  ["debt_outstanding", "Total Outstanding Debt", "B10", false, "debt", 50],
  ["debt_annual", "Annual Debt Service", "B11", false, "debt", 60],
  ["levy_required", "Levy to Balance", "B12", false, "levy", 70],
  ["exp_personnel", "Personnel & Benefits", "E5", false, "mix", 80],
  ["exp_operations", "Operations", "E6", false, "mix", 90],
  ["exp_fleet", "Fleet", "E7", false, "mix", 100],
  ["exp_capital", "Capital Equipment Reserve", "E8", false, "mix", 110],
  ["exp_debt", "Debt Service", "E9", false, "mix", 120],
  ["levy_scenario", "Levy Scenario", "H13", true, "levy", 130],
  ["billing_scenario", "Billing Collection", "H14", true, "levy", 140],
];

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase()).replace(/\bEmts\b/i, "EMTs").replace(/-Time/i, "-Time");
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
/** Excel payoff cell → "May 2033". Handles JS Date (cellDates), Excel serial, or raw string. */
function fmtPayoff(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return `${MONTHS[v.getUTCMonth()]} ${v.getUTCFullYear()}`;
  if (typeof v === "number") { const d = new Date(Date.UTC(1899, 11, 30) as number); d.setUTCDate(d.getUTCDate() + v); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; }
  return String(v).replace(/\s*00:00:00.*$/, "").trim();
}

export interface ImportResult { finance: number; budgetLines: number; cashMonths: number; personnelGroups: number; truckUnits: number; debts: number; forecastRows: number }

export async function importWorkbook(buffer: Buffer | ArrayBuffer): Promise<ImportResult> {
  await ensureBoardSchema();
  const db = sql();
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const exec = wb.Sheets["Executive Dashboard"] as Sheet | undefined;
  if (!exec) throw new Error("Workbook is missing the 'Executive Dashboard' sheet — is this the right file?");

  // ── board_finance ──
  let finance = 0;
  for (const [key, label, addr, isText, grouping, sort] of EXEC_MAP) {
    const raw = val(exec, addr);
    const value = isText ? null : numOrNull(raw);
    const text = isText ? (raw != null ? String(raw) : null) : null;
    await db`
      INSERT INTO board_finance (key,label,value,text_value,unit,grouping,sort,source_cell,updated_at)
      VALUES (${key},${label},${value},${text},${isText ? "text" : "currency"},${grouping},${sort},${"Executive Dashboard!" + addr},NOW())
      ON CONFLICT (key) DO UPDATE SET label=EXCLUDED.label, value=EXCLUDED.value, text_value=EXCLUDED.text_value,
        grouping=EXCLUDED.grouping, sort=EXCLUDED.sort, source_cell=EXCLUDED.source_cell, updated_at=NOW()`;
    finance++;
  }
  const asm = wb.Sheets["Assumptions"] as Sheet | undefined;
  const eav = numOrNull(val(asm, "B66"));
  if (eav != null) {
    await db`
      INSERT INTO board_finance (key,label,value,unit,grouping,sort,source_cell,needs_review,updated_at)
      VALUES ('district_eav','District Equalized Assessed Value',${eav},'currency','levy',5,'Assumptions!B66',TRUE,NOW())
      ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`;
    finance++;
  }

  // ── board_budget_lines ──
  await db`CREATE TABLE IF NOT EXISTS board_budget_lines (id BIGSERIAL PRIMARY KEY, section TEXT NOT NULL, category TEXT NOT NULL, amount DOUBLE PRECISION, status TEXT, sort INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  let budgetLines = 0;
  const bs = wb.Sheets["Budget Summary"] as Sheet | undefined;
  if (bs) {
    await db`DELETE FROM board_budget_lines`;
    let section = "General", sort = 0;
    for (let r = 5; r <= 71; r++) {
      const a = val(bs, `A${r}`), b = val(bs, `B${r}`), st = val(bs, `G${r}`);
      if (typeof a !== "string" || !a.trim()) continue;
      const label = a.trim();
      const isTotal = /^(total|subtotal)/i.test(label);
      if (typeof b !== "number" && !isTotal) { section = label.replace(/^SECTION\s*\d+\s*[—-]\s*/i, "").replace(/\s*[—-].*$/, "").trim(); continue; }
      if (isTotal || typeof b !== "number") continue;
      sort += 10;
      await db`INSERT INTO board_budget_lines (section, category, amount, status, sort) VALUES (${section},${label},${b},${st != null ? String(st) : null},${sort})`;
      budgetLines++;
    }
  }

  // ── board_cashflow ──
  await db`CREATE TABLE IF NOT EXISTS board_cashflow (month_idx INTEGER PRIMARY KEY, month TEXT NOT NULL, beginning DOUBLE PRECISION, net DOUBLE PRECISION, ending DOUBLE PRECISION, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  let cashMonths = 0;
  const cf = wb.Sheets["Monthly Cash Flow"] as Sheet | undefined;
  if (cf) {
    await db`DELETE FROM board_cashflow`;
    const cols = ["B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"];
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      await db`INSERT INTO board_cashflow (month_idx, month, beginning, net, ending)
               VALUES (${i}, ${val(cf, `${c}4`) != null ? String(val(cf, `${c}4`)) : String(i)},
                       ${numOrNull(val(cf, `${c}5`))}, ${numOrNull(val(cf, `${c}16`))}, ${numOrNull(val(cf, `${c}17`))})`;
      cashMonths++;
    }
    const low = numOrNull(val(cf, "B19"));
    if (low != null) {
      await db`INSERT INTO board_finance (key,label,value,unit,grouping,sort,source_cell,updated_at)
               VALUES ('cash_low','Lowest month-end cash balance',${low},'currency','cash',45,'Monthly Cash Flow!B19',NOW())
               ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`;
    }
  }

  // ── board_personnel (5 groups) + board_personnel_costs (employer detail) ──
  await db`CREATE TABLE IF NOT EXISTS board_personnel (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, count DOUBLE PRECISION, rate DOUBLE PRECISION, gross DOUBLE PRECISION, taxes DOUBLE PRECISION, benefits DOUBLE PRECISION, uniform DOUBLE PRECISION, training DOUBLE PRECISION, total DOUBLE PRECISION, per_employee DOUBLE PRECISION, sort INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await db`CREATE TABLE IF NOT EXISTS board_personnel_costs (id BIGSERIAL PRIMARY KEY, label TEXT NOT NULL, amount DOUBLE PRECISION, sort INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  let personnelGroups = 0;
  const ps = wb.Sheets["Personnel"] as Sheet | undefined;
  if (ps) {
    await db`DELETE FROM board_personnel`;
    const headers = [31, 43, 55, 67, 79];
    for (let g = 0; g < headers.length; g++) {
      const h = headers[g];
      const nameRaw = val(ps, `A${h}`);
      if (typeof nameRaw !== "string") continue;
      const name = titleCase(nameRaw.replace(/^GROUP\s*\d+\s*[—-]\s*/i, "").trim());
      const d = (off: number) => numOrNull(val(ps, `D${h + off}`));
      await db`INSERT INTO board_personnel (name, count, rate, gross, taxes, benefits, uniform, training, total, per_employee, sort)
               VALUES (${name}, ${d(2)}, ${d(3)}, ${d(4)}, ${d(5)}, ${d(6)}, ${d(7)}, ${d(8)}, ${d(9)}, ${d(10)}, ${g * 10})`;
      personnelGroups++;
    }
    await db`DELETE FROM board_personnel_costs`;
    let s = 0;
    for (let r = 17; r <= 27; r++) {
      const label = val(ps, `A${r}`), amt = numOrNull(val(ps, `D${r}`));
      if (typeof label !== "string" || amt == null) continue;
      s += 10;
      await db`INSERT INTO board_personnel_costs (label, amount, sort) VALUES (${label.trim()}, ${amt}, ${s})`;
    }
  }

  // ── board_truck (itemized fleet-maintenance actuals) ──
  await db`CREATE TABLE IF NOT EXISTS board_truck (id BIGSERIAL PRIMARY KEY, unit TEXT NOT NULL, fy_total DOUBLE PRECISION, months JSONB, sort INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  let truckUnits = 0;
  const tm = wb.Sheets["Truck Maintenance"] as Sheet | undefined;
  if (tm) {
    await db`DELETE FROM board_truck`;
    const mcols = ["B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"];
    for (let r = 5; r <= 7; r++) {
      const nameRaw = val(tm, `A${r}`);
      if (typeof nameRaw !== "string" || !nameRaw.trim()) continue;
      const unit = nameRaw.replace(/^Truck Repairs\s*/i, "Unit ").trim();
      const months = mcols.map((c) => ({ label: String(val(tm, `${c}4`) ?? c), amount: numOrNull(val(tm, `${c}${r}`)) ?? 0 }));
      await db`INSERT INTO board_truck (unit, fy_total, months, sort) VALUES (${unit}, ${numOrNull(val(tm, `N${r}`))}, ${JSON.stringify(months)}::jsonb, ${(r - 5) * 10})`;
      truckUnits++;
    }
  }

  // ── board_debt (every obligation itemized) ──
  await db`CREATE TABLE IF NOT EXISTS board_debt (id BIGSERIAL PRIMARY KEY, creditor TEXT NOT NULL, purpose TEXT, balance DOUBLE PRECISION, rate DOUBLE PRECISION, rate_note TEXT, monthly DOUBLE PRECISION, annual DOUBLE PRECISION, remaining DOUBLE PRECISION, payoff TEXT, notes TEXT, kind TEXT NOT NULL DEFAULT 'amortizing', sort INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  let debts = 0;
  const ds = wb.Sheets["Debt Schedule"] as Sheet | undefined;
  if (ds) {
    await db`DELETE FROM board_debt`;
    const rows: [number, string][] = [[5, "amortizing"], [6, "amortizing"], [7, "amortizing"], [8, "amortizing"], [9, "amortizing"], [10, "amortizing"], [12, "payable"], [13, "payable"]];
    let sort = 0;
    for (const [r, kind] of rows) {
      const creditor = val(ds, `A${r}`);
      if (typeof creditor !== "string" || !creditor.trim()) continue;
      const rateRaw = val(ds, `E${r}`);
      const rate = numOrNull(rateRaw);
      const rateNote = rate == null && typeof rateRaw === "string" ? rateRaw : null;
      const str = (a: string) => { const v = val(ds, a); return v != null ? String(v) : null; };
      sort += 10;
      await db`INSERT INTO board_debt (creditor, purpose, balance, rate, rate_note, monthly, annual, remaining, payoff, notes, kind, sort)
               VALUES (${creditor.trim()}, ${str(`B${r}`)}, ${numOrNull(val(ds, `D${r}`))}, ${rate}, ${rateNote},
                       ${numOrNull(val(ds, `F${r}`))}, ${numOrNull(val(ds, `G${r}`))}, ${numOrNull(val(ds, `H${r}`))},
                       ${fmtPayoff(val(ds, `I${r}`))}, ${str(`J${r}`)}, ${kind}, ${sort})`;
      debts++;
    }
  }

  // ── board_forecast (Low / Expected / High growth scenarios) ──
  await db`CREATE TABLE IF NOT EXISTS board_forecast (id BIGSERIAL PRIMARY KEY, scenario TEXT NOT NULL, category TEXT NOT NULL, y1 DOUBLE PRECISION, y2 DOUBLE PRECISION, y3 DOUBLE PRECISION, y4 DOUBLE PRECISION, y5 DOUBLE PRECISION, is_total BOOLEAN NOT NULL DEFAULT FALSE, sort INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  let forecastRows = 0;
  const fc = wb.Sheets["Five-Year Forecast"] as Sheet | undefined;
  if (fc) {
    await db`DELETE FROM board_forecast`;
    const blocks: [string, number][] = [["Low", 6], ["Expected", 16], ["High", 26]];
    const ycols = ["B", "C", "D", "E", "F"];
    let sort = 0;
    for (const [scenario, start] of blocks) {
      for (let r = start; r <= start + 6; r++) {
        const cat = val(fc, `A${r}`);
        if (typeof cat !== "string" || !cat.trim()) continue;
        const isTotal = /total expenses|surplus|deficit/i.test(cat);
        const y = ycols.map((c) => numOrNull(val(fc, `${c}${r}`)));
        sort += 10;
        await db`INSERT INTO board_forecast (scenario, category, y1, y2, y3, y4, y5, is_total, sort)
                 VALUES (${scenario}, ${cat.trim()}, ${y[0]}, ${y[1]}, ${y[2]}, ${y[3]}, ${y[4]}, ${isTotal}, ${sort})`;
        forecastRows++;
      }
    }
  }

  return { finance, budgetLines, cashMonths, personnelGroups, truckUnits, debts, forecastRows };
}

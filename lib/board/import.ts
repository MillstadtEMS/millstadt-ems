/**
 * Board Portal — workbook importer.
 *
 * Parses either the current referendum financial model workbook or the earlier
 * FY budget workbook and refreshes the portal's cached financial tables. Admin
 * uploads and OneDrive/Graph pulls both use this path, so the workbook is the
 * source of truth for displayed referendum model data.
 */
import * as XLSX from "xlsx";
import { ensureBoardSchema, sql } from "./db";

type Sheet = Record<string, { v?: unknown }>;
type Db = ReturnType<typeof sql>;

const val = (s: Sheet | undefined, a: string) => (s && s[a] ? s[a].v : null);
const numOrNull = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : null);
const strOrNull = (x: unknown) => (x == null ? null : String(x).trim() || null);
const source = (sheet: string, addr: string) => `${sheet}!${addr}`;
const firstNumber = (...xs: (number | null)[]) => xs.find((x) => x != null) ?? null;

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

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export interface ImportResult {
  finance: number;
  budgetLines: number;
  cashMonths: number;
  personnelGroups: number;
  truckUnits: number;
  debts: number;
  forecastRows: number;
}

function titleCase(s: string): string {
  return s.toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .replace(/\bEmts\b/i, "EMTs")
    .replace(/-Time/i, "-Time");
}

/** Excel payoff cell → "May 2033". Handles JS Date (cellDates), Excel serial, or raw string. */
function fmtPayoff(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return `${MONTHS[v.getUTCMonth()]} ${v.getUTCFullYear()}`;
  if (typeof v === "number") {
    const d = new Date(Date.UTC(1899, 11, 30) as number);
    d.setUTCDate(d.getUTCDate() + v);
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }
  return String(v).replace(/\s*00:00:00.*$/, "").trim();
}

function rateText(rateDecimal: number | null): string | null {
  return rateDecimal == null ? null : `${(rateDecimal * 100).toFixed(2)}% Levy`;
}

function workbookLooksLikeReferendumModel(wb: XLSX.WorkBook): boolean {
  return Boolean(wb.Sheets["Model Inputs"] && wb.Sheets["Levy Calculator"] && wb.Sheets["Referendum Overview"]);
}

async function ensureFinancialDetailTables(db: Db): Promise<void> {
  await db`CREATE TABLE IF NOT EXISTS board_budget_lines (id BIGSERIAL PRIMARY KEY, section TEXT NOT NULL, category TEXT NOT NULL, amount DOUBLE PRECISION, status TEXT, sort INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await db`CREATE TABLE IF NOT EXISTS board_cashflow (month_idx INTEGER PRIMARY KEY, month TEXT NOT NULL, beginning DOUBLE PRECISION, net DOUBLE PRECISION, ending DOUBLE PRECISION, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await db`CREATE TABLE IF NOT EXISTS board_personnel (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, count DOUBLE PRECISION, rate DOUBLE PRECISION, gross DOUBLE PRECISION, taxes DOUBLE PRECISION, benefits DOUBLE PRECISION, uniform DOUBLE PRECISION, training DOUBLE PRECISION, total DOUBLE PRECISION, per_employee DOUBLE PRECISION, sort INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await db`CREATE TABLE IF NOT EXISTS board_personnel_costs (id BIGSERIAL PRIMARY KEY, label TEXT NOT NULL, amount DOUBLE PRECISION, sort INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await db`CREATE TABLE IF NOT EXISTS board_truck (id BIGSERIAL PRIMARY KEY, unit TEXT NOT NULL, fy_total DOUBLE PRECISION, months JSONB, sort INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await db`CREATE TABLE IF NOT EXISTS board_debt (id BIGSERIAL PRIMARY KEY, creditor TEXT NOT NULL, purpose TEXT, balance DOUBLE PRECISION, rate DOUBLE PRECISION, rate_note TEXT, monthly DOUBLE PRECISION, annual DOUBLE PRECISION, remaining DOUBLE PRECISION, payoff TEXT, notes TEXT, kind TEXT NOT NULL DEFAULT 'amortizing', sort INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await db`CREATE TABLE IF NOT EXISTS board_forecast (id BIGSERIAL PRIMARY KEY, scenario TEXT NOT NULL, category TEXT NOT NULL, y1 DOUBLE PRECISION, y2 DOUBLE PRECISION, y3 DOUBLE PRECISION, y4 DOUBLE PRECISION, y5 DOUBLE PRECISION, is_total BOOLEAN NOT NULL DEFAULT FALSE, sort INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
}

async function clearDetailTables(db: Db): Promise<void> {
  await db`DELETE FROM board_budget_lines`;
  await db`DELETE FROM board_cashflow`;
  await db`DELETE FROM board_personnel`;
  await db`DELETE FROM board_personnel_costs`;
  await db`DELETE FROM board_truck`;
  await db`DELETE FROM board_debt`;
  await db`DELETE FROM board_forecast`;
}

async function upsertFinance(db: Db, row: {
  key: string;
  label: string;
  value?: number | null;
  text?: string | null;
  unit: string;
  grouping: string;
  sort: number;
  sourceCell: string | null;
  needsReview?: boolean;
}): Promise<void> {
  await db`
    INSERT INTO board_finance (key,label,value,text_value,unit,grouping,sort,source_cell,needs_review,updated_at)
    VALUES (${row.key},${row.label},${row.value ?? null},${row.text ?? null},${row.unit},${row.grouping},${row.sort},${row.sourceCell},${row.needsReview ?? false},NOW())
    ON CONFLICT (key) DO UPDATE SET
      label=EXCLUDED.label,
      value=EXCLUDED.value,
      text_value=EXCLUDED.text_value,
      unit=EXCLUDED.unit,
      grouping=EXCLUDED.grouping,
      sort=EXCLUDED.sort,
      source_cell=EXCLUDED.source_cell,
      needs_review=EXCLUDED.needs_review,
      updated_at=NOW()
  `;
}

function operatingCategoryTotal(sheet: Sheet | undefined, category: string): number {
  let total = 0;
  for (let r = 5; r <= 80; r++) {
    const cat = strOrNull(val(sheet, `A${r}`));
    const amount = numOrNull(val(sheet, `C${r}`));
    if (cat?.toLowerCase() === category.toLowerCase() && amount != null) total += amount;
  }
  return total;
}

export async function importWorkbook(buffer: Buffer | ArrayBuffer): Promise<ImportResult> {
  await ensureBoardSchema();
  const db = sql();
  await ensureFinancialDetailTables(db);

  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  if (workbookLooksLikeReferendumModel(wb)) return importReferendumModelWorkbook(db, wb);

  const exec = wb.Sheets["Executive Dashboard"] as Sheet | undefined;
  if (!exec) {
    throw new Error("Workbook is missing the referendum model sheets ('Levy Calculator' and 'Referendum Overview') or the legacy 'Executive Dashboard' sheet.");
  }
  return importLegacyWorkbook(db, wb, exec);
}

async function importReferendumModelWorkbook(db: Db, wb: XLSX.WorkBook): Promise<ImportResult> {
  await clearDetailTables(db);
  await db`DELETE FROM board_finance WHERE key IN ('ending_cash', 'cash_low')`;

  const model = wb.Sheets["Model Inputs"] as Sheet | undefined;
  const staffing = wb.Sheets["Proposed Staffing"] as Sheet | undefined;
  const operating = wb.Sheets["Operating Needs"] as Sheet | undefined;
  const debt = wb.Sheets["Debt & Liabilities"] as Sheet | undefined;
  const capital = wb.Sheets["Capital Reserves"] as Sheet | undefined;
  const levy = wb.Sheets["Levy Calculator"] as Sheet | undefined;
  const overview = wb.Sheets["Referendum Overview"] as Sheet | undefined;

  const eav = numOrNull(val(levy, "B5"));
  const selectedRate = numOrNull(val(levy, "B6"));
  const collectionFactor = numOrNull(val(levy, "B7"));
  const propertyMarketValue = numOrNull(val(levy, "B8"));
  const currentAmbulanceRevenue = firstNumber(numOrNull(val(levy, "E6")), numOrNull(val(model, "B8")));
  const callVolume = numOrNull(val(model, "B9"));
  const transportRate = numOrNull(val(model, "B10"));
  const netCollectionPerTransport = numOrNull(val(model, "B11"));
  const billingRevenue = firstNumber(numOrNull(val(levy, "E8")), numOrNull(val(model, "B12")));
  const otherRevenue = firstNumber(numOrNull(val(levy, "E9")), numOrNull(val(model, "B17")));
  const totalRevenue = firstNumber(numOrNull(val(levy, "E10")), numOrNull(val(overview, "B10")));
  const totalNeed = firstNumber(numOrNull(val(levy, "E11")), numOrNull(val(overview, "F10")));
  const margin = firstNumber(numOrNull(val(levy, "E12")), numOrNull(val(overview, "A13")));
  const breakEvenRate = firstNumber(numOrNull(val(levy, "E13")), numOrNull(val(overview, "F13")));
  const requiredLevyRevenue = totalNeed != null
    ? totalNeed - (billingRevenue ?? 0) - (otherRevenue ?? 0)
    : breakEvenRate != null && eav != null && collectionFactor != null
      ? breakEvenRate * eav * collectionFactor
      : null;

  const personnelTotal = firstNumber(numOrNull(val(staffing, "D31")), numOrNull(val(overview, "F5")));
  const operatingTotal = firstNumber(numOrNull(val(operating, "G13")), numOrNull(val(overview, "F6")));
  const fleetTotal = operatingCategoryTotal(operating, "Fleet");
  const debtAnnual = firstNumber(numOrNull(val(debt, "E12")), numOrNull(val(overview, "F7")));
  const payableCatchUp = firstNumber(numOrNull(val(debt, "D20")), numOrNull(val(overview, "F8")));
  const capitalReserve = firstNumber(numOrNull(val(capital, "F17")), numOrNull(val(overview, "F9")));
  const debtOutstanding = numOrNull(val(debt, "D23"));

  const financeRows: Parameters<typeof upsertFinance>[1][] = [
    { key: "district_eav", label: "Equalized Assessed Value (EAV)", value: eav, unit: "currency", grouping: "levy", sort: 5, sourceCell: source("Levy Calculator", "B5"), needsReview: true },
    { key: "current_ambulance_revenue", label: "Current Ambulance-Fund Revenue", value: currentAmbulanceRevenue, unit: "currency", grouping: "levy", sort: 6, sourceCell: source("Levy Calculator", "E6") },
    { key: "rev_total", label: "Total Projected Revenue", value: totalRevenue, unit: "currency", grouping: "top", sort: 10, sourceCell: source("Levy Calculator", "E10") },
    { key: "exp_total", label: "Total Projected Annual Need", value: totalNeed, unit: "currency", grouping: "top", sort: 20, sourceCell: source("Levy Calculator", "E11") },
    { key: "surplus", label: "Projected Funding Margin/(Gap)", value: margin, unit: "currency", grouping: "top", sort: 30, sourceCell: source("Levy Calculator", "E12") },
    { key: "debt_outstanding", label: "Total Obligations", value: debtOutstanding, unit: "currency", grouping: "debt", sort: 50, sourceCell: source("Debt & Liabilities", "D23") },
    { key: "debt_annual", label: "Annual Debt Service", value: debtAnnual, unit: "currency", grouping: "debt", sort: 60, sourceCell: source("Debt & Liabilities", "E12") },
    { key: "levy_required", label: "Property-Tax Revenue Required to Fully Fund Model", value: requiredLevyRevenue, unit: "currency", grouping: "levy", sort: 70, sourceCell: source("Levy Calculator", "E13") },
    { key: "exp_personnel", label: "Projected Personnel Cost", value: personnelTotal, unit: "currency", grouping: "mix", sort: 80, sourceCell: source("Proposed Staffing", "D31") },
    { key: "exp_operations", label: "Operations Excluding Fleet", value: operatingTotal != null ? operatingTotal - fleetTotal : null, unit: "currency", grouping: "mix", sort: 90, sourceCell: "Operating Needs!G13 less Fleet lines" },
    { key: "exp_fleet", label: "Fleet", value: fleetTotal || null, unit: "currency", grouping: "mix", sort: 100, sourceCell: "Operating Needs!A:C category Fleet" },
    { key: "exp_capital", label: "Capital Replacement Reserves", value: capitalReserve, unit: "currency", grouping: "mix", sort: 110, sourceCell: source("Capital Reserves", "F17") },
    { key: "exp_debt", label: "Annual Debt Service", value: debtAnnual, unit: "currency", grouping: "mix", sort: 120, sourceCell: source("Referendum Overview", "F7") },
    { key: "exp_payables", label: "Annual Payable Catch-Up", value: payableCatchUp, unit: "currency", grouping: "mix", sort: 125, sourceCell: source("Referendum Overview", "F8") },
    { key: "levy_scenario", label: "Selected Levy Rate", value: selectedRate, text: rateText(selectedRate), unit: "percent", grouping: "levy", sort: 130, sourceCell: source("Levy Calculator", "B6") },
    { key: "billing_scenario", label: "EMS Billing Scenario", value: billingRevenue, text: `${callVolume ?? "Call volume"} calls x ${transportRate != null ? (transportRate * 100).toFixed(0) + "%" : "transport rate"} x ${netCollectionPerTransport != null ? "$" + netCollectionPerTransport.toFixed(0) : "net collection"}`, unit: "currency", grouping: "levy", sort: 140, sourceCell: source("Model Inputs", "B9:B12") },
    { key: "levy_collection_factor", label: "Collection Factor", value: collectionFactor, unit: "number", grouping: "levy", sort: 150, sourceCell: source("Levy Calculator", "B7") },
    { key: "property_market_value", label: "Scenario Property Market Value", value: propertyMarketValue, unit: "currency", grouping: "levy", sort: 160, sourceCell: source("Levy Calculator", "B8") },
    { key: "levy_break_even_rate", label: "Break-Even Levy Rate", value: breakEvenRate, unit: "percent", grouping: "levy", sort: 170, sourceCell: source("Levy Calculator", "E13") },
  ];

  let finance = 0;
  for (const row of financeRows) {
    await upsertFinance(db, row);
    finance++;
  }

  let budgetLines = 0;
  let budgetSort = 0;
  const insertBudgetLine = async (section: string, category: string | null, amount: number | null, status: string | null) => {
    if (!category || amount == null) return;
    budgetSort += 10;
    await db`INSERT INTO board_budget_lines (section, category, amount, status, sort) VALUES (${section}, ${category}, ${amount}, ${status}, ${budgetSort})`;
    budgetLines++;
  };

  for (let r = 5; r <= 14; r++) {
    await insertBudgetLine("Personnel", strOrNull(val(staffing, `A${r}`)), numOrNull(val(staffing, `D${r}`)), strOrNull(val(staffing, `E${r}`)));
  }
  for (let r = 19; r <= 30; r++) {
    await insertBudgetLine("Personnel", strOrNull(val(staffing, `A${r}`)), numOrNull(val(staffing, `D${r}`)), strOrNull(val(staffing, `E${r}`)));
  }
  for (let r = 5; r <= 80; r++) {
    const section = strOrNull(val(operating, `A${r}`));
    await insertBudgetLine(section ?? "Operating Needs", strOrNull(val(operating, `B${r}`)), numOrNull(val(operating, `C${r}`)), strOrNull(val(operating, `D${r}`)));
  }
  for (let r = 5; r <= 15; r++) {
    await insertBudgetLine("Capital Reserves", strOrNull(val(capital, `A${r}`)), numOrNull(val(capital, `F${r}`)), strOrNull(val(capital, `G${r}`)));
  }
  for (let r = 5; r <= 10; r++) {
    await insertBudgetLine("Debt & Liabilities", strOrNull(val(debt, `A${r}`)), numOrNull(val(debt, `E${r}`)), strOrNull(val(debt, `G${r}`)));
  }
  for (let r = 17; r <= 18; r++) {
    await insertBudgetLine("Debt & Liabilities", strOrNull(val(debt, `A${r}`)), numOrNull(val(debt, `D${r}`)), strOrNull(val(debt, `G${r}`)));
  }

  let personnelGroups = 0;
  for (let r = 5; r <= 14; r++) {
    const name = strOrNull(val(staffing, `A${r}`));
    const gross = numOrNull(val(staffing, `D${r}`));
    if (!name || gross == null) continue;
    const count = numOrNull(val(staffing, `C${r}`));
    await db`INSERT INTO board_personnel (name, count, rate, gross, taxes, benefits, uniform, training, total, per_employee, sort)
             VALUES (${name}, ${count}, ${numOrNull(val(staffing, `B${r}`))}, ${gross}, NULL, NULL, NULL, NULL, ${gross}, ${count ? gross / count : null}, ${(r - 5) * 10})`;
    personnelGroups++;
  }

  let costSort = 0;
  for (let r = 19; r <= 30; r++) {
    const label = strOrNull(val(staffing, `A${r}`));
    const amount = numOrNull(val(staffing, `D${r}`));
    if (!label || amount == null) continue;
    costSort += 10;
    await db`INSERT INTO board_personnel_costs (label, amount, sort) VALUES (${label}, ${amount}, ${costSort})`;
  }

  let truckUnits = 0;
  for (let r = 5; r <= 80; r++) {
    const category = strOrNull(val(operating, `A${r}`));
    const line = strOrNull(val(operating, `B${r}`));
    const amount = numOrNull(val(operating, `C${r}`));
    if (category !== "Fleet" || !line || amount == null) continue;
    await db`INSERT INTO board_truck (unit, fy_total, months, sort)
             VALUES (${line}, ${amount}, ${JSON.stringify([{ label: "Annual", amount }])}::jsonb, ${(truckUnits + 1) * 10})`;
    truckUnits++;
  }

  let debts = 0;
  for (let r = 5; r <= 10; r++) {
    const creditor = strOrNull(val(debt, `A${r}`));
    if (!creditor) continue;
    const basis = strOrNull(val(debt, `C${r}`));
    const scheduled = numOrNull(val(debt, `D${r}`));
    const annual = numOrNull(val(debt, `E${r}`));
    const rate = numOrNull(val(debt, `F${r}`));
    await db`INSERT INTO board_debt (creditor, purpose, balance, rate, rate_note, monthly, annual, remaining, payoff, notes, kind, sort)
             VALUES (${creditor}, ${basis}, ${numOrNull(val(debt, `B${r}`))}, ${rate}, ${rate == null ? strOrNull(val(debt, `F${r}`)) : null},
                     ${basis?.toLowerCase().includes("month") ? scheduled : null}, ${annual ?? scheduled}, NULL, NULL, ${strOrNull(val(debt, `G${r}`))}, 'amortizing', ${(debts + 1) * 10})`;
    debts++;
  }
  for (let r = 17; r <= 18; r++) {
    const creditor = strOrNull(val(debt, `A${r}`));
    if (!creditor) continue;
    await db`INSERT INTO board_debt (creditor, purpose, balance, rate, rate_note, monthly, annual, remaining, payoff, notes, kind, sort)
             VALUES (${creditor}, ${strOrNull(val(debt, `C${r}`))}, ${numOrNull(val(debt, `B${r}`))}, NULL, NULL, NULL, ${numOrNull(val(debt, `D${r}`))}, NULL, NULL, ${strOrNull(val(debt, `G${r}`))}, 'payable', ${(debts + 1) * 10})`;
    debts++;
  }

  return { finance, budgetLines, cashMonths: 0, personnelGroups, truckUnits, debts, forecastRows: 0 };
}

async function importLegacyWorkbook(db: Db, wb: XLSX.WorkBook, exec: Sheet): Promise<ImportResult> {
  let finance = 0;
  for (const [key, label, addr, isText, grouping, sort] of EXEC_MAP) {
    const raw = val(exec, addr);
    await upsertFinance(db, {
      key,
      label,
      value: isText ? null : numOrNull(raw),
      text: isText ? strOrNull(raw) : null,
      unit: isText ? "text" : "currency",
      grouping,
      sort,
      sourceCell: source("Executive Dashboard", addr),
    });
    finance++;
  }

  const asm = wb.Sheets["Assumptions"] as Sheet | undefined;
  const eav = numOrNull(val(asm, "B66"));
  if (eav != null) {
    await upsertFinance(db, {
      key: "district_eav",
      label: "District Equalized Assessed Value",
      value: eav,
      unit: "currency",
      grouping: "levy",
      sort: 5,
      sourceCell: source("Assumptions", "B66"),
      needsReview: true,
    });
    finance++;
  }

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
      if (typeof b !== "number" && !isTotal) {
        section = label.replace(/^SECTION\s*\d+\s*[—-]\s*/i, "").replace(/\s*[—-].*$/, "").trim();
        continue;
      }
      if (isTotal || typeof b !== "number") continue;
      sort += 10;
      await db`INSERT INTO board_budget_lines (section, category, amount, status, sort) VALUES (${section},${label},${b},${st != null ? String(st) : null},${sort})`;
      budgetLines++;
    }
  }

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
      await upsertFinance(db, {
        key: "cash_low",
        label: "Lowest month-end cash balance",
        value: low,
        unit: "currency",
        grouping: "cash",
        sort: 45,
        sourceCell: source("Monthly Cash Flow", "B19"),
      });
    }
  }

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
      sort += 10;
      await db`INSERT INTO board_debt (creditor, purpose, balance, rate, rate_note, monthly, annual, remaining, payoff, notes, kind, sort)
               VALUES (${creditor.trim()}, ${strOrNull(val(ds, `B${r}`))}, ${numOrNull(val(ds, `D${r}`))}, ${rate}, ${rate == null ? strOrNull(rateRaw) : null},
                       ${numOrNull(val(ds, `F${r}`))}, ${numOrNull(val(ds, `G${r}`))}, ${numOrNull(val(ds, `H${r}`))},
                       ${fmtPayoff(val(ds, `I${r}`))}, ${strOrNull(val(ds, `J${r}`))}, ${kind}, ${sort})`;
      debts++;
    }
  }

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

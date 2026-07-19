/**
 * Board Portal — one-time / repeatable setup.
 *
 *   node scripts/board-setup.mjs ["/path/to/workbook.xlsx"]
 *
 * 1. Parses the referendum model workbook and caches the headline figures
 *    into board_finance (Neon). The app importer/API handles the richer
 *    detail tables used by the board portal pages.
 * 2. Ensures the board tables exist and seeds the admin account with the
 *    configured temporary password if it doesn't exist.
 *
 * Reads DATABASE_URL from .env.local. Contains no financial data itself —
 * it reads the workbook at run time — so it is safe to commit.
 */
import { readFileSync } from "node:fs";
import { scryptSync, randomBytes } from "node:crypto";
import * as XLSX from "xlsx";
import { neon } from "@neondatabase/serverless";

const WB = process.argv[2] || `${process.env.HOME}/Desktop/Millstadt_EMS_Referendum_Financial_Model (1).xlsx`;

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const readEnv = (name) => env.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1]?.trim().replace(/^["']|["']$/g, "");
const url = readEnv("DATABASE_URL");
if (!url) { console.error("DATABASE_URL not found in .env.local"); process.exit(1); }
const initialTemporaryPassword = readEnv("BOARD_INITIAL_TEMP_PASSWORD");
if (!initialTemporaryPassword) {
  console.error("BOARD_INITIAL_TEMP_PASSWORD missing; set it in .env.local before seeding the board admin account.");
  process.exit(1);
}
const sql = neon(url);

function hashPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}

// ---- read workbook ----
const wb = XLSX.read(readFileSync(WB), { type: "buffer" });
const hasNewReferendumModel = Boolean(wb.Sheets["Levy Calculator"] && wb.Sheets["Referendum Overview"]);
const sheetCell = (sheet, a) => {
  const s = wb.Sheets[sheet];
  return s && s[a] ? s[a].v : null;
};
const num = (x) => (typeof x === "number" && Number.isFinite(x) ? x : null);
const firstNumber = (...xs) => xs.find((x) => x != null) ?? null;
const rateText = (x) => (typeof x === "number" ? `${(x * 100).toFixed(2)}% Levy` : null);
const operatingCategoryTotal = (category) => {
  let total = 0;
  for (let r = 5; r <= 80; r++) {
    const cat = sheetCell("Operating Needs", `A${r}`);
    const amount = num(sheetCell("Operating Needs", `C${r}`));
    if (typeof cat === "string" && cat.trim().toLowerCase() === category.toLowerCase() && amount != null) total += amount;
  }
  return total;
};

const legacyDashboard = wb.Sheets["Executive Dashboard"];
if (!hasNewReferendumModel && !legacyDashboard) {
  console.error("Workbook is missing the referendum model sheets or the legacy Executive Dashboard sheet.");
  process.exit(1);
}

const newTotalNeed = firstNumber(num(sheetCell("Levy Calculator", "E11")), num(sheetCell("Referendum Overview", "F10")));
const newCallVolume = num(sheetCell("Model Inputs", "B9"));
const newTransportRate = num(sheetCell("Model Inputs", "B10"));
const newNetCollection = num(sheetCell("Model Inputs", "B11"));
const newBilling = firstNumber(num(sheetCell("Levy Calculator", "E8")), num(sheetCell("Model Inputs", "B12")));
const newOther = firstNumber(num(sheetCell("Levy Calculator", "E9")), num(sheetCell("Model Inputs", "B17")));
const newOperating = firstNumber(num(sheetCell("Operating Needs", "G13")), num(sheetCell("Referendum Overview", "F6")));
const newFleet = operatingCategoryTotal("Fleet");

// key, label, source cell, value, text, unit, grouping, sort, needsReview
const MAP = hasNewReferendumModel ? [
  ["district_eav", "Equalized Assessed Value (EAV)", "Levy Calculator!B5", num(sheetCell("Levy Calculator", "B5")), null, "currency", "levy", 5, true],
  ["current_ambulance_revenue", "Current Ambulance-Fund Revenue", "Levy Calculator!E6", firstNumber(num(sheetCell("Levy Calculator", "E6")), num(sheetCell("Model Inputs", "B8"))), null, "currency", "levy", 6, false],
  ["rev_total", "Total Projected Revenue", "Levy Calculator!E10", num(sheetCell("Levy Calculator", "E10")), null, "currency", "top", 10, false],
  ["exp_total", "Total Projected Annual Need", "Levy Calculator!E11", newTotalNeed, null, "currency", "top", 20, false],
  ["surplus", "Projected Funding Margin/(Gap)", "Levy Calculator!E12", num(sheetCell("Levy Calculator", "E12")), null, "currency", "top", 30, false],
  ["debt_outstanding", "Total Obligations", "Debt & Liabilities!D23", num(sheetCell("Debt & Liabilities", "D23")), null, "currency", "debt", 50, false],
  ["debt_annual", "Annual Debt Service", "Debt & Liabilities!E12", firstNumber(num(sheetCell("Debt & Liabilities", "E12")), num(sheetCell("Referendum Overview", "F7"))), null, "currency", "debt", 60, false],
  ["levy_required", "Property-Tax Revenue Required to Fully Fund Model", "Levy Calculator!E13", newTotalNeed != null ? newTotalNeed - (newBilling ?? 0) - (newOther ?? 0) : null, null, "currency", "levy", 70, false],
  ["exp_personnel", "Projected Personnel Cost", "Proposed Staffing!D31", firstNumber(num(sheetCell("Proposed Staffing", "D31")), num(sheetCell("Referendum Overview", "F5"))), null, "currency", "mix", 80, false],
  ["exp_operations", "Operations Excluding Fleet", "Operating Needs!G13 less Fleet lines", newOperating != null ? newOperating - newFleet : null, null, "currency", "mix", 90, false],
  ["exp_fleet", "Fleet", "Operating Needs!A:C category Fleet", newFleet || null, null, "currency", "mix", 100, false],
  ["exp_capital", "Capital Replacement Reserves", "Capital Reserves!F17", firstNumber(num(sheetCell("Capital Reserves", "F17")), num(sheetCell("Referendum Overview", "F9"))), null, "currency", "mix", 110, false],
  ["exp_debt", "Annual Debt Service", "Referendum Overview!F7", num(sheetCell("Referendum Overview", "F7")), null, "currency", "mix", 120, false],
  ["exp_payables", "Annual Payable Catch-Up", "Referendum Overview!F8", num(sheetCell("Referendum Overview", "F8")), null, "currency", "mix", 125, false],
  ["levy_scenario", "Selected Levy Rate", "Levy Calculator!B6", num(sheetCell("Levy Calculator", "B6")), rateText(num(sheetCell("Levy Calculator", "B6"))), "percent", "levy", 130, false],
  ["billing_scenario", "EMS Billing Scenario", "Model Inputs!B9:B12", newBilling, `${newCallVolume ?? "Call volume"} calls x ${newTransportRate != null ? (newTransportRate * 100).toFixed(0) + "%" : "transport rate"} x ${newNetCollection != null ? "$" + newNetCollection.toFixed(0) : "net collection"}`, "currency", "levy", 140, false],
] : [
  ["rev_total",        "Total Revenue",            "B5",  false, "top", 10],
  ["exp_total",        "Total Expenses",           "B6",  false, "top", 20],
  ["surplus",          "Operating Surplus/Deficit","B7",  false, "top", 30],
  ["ending_cash",      "Projected Ending Cash",    "B9",  false, "top", 40],
  ["debt_outstanding", "Total Outstanding Debt",   "B10", false, "debt", 50],
  ["debt_annual",      "Annual Debt Service",      "B11", false, "debt", 60],
  ["levy_required",    "Levy to Balance",          "B12", false, "levy", 70],
  ["exp_personnel",    "Personnel & Benefits",     "E5",  false, "mix", 80],
  ["exp_operations",   "Operations",               "E6",  false, "mix", 90],
  ["exp_fleet",        "Fleet",                    "E7",  false, "mix", 100],
  ["exp_capital",      "Capital Equipment Reserve","E8",  false, "mix", 110],
  ["exp_debt",         "Debt Service",             "E9",  false, "mix", 120],
  ["levy_scenario",    "Levy Scenario",            "H13", true,  "levy", 130],
  ["billing_scenario", "Billing Collection",       "H14", true,  "levy", 140],
];

await sql`
  CREATE TABLE IF NOT EXISTS board_finance (
    key TEXT PRIMARY KEY, label TEXT NOT NULL, value DOUBLE PRECISION, text_value TEXT,
    unit TEXT, grouping TEXT, sort INTEGER NOT NULL DEFAULT 0, source_cell TEXT,
    needs_review BOOLEAN NOT NULL DEFAULT FALSE, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

let n = 0;
if (hasNewReferendumModel) {
  await sql`DELETE FROM board_finance WHERE key IN ('ending_cash', 'cash_low')`;
}
for (const row of MAP) {
  const [key, label, addr] = row;
  const value = hasNewReferendumModel ? row[3] : num(legacyDashboard[addr]?.v);
  const text = hasNewReferendumModel ? row[4] : (row[3] ? (legacyDashboard[addr]?.v != null ? String(legacyDashboard[addr].v) : null) : null);
  const unit = hasNewReferendumModel ? row[5] : (row[3] ? "text" : "currency");
  const grouping = hasNewReferendumModel ? row[6] : row[4];
  const sort = hasNewReferendumModel ? row[7] : row[5];
  const needsReview = hasNewReferendumModel ? row[8] : false;
  const sourceCell = hasNewReferendumModel ? addr : "Executive Dashboard!" + addr;
  await sql`
    INSERT INTO board_finance (key, label, value, text_value, unit, grouping, sort, source_cell, needs_review, updated_at)
    VALUES (${key}, ${label}, ${value}, ${text}, ${unit}, ${grouping}, ${sort}, ${sourceCell}, ${needsReview}, NOW())
    ON CONFLICT (key) DO UPDATE SET
      label=EXCLUDED.label, value=EXCLUDED.value, text_value=EXCLUDED.text_value,
      unit=EXCLUDED.unit, grouping=EXCLUDED.grouping, sort=EXCLUDED.sort,
      source_cell=EXCLUDED.source_cell, needs_review=EXCLUDED.needs_review, updated_at=NOW()`;
  n++;
}
// Legacy district EAV (Assumptions!B66) — current referendum model uses Levy Calculator!B5.
const asm = wb.Sheets["Assumptions"];
const eav = !hasNewReferendumModel && asm && asm["B66"] ? asm["B66"].v : null;
if (!hasNewReferendumModel && typeof eav === "number") {
  await sql`
    INSERT INTO board_finance (key,label,value,unit,grouping,sort,source_cell,needs_review,updated_at)
    VALUES ('district_eav','District Equalized Assessed Value',${eav},'currency','levy',5,'Assumptions!B66',TRUE,NOW())
    ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, source_cell=EXCLUDED.source_cell, updated_at=NOW()`;
  n++;
}
console.log(`board_finance: upserted ${n} figures from ${WB.split("/").pop()}`);

// ---- Budget Summary → itemized lines (Detailed View) ----
await sql`
  CREATE TABLE IF NOT EXISTS board_budget_lines (
    id BIGSERIAL PRIMARY KEY, section TEXT NOT NULL, category TEXT NOT NULL,
    amount DOUBLE PRECISION, status TEXT, sort INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
const bs = wb.Sheets["Budget Summary"];
if (hasNewReferendumModel) {
  await sql`DELETE FROM board_budget_lines`;
  let sort = 0; let inserted = 0;
  const insertLine = async (section, category, amount, status) => {
    if (!category || typeof amount !== "number") return;
    sort += 10;
    await sql`INSERT INTO board_budget_lines (section, category, amount, status, sort)
              VALUES (${section}, ${category}, ${amount}, ${status != null ? String(status) : null}, ${sort})`;
    inserted++;
  };
  for (let r = 5; r <= 14; r++) {
    await insertLine("Personnel", sheetCell("Proposed Staffing", `A${r}`), sheetCell("Proposed Staffing", `D${r}`), sheetCell("Proposed Staffing", `E${r}`));
  }
  for (let r = 19; r <= 30; r++) {
    await insertLine("Personnel", sheetCell("Proposed Staffing", `A${r}`), sheetCell("Proposed Staffing", `D${r}`), sheetCell("Proposed Staffing", `E${r}`));
  }
  for (let r = 5; r <= 80; r++) {
    const section = sheetCell("Operating Needs", `A${r}`);
    await insertLine(typeof section === "string" && section.trim() ? section.trim() : "Operating Needs", sheetCell("Operating Needs", `B${r}`), sheetCell("Operating Needs", `C${r}`), sheetCell("Operating Needs", `D${r}`));
  }
  for (let r = 5; r <= 15; r++) {
    await insertLine("Capital Reserves", sheetCell("Capital Reserves", `A${r}`), sheetCell("Capital Reserves", `F${r}`), sheetCell("Capital Reserves", `G${r}`));
  }
  for (let r = 5; r <= 10; r++) {
    await insertLine("Debt & Liabilities", sheetCell("Debt & Liabilities", `A${r}`), sheetCell("Debt & Liabilities", `E${r}`), sheetCell("Debt & Liabilities", `G${r}`));
  }
  for (let r = 17; r <= 18; r++) {
    await insertLine("Debt & Liabilities", sheetCell("Debt & Liabilities", `A${r}`), sheetCell("Debt & Liabilities", `D${r}`), sheetCell("Debt & Liabilities", `G${r}`));
  }
  console.log(`board_budget_lines: ${inserted} line items from referendum model workbook`);
} else if (bs) {
  await sql`DELETE FROM board_budget_lines`;
  const g = (r, c) => { const cell = bs[`${c}${r}`]; return cell ? cell.v : null; };
  let section = "General"; let sort = 0; let inserted = 0;
  for (let r = 5; r <= 71; r++) {
    const a = g(r, "A"); const b = g(r, "B"); const st = g(r, "G");
    if (typeof a !== "string" || !a.trim()) continue;
    const label = a.trim();
    const isHeader = typeof b !== "number";
    const isTotal = /^(total|subtotal)/i.test(label);
    if (isHeader && !isTotal) {                 // section title row
      section = label.replace(/^SECTION\s*\d+\s*[—-]\s*/i, "").replace(/\s*[—-].*$/, "").trim();
      continue;
    }
    if (isTotal || typeof b !== "number") continue;
    sort += 10;
    await sql`INSERT INTO board_budget_lines (section, category, amount, status, sort)
              VALUES (${section}, ${label}, ${b}, ${st != null ? String(st) : null}, ${sort})`;
    inserted++;
  }
  console.log(`board_budget_lines: ${inserted} line items from Budget Summary`);
}

// ---- Monthly Cash Flow → board_cashflow ----
await sql`
  CREATE TABLE IF NOT EXISTS board_cashflow (
    month_idx INTEGER PRIMARY KEY, month TEXT NOT NULL,
    beginning DOUBLE PRECISION, net DOUBLE PRECISION, ending DOUBLE PRECISION,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
const cf = wb.Sheets["Monthly Cash Flow"];
if (hasNewReferendumModel) {
  await sql`DELETE FROM board_cashflow`;
  console.log("board_cashflow: cleared; the referendum model workbook does not include actual monthly cash flow");
} else if (cf) {
  const gc = (r, c) => { const cell = cf[`${c}${r}`]; return cell ? cell.v : null; };
  const cols = ["B","C","D","E","F","G","H","I","J","K","L","M"]; // May..Apr
  await sql`DELETE FROM board_cashflow`;
  let cfn = 0;
  for (let i = 0; i < cols.length; i++) {
    const c = cols[i];
    const month = gc(4, c);
    const beginning = gc(5, c), net = gc(16, c), ending = gc(17, c);
    await sql`INSERT INTO board_cashflow (month_idx, month, beginning, net, ending)
              VALUES (${i}, ${month != null ? String(month) : String(i)},
                      ${typeof beginning === "number" ? beginning : null},
                      ${typeof net === "number" ? net : null},
                      ${typeof ending === "number" ? ending : null})`;
    cfn++;
  }
  // Lowest month-end (B19) into board_finance.
  const low = gc(19, "B");
  if (typeof low === "number") {
    await sql`
      INSERT INTO board_finance (key,label,value,unit,grouping,sort,source_cell,updated_at)
      VALUES ('cash_low','Lowest month-end cash balance',${low},'currency','cash',45,'Monthly Cash Flow!B19',NOW())
      ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`;
  }
  console.log(`board_cashflow: ${cfn} months imported (low ${low})`);
}

// ---- ensure users table + seed admin ----
await sql`
  CREATE TABLE IF NOT EXISTS board_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), username TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT, phone TEXT,
    role TEXT NOT NULL DEFAULT 'ems_board', officer_title TEXT, password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE, must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
    simple_view_default BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
await sql`
  CREATE TABLE IF NOT EXISTS board_audit (
    id BIGSERIAL PRIMARY KEY, at TIMESTAMPTZ NOT NULL DEFAULT NOW(), user_id UUID,
    username TEXT, role TEXT, action TEXT NOT NULL, detail TEXT, ip TEXT
  )`;

const existing = await sql`SELECT username FROM board_users WHERE username = 'kjames' LIMIT 1`;
if (existing.length) {
  console.log("admin 'kjames' already exists — left unchanged.");
} else {
  await sql`
    INSERT INTO board_users (username, first_name, last_name, email, role, officer_title, password_hash, must_change_password)
    VALUES ('kjames','Kenneth','James','millstadtems@gmail.com','admin','Administrator', ${hashPassword(initialTemporaryPassword)}, TRUE)`;
  console.log("seeded admin 'kjames' with temporary password assigned; forced password change enabled.");
}
console.log("Board setup complete.");

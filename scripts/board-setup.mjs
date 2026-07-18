/**
 * Board Portal — one-time / repeatable setup.
 *
 *   node scripts/board-setup.mjs ["/path/to/workbook.xlsx"]
 *
 * 1. Parses the FY workbook's Executive Dashboard and caches the headline
 *    figures into board_finance (Neon).
 * 2. Ensures the board tables exist and seeds the admin account
 *    (kjames / kjames39, forced password change) if it doesn't exist.
 *
 * Reads DATABASE_URL from .env.local. Contains no financial data itself —
 * it reads the workbook at run time — so it is safe to commit.
 */
import { readFileSync } from "node:fs";
import { scryptSync, randomBytes } from "node:crypto";
import * as XLSX from "xlsx";
import { neon } from "@neondatabase/serverless";

const WB = process.argv[2] || `${process.env.HOME}/Desktop/Millstadt EMS District Budget FY2026-27 final1.xlsx`;

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const url = env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
if (!url) { console.error("DATABASE_URL not found in .env.local"); process.exit(1); }
const sql = neon(url);

function hashPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}

// ---- read workbook ----
const wb = XLSX.read(readFileSync(WB), { type: "buffer" });
const ed = wb.Sheets["Executive Dashboard"];
if (!ed) { console.error("Executive Dashboard sheet not found"); process.exit(1); }
const cell = (a) => (ed[a] ? ed[a].v : null);

// key, label, source cell, value cell, grouping, sort, isText
const MAP = [
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
for (const [key, label, addr, isText, grouping, sort] of MAP) {
  const raw = cell(addr);
  const value = isText ? null : (typeof raw === "number" ? raw : null);
  const text = isText ? (raw != null ? String(raw) : null) : null;
  await sql`
    INSERT INTO board_finance (key, label, value, text_value, unit, grouping, sort, source_cell, updated_at)
    VALUES (${key}, ${label}, ${value}, ${text}, ${isText ? "text" : "currency"}, ${grouping}, ${sort}, ${"Executive Dashboard!" + addr}, NOW())
    ON CONFLICT (key) DO UPDATE SET
      label=EXCLUDED.label, value=EXCLUDED.value, text_value=EXCLUDED.text_value,
      grouping=EXCLUDED.grouping, sort=EXCLUDED.sort, source_cell=EXCLUDED.source_cell, updated_at=NOW()`;
  n++;
}
// District EAV (Assumptions!B66) — needed by the levy calculator.
const asm = wb.Sheets["Assumptions"];
const eav = asm && asm["B66"] ? asm["B66"].v : null;
if (typeof eav === "number") {
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
if (bs) {
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
if (cf) {
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
    VALUES ('kjames','Kenneth','James','millstadtems@gmail.com','admin','Administrator', ${hashPassword("kjames39")}, TRUE)`;
  console.log("seeded admin: username 'kjames', temp password 'kjames39' (must change at first login).");
}
console.log("Board setup complete.");

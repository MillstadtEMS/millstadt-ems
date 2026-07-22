import * as XLSX from "xlsx";
import type {
  BoardWorkbookScenario,
  BoardWorkbookScenarioCellOverride,
  BoardWorkbookScenarioOverrides,
  BoardWorkbookTransferConfig,
  BoardWorkbookView,
} from "./workbook";

const MAX_SHEET_ROWS = 220;
const MAX_SHEET_COLS = 24;
const SCENARIO_COLUMNS = ["C", "D", "E"] as const;
const OPERATING_PERCENT_COLUMNS = ["D", "E", "F"] as const;
const TRANSFER_CONFIG_ROWS = [45, 46, 47, 48, 49] as const;
const TRANSFER_DYNAMIC_ROWS = [8, 10, 11, 19, 21, 28, 29, 30, 31, 38, 39, 40] as const;
const TRANSFER_ACTIVE_ROWS = [7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 38, 39, 40] as const;

type StyledCell = XLSX.CellObject & {
  z?: string;
  s?: {
    patternType?: string;
    fgColor?: { rgb?: string };
  };
};

interface ScenarioDefinition extends BoardWorkbookScenario {
  index: number;
  column: (typeof SCENARIO_COLUMNS)[number];
}

interface TransferConfigDefinition extends BoardWorkbookTransferConfig {
  row: number;
  emts: number;
  paramedics: number;
  criticalCare: number;
}

interface TransferColumnValues {
  runs: number;
  netCollection: number;
  billingFee: number;
  billingRevenue: number;
  billingCost: number;
  hoursPerDay: number;
  daysPerWeek: number;
  annualHours: number;
  emtRate: number;
  paramedicRate: number;
  criticalCareRate: number;
  crewWages: number;
  overtime: number;
  employerTaxes: number;
  contingency: number;
  poolSize: number;
  uniforms: number;
  truckReserve: number;
  maintenance: number;
  fuelPerRun: number;
  fuel: number;
  suppliesPerRun: number;
  supplies: number;
  insurance: number;
  other1: number;
  other2: number;
  other3: number;
  totalRevenue: number;
  totalExpenses: number;
  netImpact: number;
}

interface BudgetTransferValues {
  enabled: boolean;
  runs: number;
  revenue: number;
  expenses: number;
}

function cellKey(row: number, col: number): string {
  return `${row}:${col}`;
}

function normalizeFill(cell: StyledCell | undefined): string | undefined {
  const raw = cell?.s?.fgColor?.rgb;
  if (!raw) return undefined;
  const cleaned = raw.replace(/[^0-9a-f]/gi, "").toUpperCase();
  if (cleaned.length === 8) return `#${cleaned.slice(2)}`;
  if (cleaned.length === 6) return `#${cleaned}`;
  return undefined;
}

function isDark(fill: string | undefined): boolean {
  if (!fill) return false;
  const raw = fill.replace("#", "");
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

function displayText(cell: StyledCell | undefined): string {
  if (!cell) return "";
  if (cell.w != null) return String(cell.w);
  if (cell.v instanceof Date) return cell.v.toLocaleDateString("en-US");
  if (cell.v != null) return String(cell.v);
  if (cell.f) return `=${cell.f}`;
  return "";
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "scenario";
}

function sheetCell(workbook: XLSX.WorkBook, sheetName: string, address: string): StyledCell | undefined {
  return workbook.Sheets[sheetName]?.[address] as StyledCell | undefined;
}

function cellValue(workbook: XLSX.WorkBook, sheetName: string, address: string): unknown {
  return sheetCell(workbook, sheetName, address)?.v ?? null;
}

function numeric(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const isPercent = trimmed.endsWith("%");
  const parsed = Number(trimmed.replace(/[$,%\s]/g, ""));
  if (!Number.isFinite(parsed)) return 0;
  return isPercent ? parsed / 100 : parsed;
}

function numericCell(workbook: XLSX.WorkBook, sheetName: string, address: string): number {
  return numeric(cellValue(workbook, sheetName, address));
}

function textCell(workbook: XLSX.WorkBook, sheetName: string, address: string): string {
  const value = cellValue(workbook, sheetName, address);
  return value == null ? "" : String(value);
}

function formatCalculatedValue(template: StyledCell | undefined, value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toLocaleDateString("en-US");
  if (typeof value === "string") return value;
  if (typeof value !== "number" || !Number.isFinite(value)) return "";

  const format = template?.z;
  if (format) {
    try {
      return XLSX.SSF.format(format, value);
    } catch {
      // Fall back to a readable numeric format below.
    }
  }
  if (Math.abs(value) >= 1000 || Number.isInteger(value)) {
    return value.toLocaleString("en-US", { maximumFractionDigits: Number.isInteger(value) ? 0 : 2 });
  }
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function overrideFromValue(workbook: XLSX.WorkBook, sheetName: string, address: string, value: unknown): BoardWorkbookScenarioCellOverride {
  return {
    text: formatCalculatedValue(sheetCell(workbook, sheetName, address), value),
    isNumber: typeof value === "number" && Number.isFinite(value),
  };
}

function overrideFromSource(
  workbook: XLSX.WorkBook,
  sourceSheetName: string,
  sourceAddress: string,
  targetSheetName = sourceSheetName,
  targetAddress = sourceAddress,
): BoardWorkbookScenarioCellOverride {
  const source = sheetCell(workbook, sourceSheetName, sourceAddress);
  if (source) return { text: displayText(source), isNumber: source.t === "n" };
  return overrideFromValue(workbook, targetSheetName, targetAddress, null);
}

function setOverride(
  overrides: BoardWorkbookScenarioOverrides,
  scenarioKey: string,
  sheetName: string,
  address: string,
  override: BoardWorkbookScenarioCellOverride,
): void {
  overrides[scenarioKey] ??= {};
  overrides[scenarioKey][sheetName] ??= {};
  overrides[scenarioKey][sheetName][address] = override;
}

function setCalculatedOverride(
  workbook: XLSX.WorkBook,
  overrides: BoardWorkbookScenarioOverrides,
  scenario: ScenarioDefinition,
  sheetName: string,
  address: string,
  value: unknown,
): void {
  setOverride(overrides, scenario.key, sheetName, address, overrideFromValue(workbook, sheetName, address, value));
}

function setSourceOverride(
  workbook: XLSX.WorkBook,
  overrides: BoardWorkbookScenarioOverrides,
  scenario: ScenarioDefinition,
  targetSheetName: string,
  targetAddress: string,
  sourceSheetName: string,
  sourceAddress: string,
): void {
  setOverride(
    overrides,
    scenario.key,
    targetSheetName,
    targetAddress,
    overrideFromSource(workbook, sourceSheetName, sourceAddress, targetSheetName, targetAddress),
  );
}

function findScenarios(workbook: XLSX.WorkBook): {
  scenarios: ScenarioDefinition[];
  defaultScenarioKey: string | null;
} {
  if (!workbook.Sheets.Scenarios) return { scenarios: [], defaultScenarioKey: null };
  const scenarios = SCENARIO_COLUMNS
    .map((column, index) => {
      const label = textCell(workbook, "Scenarios", `${column}6`) || textCell(workbook, "Scenarios", `${column}39`);
      return label ? { key: slugify(label), label, index: index + 1, column } : null;
    })
    .filter((scenario): scenario is ScenarioDefinition => Boolean(scenario));
  const active = textCell(workbook, "Scenarios", "B3").toLowerCase();
  return {
    scenarios,
    defaultScenarioKey: scenarios.find((scenario) => scenario.label.toLowerCase() === active)?.key ?? scenarios[0]?.key ?? null,
  };
}

function transferOverrideKey(scenarioKey: string, enabled: boolean, configKey: string): string {
  return `${scenarioKey}::transfer-${enabled ? "on" : "off"}::${configKey}`;
}

function findTransferConfigs(workbook: XLSX.WorkBook): {
  configs: TransferConfigDefinition[];
  defaultEnabled: boolean;
  defaultConfigKey: string | null;
} {
  if (!workbook.Sheets["Transfer Division"]) return { configs: [], defaultEnabled: false, defaultConfigKey: null };
  const crewCounts = [
    { emts: 2, paramedics: 2, criticalCare: 0 },
    { emts: 4, paramedics: 0, criticalCare: 0 },
    { emts: 3, paramedics: 1, criticalCare: 0 },
    { emts: 0, paramedics: 2, criticalCare: 2 },
    { emts: 2, paramedics: 1, criticalCare: 1 },
  ];
  const configs = TRANSFER_CONFIG_ROWS
    .map((row, index) => {
      const label = textCell(workbook, "Transfer Division", `A${row}`);
      if (!label) return null;
      const counts = crewCounts[index] ?? { emts: 0, paramedics: 0, criticalCare: 0 };
      return {
        key: slugify(label),
        label,
        index: index + 1,
        row,
        crew: textCell(workbook, "Transfer Division", `B${row}`),
        netCollection: displayText(sheetCell(workbook, "Transfer Division", `C${row}`)),
        ...counts,
      };
    })
    .filter((config): config is TransferConfigDefinition => Boolean(config));
  const selected = textCell(workbook, "Transfer Division", "B4");
  return {
    configs,
    defaultEnabled: textCell(workbook, "Transfer Division", "B3").toUpperCase() !== "OFF",
    defaultConfigKey: configs.find((config) => config.label === selected)?.key ?? configs[0]?.key ?? null,
  };
}

function calculateTransferColumn(
  workbook: XLSX.WorkBook,
  column: (typeof SCENARIO_COLUMNS)[number],
  config: TransferConfigDefinition,
): TransferColumnValues {
  const t = (row: number) => numericCell(workbook, "Transfer Division", `${column}${row}`);
  const runs = t(7);
  const netCollection = numericCell(workbook, "Transfer Division", `C${config.row}`);
  const billingFee = t(9);
  const billingRevenue = runs * netCollection;
  const billingCost = billingRevenue * billingFee;
  const hoursPerDay = t(13);
  const daysPerWeek = t(14);
  const annualHours = t(15);
  const emtRate = t(16);
  const paramedicRate = t(17);
  const criticalCareRate = t(18);
  const overtime = t(20);
  const crewWages = annualHours * (
    (config.emts * emtRate) +
    (config.paramedics * paramedicRate) +
    (config.criticalCare * criticalCareRate)
  );
  const employerTaxes = (crewWages + overtime) * (numericCell(workbook, "Details", "D19") + numericCell(workbook, "Details", "D20"));
  const contingency = t(22);
  const poolSize = t(23);
  const uniforms = t(24);
  const truckReserve = t(26);
  const maintenance = t(27);
  const fuelPerRun = numericCell(workbook, "Transfer Division", `E${config.row}`);
  const fuel = runs * fuelPerRun;
  const suppliesPerRun = numericCell(workbook, "Transfer Division", `D${config.row}`);
  const supplies = runs * suppliesPerRun;
  const insurance = t(32);
  const other1 = t(33);
  const other2 = t(34);
  const other3 = t(35);
  const totalRevenue = billingRevenue;
  const totalExpenses = billingCost + crewWages + overtime + employerTaxes + contingency + uniforms + truckReserve + maintenance + fuel + supplies + insurance + other1 + other2 + other3;

  return {
    runs,
    netCollection,
    billingFee,
    billingRevenue,
    billingCost,
    hoursPerDay,
    daysPerWeek,
    annualHours,
    emtRate,
    paramedicRate,
    criticalCareRate,
    crewWages,
    overtime,
    employerTaxes,
    contingency,
    poolSize,
    uniforms,
    truckReserve,
    maintenance,
    fuelPerRun,
    fuel,
    suppliesPerRun,
    supplies,
    insurance,
    other1,
    other2,
    other3,
    totalRevenue,
    totalExpenses,
    netImpact: totalRevenue - totalExpenses,
  };
}

function transferValueForRow(values: TransferColumnValues, row: number): number {
  switch (row) {
    case 7: return values.runs;
    case 8: return values.netCollection;
    case 9: return values.billingFee;
    case 10: return values.billingRevenue;
    case 11: return values.billingCost;
    case 13: return values.hoursPerDay;
    case 14: return values.daysPerWeek;
    case 15: return values.annualHours;
    case 16: return values.emtRate;
    case 17: return values.paramedicRate;
    case 18: return values.criticalCareRate;
    case 19: return values.crewWages;
    case 20: return values.overtime;
    case 21: return values.employerTaxes;
    case 22: return values.contingency;
    case 23: return values.poolSize;
    case 24: return values.uniforms;
    case 26: return values.truckReserve;
    case 27: return values.maintenance;
    case 28: return values.fuelPerRun;
    case 29: return values.fuel;
    case 30: return values.suppliesPerRun;
    case 31: return values.supplies;
    case 32: return values.insurance;
    case 33: return values.other1;
    case 34: return values.other2;
    case 35: return values.other3;
    case 38: return values.totalRevenue;
    case 39: return values.totalExpenses;
    case 40: return values.netImpact;
    default: return 0;
  }
}

function sameRowChooseFormula(formula: string): number | null {
  const match = formula.match(/CHOOSE\((?:Scenarios!)?\$?H\$?2,\$?C\$?(\d+),\$?D\$?\1,\$?E\$?\1\)/i);
  return match ? Number(match[1]) : null;
}

function addFormulaSourceOverrides(
  workbook: XLSX.WorkBook,
  overrides: BoardWorkbookScenarioOverrides,
  scenario: ScenarioDefinition,
): void {
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    for (const address of Object.keys(sheet)) {
      if (address.startsWith("!")) continue;
      const formula = (sheet[address] as StyledCell | undefined)?.f;
      if (!formula) continue;

      if (/^Scenarios!\$?B\$?3$/i.test(formula)) {
        setCalculatedOverride(workbook, overrides, scenario, sheetName, address, scenario.label);
        continue;
      }

      const directScenario = formula.match(/^Scenarios!\$?F\$?(\d+)$/i);
      if (directScenario) {
        setSourceOverride(workbook, overrides, scenario, sheetName, address, "Scenarios", `${scenario.column}${directScenario[1]}`);
        continue;
      }

      const chooseRow = sameRowChooseFormula(formula);
      if (chooseRow != null) {
        setSourceOverride(workbook, overrides, scenario, sheetName, address, sheetName, `${scenario.column}${chooseRow}`);
      }
    }
  }
}

function addDetailsScenarioOverrides(
  workbook: XLSX.WorkBook,
  overrides: BoardWorkbookScenarioOverrides,
  scenario: ScenarioDefinition,
): {
  fullTimePayroll: number;
  employerCosts: number;
  partTimeStaffing: number;
  benefits: number;
  operationsByCategory: Map<string, number>;
  operationsTotal: number;
} {
  const sc = (row: number) => numericCell(workbook, "Scenarios", `${scenario.column}${row}`);
  const d = (address: string) => numericCell(workbook, "Details", address);
  const dashboard = (address: string) => numericCell(workbook, "Dashboard", address);

  const chiefs = sc(56);
  const chiefSalary = sc(8);
  const officeManagers = sc(57);
  const officeSalary = sc(9);
  const paramedics = sc(58);
  const paramedicRate = sc(10);
  const emts = sc(59);
  const emtRate = sc(11);
  const regularHours = dashboard("B22");
  const scheduledOtHours = dashboard("B23");
  const trainingHours = dashboard("B24");
  const unscheduledOtHours = dashboard("B25");
  const holidayExtra = sc(35);
  const birthdayBonus = sc(36);
  const holidayMasterOn = textCell(workbook, "Details", "G51").toUpperCase() !== "OFF";
  const birthdayOn = textCell(workbook, "Details", "B70").toUpperCase() !== "OFF";

  let holidayPay = 0;
  if (holidayMasterOn) {
    for (let row = 53; row <= 68; row++) {
      if (textCell(workbook, "Details", `B${row}`).toUpperCase() === "OFF") continue;
      holidayPay += d(`C${row}`) * d(`D${row}`) * d(`E${row}`) * holidayExtra;
      setCalculatedOverride(workbook, overrides, scenario, "Details", `F${row}`, holidayExtra);
      setCalculatedOverride(workbook, overrides, scenario, "Details", `G${row}`, d(`C${row}`) * d(`D${row}`) * d(`E${row}`) * holidayExtra);
    }
  }

  const birthdayPay = birthdayOn ? (paramedics + emts) * birthdayBonus : 0;
  const fullTimeRows: Record<string, number> = {
    C6: chiefs,
    D6: chiefSalary,
    E6: chiefs * chiefSalary,
    C7: officeManagers,
    D7: officeSalary,
    E7: officeManagers * officeSalary,
    C8: paramedics,
    D8: paramedicRate,
    E8: paramedics * ((regularHours * paramedicRate) + (scheduledOtHours * paramedicRate * 1.5)),
    C9: emts,
    D9: emtRate,
    E9: emts * ((regularHours * emtRate) + (scheduledOtHours * emtRate * 1.5)),
    E10: holidayPay,
    E11: birthdayPay,
    E12: unscheduledOtHours * paramedicRate * 1.5,
    C13: paramedics * trainingHours,
    D13: paramedicRate,
    E13: paramedics * trainingHours * paramedicRate,
    C14: emts * trainingHours,
    D14: emtRate,
    E14: emts * trainingHours * emtRate,
  };
  fullTimeRows.E15 = fullTimeRows.E6 + fullTimeRows.E7 + fullTimeRows.E8 + fullTimeRows.E9 + fullTimeRows.E10 + fullTimeRows.E11 + fullTimeRows.E12 + fullTimeRows.E13 + fullTimeRows.E14;
  for (const [address, value] of Object.entries(fullTimeRows)) setCalculatedOverride(workbook, overrides, scenario, "Details", address, value);
  setCalculatedOverride(workbook, overrides, scenario, "Details", "F70", birthdayBonus);
  setCalculatedOverride(workbook, overrides, scenario, "Details", "G70", birthdayPay);

  const fica = d("D19");
  const medicare = d("D20");
  const imrf = d("D21");
  const unemploymentBase = d("B22");
  const unemploymentRate = d("D22");
  const employerRows: Record<string, number> = {
    E19: fullTimeRows.E15 * fica,
    E20: fullTimeRows.E15 * medicare,
    E21: fullTimeRows.E15 * imrf,
    C22: chiefs + officeManagers + paramedics + emts,
    E22: unemploymentBase * (chiefs + officeManagers + paramedics + emts) * unemploymentRate,
    E23: d("E23"),
    E24: d("E24"),
    C25: chiefs + paramedics + emts,
    E25: (chiefs * 1500) + ((paramedics + emts) * 1000),
  };
  employerRows.E26 = employerRows.E19 + employerRows.E20 + employerRows.E21 + employerRows.E22 + employerRows.E23 + employerRows.E24 + employerRows.E25;
  for (const [address, value] of Object.entries(employerRows)) setCalculatedOverride(workbook, overrides, scenario, "Details", address, value);

  for (let row = 30; row <= 36; row++) setSourceOverride(workbook, overrides, scenario, "Details", `E${row}`, "Scenarios", `${scenario.column}${row - 16}`);
  setSourceOverride(workbook, overrides, scenario, "Details", "E37", "Scenarios", `${scenario.column}21`);
  for (let row = 41; row <= 48; row++) setSourceOverride(workbook, overrides, scenario, "Details", `E${row}`, "Scenarios", `${scenario.column}${row - 17}`);
  setSourceOverride(workbook, overrides, scenario, "Details", "E49", "Scenarios", `${scenario.column}32`);

  const operationsByCategory = new Map<string, number>();
  const operatingPercentColumn = OPERATING_PERCENT_COLUMNS[scenario.index - 1] ?? "E";
  for (let row = 74; row <= 116; row++) {
    const category = textCell(workbook, "Details", `A${row}`);
    const base = d(`J${row}`);
    const pct = d(`${operatingPercentColumn}${row}`);
    const value = base * pct;
    setCalculatedOverride(workbook, overrides, scenario, "Details", `H${row}`, value);
    if (category) operationsByCategory.set(category, (operationsByCategory.get(category) ?? 0) + value);
  }
  const operationsTotal = Array.from(operationsByCategory.values()).reduce((sum, value) => sum + value, 0);

  return {
    fullTimePayroll: fullTimeRows.E15,
    employerCosts: employerRows.E26,
    partTimeStaffing: sc(21),
    benefits: sc(32),
    operationsByCategory,
    operationsTotal,
  };
}

function addBudgetDashboardScenarioOverrides(
  workbook: XLSX.WorkBook,
  overrides: BoardWorkbookScenarioOverrides,
  scenario: ScenarioDefinition,
  details: ReturnType<typeof addDetailsScenarioOverrides>,
  transfer?: BudgetTransferValues,
  overrideKey = scenario.key,
): void {
  const n = (sheet: string, address: string) => numericCell(workbook, sheet, address);
  const eav = n("Dashboard", "B5");
  const levyRate = n("Dashboard", "B6");
  const collection = n("Dashboard", "B7");
  const calls = n("Dashboard", "B8");
  const transportRate = n("Dashboard", "B9");
  const netCollection = n("Dashboard", "B10");
  const homeValue = n("Dashboard", "B28");
  const assessmentFactor = n("Dashboard", "B29");
  const emsBillingRevenue = calls * transportRate * netCollection;
  const levyRevenue = eav * levyRate * collection;
  const otherRevenue = ["C7", "C8", "C9", "C10", "C11"].reduce((sum, address) => sum + n("Budget", address), 0);
  const transferEnabled = transfer?.enabled ?? textCell(workbook, "Transfer Division", "B3").toUpperCase() !== "OFF";
  const transferRuns = transferEnabled ? transfer?.runs ?? n("Transfer Division", `${scenario.column}7`) : 0;
  const transferRevenue = transferEnabled ? transfer?.revenue ?? n("Transfer Division", `${scenario.column}38`) : 0;
  const transferExpenses = transferEnabled ? transfer?.expenses ?? n("Transfer Division", `${scenario.column}39`) : 0;
  const debtService = n("Details", "H127");
  const pastDue = n("Details", "E134");
  const capitalReserve = n("Details", "H150");
  const totalDebt = debtService + pastDue + capitalReserve;
  const totalPersonnel = details.fullTimePayroll + details.employerCosts + details.partTimeStaffing + details.benefits;
  const totalRevenue = levyRevenue + emsBillingRevenue + otherRevenue + transferRevenue;
  const totalExpenses = totalPersonnel + details.operationsTotal + totalDebt + transferExpenses;
  const surplus = totalRevenue - totalExpenses;
  const breakEvenRate = eav * collection === 0 ? 0 : (totalExpenses - emsBillingRevenue - otherRevenue - transferRevenue) / (eav * collection);

  setOverride(overrides, overrideKey, "Budget", "A2", overrideFromValue(workbook, "Budget", "A2", `Annual budget at the selected ${formatCalculatedValue(sheetCell(workbook, "Dashboard", "B6"), levyRate)} levy rate  ·  Scenario: ${scenario.label}  ·  This page updates itself.`));
  setOverride(overrides, overrideKey, "Budget", "C5", overrideFromValue(workbook, "Budget", "C5", levyRevenue));
  setOverride(overrides, overrideKey, "Budget", "C6", overrideFromValue(workbook, "Budget", "C6", emsBillingRevenue));
  setOverride(overrides, overrideKey, "Budget", "C12", overrideFromValue(workbook, "Budget", "C12", totalRevenue));
  setOverride(overrides, overrideKey, "Budget", "C15", overrideFromValue(workbook, "Budget", "C15", details.fullTimePayroll));
  setOverride(overrides, overrideKey, "Budget", "C16", overrideFromValue(workbook, "Budget", "C16", details.employerCosts));
  setOverride(overrides, overrideKey, "Budget", "C17", overrideFromValue(workbook, "Budget", "C17", details.partTimeStaffing));
  setOverride(overrides, overrideKey, "Budget", "C18", overrideFromValue(workbook, "Budget", "C18", details.benefits));
  setOverride(overrides, overrideKey, "Budget", "C19", overrideFromValue(workbook, "Budget", "C19", totalPersonnel));
  for (let row = 22; row <= 29; row++) {
    const category = textCell(workbook, "Budget", `A${row}`);
    setOverride(overrides, overrideKey, "Budget", `C${row}`, overrideFromValue(workbook, "Budget", `C${row}`, details.operationsByCategory.get(category) ?? 0));
  }
  setOverride(overrides, overrideKey, "Budget", "C30", overrideFromValue(workbook, "Budget", "C30", details.operationsTotal));
  setOverride(overrides, overrideKey, "Budget", "C33", overrideFromValue(workbook, "Budget", "C33", debtService));
  setOverride(overrides, overrideKey, "Budget", "C34", overrideFromValue(workbook, "Budget", "C34", pastDue));
  setOverride(overrides, overrideKey, "Budget", "C35", overrideFromValue(workbook, "Budget", "C35", capitalReserve));
  setOverride(overrides, overrideKey, "Budget", "C36", overrideFromValue(workbook, "Budget", "C36", totalDebt));
  setOverride(overrides, overrideKey, "Budget", "C38", overrideFromValue(workbook, "Budget", "C38", totalExpenses));
  setOverride(overrides, overrideKey, "Budget", "C40", overrideFromValue(workbook, "Budget", "C40", surplus));
  setOverride(overrides, overrideKey, "Budget", "C44", overrideFromValue(workbook, "Budget", "C44", homeValue * assessmentFactor * levyRate));
  setOverride(overrides, overrideKey, "Budget", "C45", overrideFromValue(workbook, "Budget", "C45", (homeValue * assessmentFactor * levyRate) / 12));
  setOverride(overrides, overrideKey, "Budget", "C48", overrideFromValue(workbook, "Budget", "C48", transferRevenue));
  setOverride(overrides, overrideKey, "Budget", "C49", overrideFromValue(workbook, "Budget", "C49", transferExpenses));
  setOverride(overrides, overrideKey, "Budget", "C50", overrideFromValue(workbook, "Budget", "C50", transferRevenue - transferExpenses));
  setOverride(overrides, overrideKey, "Budget", "C51", overrideFromValue(workbook, "Budget", "C51", transferRuns));
  setOverride(overrides, overrideKey, "Budget", "C52", overrideFromValue(workbook, "Budget", "C52", calls + transferRuns));

  setOverride(overrides, overrideKey, "Dashboard", "K1", overrideFromValue(workbook, "Dashboard", "K1", scenario.label));
  setOverride(overrides, overrideKey, "Dashboard", "E5", overrideFromValue(workbook, "Dashboard", "E5", totalRevenue));
  setOverride(overrides, overrideKey, "Dashboard", "H5", overrideFromValue(workbook, "Dashboard", "H5", totalExpenses));
  setOverride(overrides, overrideKey, "Dashboard", "K5", overrideFromValue(workbook, "Dashboard", "K5", surplus));
  setOverride(overrides, overrideKey, "Dashboard", "D8", overrideFromValue(workbook, "Dashboard", "D8", `Total incl. transfers: ${formatCalculatedValue(undefined, calls + transferRuns)} runs / yr`));
  setOverride(overrides, overrideKey, "Dashboard", "E8", overrideFromValue(workbook, "Dashboard", "E8", breakEvenRate));
  setOverride(overrides, overrideKey, "Dashboard", "B14", overrideFromValue(workbook, "Dashboard", "B14", numericCell(workbook, "Scenarios", `${scenario.column}56`)));
  setOverride(overrides, overrideKey, "Dashboard", "B15", overrideFromValue(workbook, "Dashboard", "B15", numericCell(workbook, "Scenarios", `${scenario.column}8`)));
  setOverride(overrides, overrideKey, "Dashboard", "B16", overrideFromValue(workbook, "Dashboard", "B16", numericCell(workbook, "Scenarios", `${scenario.column}57`)));
  setOverride(overrides, overrideKey, "Dashboard", "B17", overrideFromValue(workbook, "Dashboard", "B17", numericCell(workbook, "Scenarios", `${scenario.column}9`)));
  setOverride(overrides, overrideKey, "Dashboard", "B18", overrideFromValue(workbook, "Dashboard", "B18", numericCell(workbook, "Scenarios", `${scenario.column}58`)));
  setOverride(overrides, overrideKey, "Dashboard", "B19", overrideFromValue(workbook, "Dashboard", "B19", numericCell(workbook, "Scenarios", `${scenario.column}10`)));
  setOverride(overrides, overrideKey, "Dashboard", "B20", overrideFromValue(workbook, "Dashboard", "B20", numericCell(workbook, "Scenarios", `${scenario.column}59`)));
  setOverride(overrides, overrideKey, "Dashboard", "B21", overrideFromValue(workbook, "Dashboard", "B21", numericCell(workbook, "Scenarios", `${scenario.column}11`)));
  setOverride(overrides, overrideKey, "Dashboard", "B51", overrideFromValue(workbook, "Dashboard", "B51", totalPersonnel));
  setOverride(overrides, overrideKey, "Dashboard", "B52", overrideFromValue(workbook, "Dashboard", "B52", details.operationsTotal));
  setOverride(overrides, overrideKey, "Dashboard", "B53", overrideFromValue(workbook, "Dashboard", "B53", debtService));
  setOverride(overrides, overrideKey, "Dashboard", "B54", overrideFromValue(workbook, "Dashboard", "B54", pastDue));
  setOverride(overrides, overrideKey, "Dashboard", "B55", overrideFromValue(workbook, "Dashboard", "B55", capitalReserve));

  for (let row = 34; row <= 38; row++) {
    const rate = n("Dashboard", `G${row}`);
    const rowLevyRevenue = eav * rate * collection;
    const rowTotalRevenue = rowLevyRevenue + emsBillingRevenue + otherRevenue + transferRevenue;
    const rowSurplus = rowTotalRevenue - totalExpenses;
    setOverride(overrides, overrideKey, "Dashboard", `A${row}`, overrideFromValue(workbook, "Dashboard", `A${row}`, rate));
    setOverride(overrides, overrideKey, "Dashboard", `B${row}`, overrideFromValue(workbook, "Dashboard", `B${row}`, rowLevyRevenue));
    setOverride(overrides, overrideKey, "Dashboard", `C${row}`, overrideFromValue(workbook, "Dashboard", `C${row}`, rowTotalRevenue));
    setOverride(overrides, overrideKey, "Dashboard", `D${row}`, overrideFromValue(workbook, "Dashboard", `D${row}`, totalExpenses));
    setOverride(overrides, overrideKey, "Dashboard", `E${row}`, overrideFromValue(workbook, "Dashboard", `E${row}`, rowSurplus));
    setOverride(overrides, overrideKey, "Dashboard", `F${row}`, overrideFromValue(workbook, "Dashboard", `F${row}`, rowSurplus >= 0 ? "Fully Funds Budget" : "Funding Gap"));
  }

  setOverride(overrides, overrideKey, "Transfer Division", "H10", overrideFromValue(workbook, "Transfer Division", "H10", transferRuns));
  setOverride(overrides, overrideKey, "Transfer Division", "H38", overrideFromValue(workbook, "Transfer Division", "H38", transferRevenue));
  setOverride(overrides, overrideKey, "Transfer Division", "H39", overrideFromValue(workbook, "Transfer Division", "H39", transferExpenses));
}

function buildScenarioOverrides(
  workbook: XLSX.WorkBook,
  scenarios: ScenarioDefinition[],
): BoardWorkbookScenarioOverrides | undefined {
  if (!scenarios.length) return undefined;
  const overrides: BoardWorkbookScenarioOverrides = {};
  for (const scenario of scenarios) {
    setCalculatedOverride(workbook, overrides, scenario, "Scenarios", "B3", scenario.label);
    setCalculatedOverride(workbook, overrides, scenario, "Scenarios", "H2", scenario.index);
    addFormulaSourceOverrides(workbook, overrides, scenario);
    const details = addDetailsScenarioOverrides(workbook, overrides, scenario);
    addBudgetDashboardScenarioOverrides(workbook, overrides, scenario, details);
  }
  return overrides;
}

function addTransferControlOverrides(
  workbook: XLSX.WorkBook,
  overrides: BoardWorkbookScenarioOverrides,
  scenario: ScenarioDefinition,
  details: ReturnType<typeof addDetailsScenarioOverrides>,
  config: TransferConfigDefinition,
  enabled: boolean,
): void {
  const overrideKey = transferOverrideKey(scenario.key, enabled, config.key);
  const activeValues = calculateTransferColumn(workbook, scenario.column, config);

  setOverride(overrides, overrideKey, "Transfer Division", "B3", overrideFromValue(workbook, "Transfer Division", "B3", enabled ? "ON" : "OFF"));
  setOverride(overrides, overrideKey, "Transfer Division", "B4", overrideFromValue(workbook, "Transfer Division", "B4", config.label));
  setOverride(overrides, overrideKey, "Transfer Division", "H4", overrideFromValue(workbook, "Transfer Division", "H4", config.index));
  setOverride(overrides, overrideKey, "Transfer Division", "B36", overrideFromValue(
    workbook,
    "Transfer Division",
    "B36",
    `${config.label} — ${config.crew} · ${config.netCollection} / run`,
  ));

  for (const column of SCENARIO_COLUMNS) {
    const values = calculateTransferColumn(workbook, column, config);
    for (const row of TRANSFER_DYNAMIC_ROWS) {
      setOverride(overrides, overrideKey, "Transfer Division", `${column}${row}`, overrideFromValue(
        workbook,
        "Transfer Division",
        `${column}${row}`,
        transferValueForRow(values, row),
      ));
    }
  }

  for (const row of TRANSFER_ACTIVE_ROWS) {
    setOverride(overrides, overrideKey, "Transfer Division", `F${row}`, overrideFromValue(
      workbook,
      "Transfer Division",
      `F${row}`,
      transferValueForRow(activeValues, row),
    ));
  }

  addBudgetDashboardScenarioOverrides(workbook, overrides, scenario, details, {
    enabled,
    runs: activeValues.runs,
    revenue: activeValues.totalRevenue,
    expenses: activeValues.totalExpenses,
  }, overrideKey);
}

function buildTransferOverrides(
  workbook: XLSX.WorkBook,
  scenarios: ScenarioDefinition[],
  configs: TransferConfigDefinition[],
): BoardWorkbookScenarioOverrides | undefined {
  if (!scenarios.length || !configs.length) return undefined;
  const overrides: BoardWorkbookScenarioOverrides = {};
  for (const scenario of scenarios) {
    const scratch: BoardWorkbookScenarioOverrides = {};
    const details = addDetailsScenarioOverrides(workbook, scratch, scenario);
    for (const config of configs) {
      addTransferControlOverrides(workbook, overrides, scenario, details, config, true);
      addTransferControlOverrides(workbook, overrides, scenario, details, config, false);
    }
  }
  return overrides;
}

function buildMergeMaps(merges: XLSX.Range[] | undefined): {
  starts: Map<string, { colSpan: number; rowSpan: number }>;
  covered: Set<string>;
} {
  const starts = new Map<string, { colSpan: number; rowSpan: number }>();
  const covered = new Set<string>();

  for (const merge of merges ?? []) {
    const rowSpan = merge.e.r - merge.s.r + 1;
    const colSpan = merge.e.c - merge.s.c + 1;
    if (rowSpan <= 1 && colSpan <= 1) continue;
    starts.set(cellKey(merge.s.r, merge.s.c), { colSpan, rowSpan });
    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        if (r === merge.s.r && c === merge.s.c) continue;
        covered.add(cellKey(r, c));
      }
    }
  }

  return { starts, covered };
}

function columnWidth(sheet: XLSX.WorkSheet, colIndex: number): number | undefined {
  const cols = sheet["!cols"] as Array<{ wch?: number; wpx?: number } | undefined> | undefined;
  const col = cols?.[colIndex];
  if (!col) return undefined;
  const px = typeof col.wpx === "number" ? col.wpx : typeof col.wch === "number" ? Math.round(col.wch * 7 + 24) : undefined;
  if (!px) return undefined;
  return Math.max(74, Math.min(260, px));
}

export function parseBoardWorkbook(buffer: Buffer | ArrayBuffer, source: {
  sourceName: string;
  downloadUrl: string;
  updatedAt: string | null;
  size: number | null;
}): BoardWorkbookView {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellFormula: true,
    cellStyles: true,
    cellDates: true,
  });

  const { scenarios, defaultScenarioKey } = findScenarios(workbook);
  const transfer = findTransferConfigs(workbook);
  const scenarioOverrides = buildScenarioOverrides(workbook, scenarios);
  const transferOverrides = buildTransferOverrides(workbook, scenarios, transfer.configs);

  const sheets = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const ref = sheet["!ref"] ?? "A1:A1";
    const range = XLSX.utils.decode_range(ref);
    const totalRows = range.e.r - range.s.r + 1;
    const totalCols = range.e.c - range.s.c + 1;
    const rowLimit = Math.min(totalRows, MAX_SHEET_ROWS);
    const colLimit = Math.min(totalCols, MAX_SHEET_COLS);
    const { starts, covered } = buildMergeMaps(sheet["!merges"]);

    const columns = Array.from({ length: colLimit }, (_, index) => ({
      label: XLSX.utils.encode_col(range.s.c + index),
      width: columnWidth(sheet, range.s.c + index),
    }));

    const rows = [];
    for (let rowOffset = 0; rowOffset < rowLimit; rowOffset++) {
      const r = range.s.r + rowOffset;
      const row = [];
      for (let colOffset = 0; colOffset < colLimit; colOffset++) {
        const c = range.s.c + colOffset;
        const key = cellKey(r, c);
        if (covered.has(key)) continue;

        const address = XLSX.utils.encode_cell({ r, c });
        const cell = sheet[address] as StyledCell | undefined;
        const fill = normalizeFill(cell);
        const merge = starts.get(key);
        row.push({
          id: `${name}-${address}`,
          address,
          text: displayText(cell),
          isNumber: cell?.t === "n",
          isFormula: Boolean(cell?.f),
          formula: cell?.f ? `=${cell.f}` : undefined,
          fill,
          darkFill: isDark(fill),
          colSpan: merge?.colSpan,
          rowSpan: merge?.rowSpan,
        });
      }
      rows.push(row);
    }

    return {
      name,
      columns,
      rows,
      totalRows,
      totalCols,
      truncated: totalRows > rowLimit || totalCols > colLimit,
    };
  });

  return {
    ...source,
    sheets,
    scenarios: scenarios.map(({ key, label }) => ({ key, label })),
    defaultScenarioKey,
    scenarioOverrides,
    transferConfigs: transfer.configs.map(({ key, label, index, crew, netCollection }) => ({ key, label, index, crew, netCollection })),
    defaultTransferEnabled: transfer.defaultEnabled,
    defaultTransferConfigKey: transfer.defaultConfigKey,
    transferOverrides,
  };
}

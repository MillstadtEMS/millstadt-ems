/** EMS rate comparison only; see docs/ESD_TAX_CALCULATOR.md for sources and scope. */
export const EMS_TAX_AREAS = [
  { id: "millstadt", label: "Millstadt Fire Protection District", offsetUnits: 9 },
  { id: "hecker", label: "Hecker FPD — Millstadt Township portion", offsetUnits: 0 },
  { id: "waterloo", label: "Waterloo FPD — St. Clair County portion", offsetUnits: 0 },
] as const;
export type TaxArea = typeof EMS_TAX_AREAS[number]["id"];

export type TaxInput = { area: TaxArea } & (
  | { mode: "home"; homeValue: string; exemptions: string; multiplier: string }
  | { mode: "eav"; eav: string; exemptions: string }
  | { mode: "bill"; taxableValue: string });

const B = BigInt;
const ZERO = B(0);
const ONE = B(1);
const TWO = B(2);
const HUNDRED = B(100);
const RATE_DENOMINATOR = B(10000);
const FACTOR_SCALE = B(1000000);
const MAX_CENTS = B("100000000000"); // $1 billion; bound inputs before arithmetic.

export function parseDollars(value: string): bigint | null {
  const text = value.trim().replace(/^\$\s*/, "");
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(text) || text.length > 24) return null;
  const [whole, fraction = ""] = text.replaceAll(",", "").split(".");
  const cents = B(whole) * HUNDRED + B(fraction.padEnd(2, "0"));
  return cents <= MAX_CENTS ? cents : null;
}

function parseFactor(value: string): bigint | null {
  const text = value.trim();
  if (!/^\d{1,2}(?:\.\d{1,6})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const factor = B(whole) * FACTOR_SCALE + B(fraction.padEnd(6, "0"));
  return factor > ZERO && factor <= B(10) * FACTOR_SCALE ? factor : null;
}

/** Round a nonnegative rational to the nearest integer, half up. */
function rounded(numerator: bigint, denominator: bigint): bigint {
  return numerator / denominator + (numerator % denominator * TWO >= denominator ? ONE : ZERO);
}

function dollars(cents: bigint): number { return Number(cents) / 100; }

export function calculateEmsTax(input: TaxInput) {
  const area = EMS_TAX_AREAS.find(area => area.id === input.area);
  if (!area) throw new Error("Choose the fire tax district listed on your county property record.");
  let numerator: bigint;
  let denominator = ONE;
  let eav: number | null = null;
  let exemptions: number | null = null;
  let homeValue: number | null = null;
  let exemptionsExceedEav = false;

  if (input.mode === "home") {
    const home = parseDollars(input.homeValue);
    const deductions = parseDollars(input.exemptions);
    const factor = parseFactor(input.multiplier);
    if (home === null) throw new Error("Enter a home value from $0 to $1 billion, with no more than two decimal places.");
    if (deductions === null) throw new Error("Enter total exemptions from $0 to $1 billion, with no more than two decimal places.");
    if (factor === null) throw new Error("Enter an equalization factor greater than 0 and no more than 10, with up to six decimal places.");
    // Preserve the exact one-third fraction. Do not approximate with 0.33 or 0.3333.
    denominator = B(3) * FACTOR_SCALE;
    const gross = home * factor;
    numerator = gross - deductions * denominator;
    exemptionsExceedEav = numerator < ZERO;
    if (numerator < ZERO) numerator = ZERO;
    eav = dollars(rounded(gross, denominator));
    homeValue = dollars(home);
    exemptions = dollars(deductions);
  } else if (input.mode === "eav") {
    const assessed = parseDollars(input.eav);
    const deductions = parseDollars(input.exemptions);
    if (assessed === null) throw new Error("Enter your EAV before exemptions from $0 to $1 billion, with no more than two decimal places.");
    if (deductions === null) throw new Error("Enter total approved exemptions, or 0 for none, with no more than two decimal places.");
    // EAV already includes equalization; subtract exemptions once, without dividing by 3.
    numerator = assessed - deductions;
    exemptionsExceedEav = numerator < ZERO;
    if (numerator < ZERO) numerator = ZERO;
    eav = dollars(assessed);
    exemptions = dollars(deductions);
  } else if (input.mode === "bill") {
    const taxable = parseDollars(input.taxableValue);
    if (taxable === null) throw new Error("Enter the taxable value after exemptions from $0 to $1 billion, with no more than two decimal places.");
    numerator = taxable;
  } else {
    throw new Error("Choose home value, EAV, or tax bill.");
  }

  const annual = (rateUnits: number) => rounded(numerator * B(rateUnits), denominator * RATE_DENOMINATOR);
  // County 2025 report: FDMI ambulance 0.0900% (p. 57); no separate
  // ambulance fund for FDHE (p. 53) or FDWA (p. 72). Rates are not editable.
  const before = annual(area.offsetUnits);
  const after = annual(30);
  const ceiling = annual(40);
  // Subtract displayed annual amounts so the comparison always reconciles to the cent.
  const increase = after - before;
  return {
    homeValue, eav, exemptions, exemptionsExceedEav,
    taxableValue: dollars(rounded(numerator, denominator)),
    before: dollars(before),
    after: dollars(after),
    increase: dollars(increase),
    monthlyIncrease: dollars(rounded(increase, B(12))),
    ceiling: dollars(ceiling),
    ceilingIncrease: dollars(ceiling - before),
  };
}

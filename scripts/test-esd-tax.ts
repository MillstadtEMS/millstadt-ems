import test from "node:test";
import assert from "node:assert/strict";
import { calculateEmsTax, parseDollars, type TaxInput } from "../lib/esd-tax";
import { REVIEWED_PARCEL, PARCEL_COMPARISON, ILLUSTRATIVE_HALF_PERCENT, PLANNED_BUDGET } from "../lib/esd-fact-check";

const home = (homeValue = "300000", exemptions = "6000", multiplier = "1") =>
  calculateEmsTax({ area: "millstadt", mode: "home", homeValue, exemptions, multiplier });
const bill = (taxableValue: string) => calculateEmsTax({ area: "millstadt", mode: "bill", taxableValue });
const eav = (value: string, exemptions: string) => calculateEmsTax({ area: "millstadt", mode: "eav", eav: value, exemptions });

test("each input mode uses the selected district's certified ambulance offset", () => {
  for (const area of ["millstadt", "hecker", "waterloo"] as const) {
    const inputs: TaxInput[] = [
      { area, mode: "home", homeValue: "300000", exemptions: "6000", multiplier: "1" },
      { area, mode: "eav", eav: "100000", exemptions: "6000" },
      { area, mode: "bill", taxableValue: "94000" },
    ];
    for (const input of inputs) {
      const r = calculateEmsTax(input);
      assert.deepEqual([r.before, r.after, r.increase, r.monthlyIncrease],
        area === "millstadt" ? [84.6, 282, 197.4, 16.45] : [0, 282, 282, 23.5]);
    }
  }
});

test("Hecker and Waterloo county examples do not receive Millstadt's offset", () => {
  const hecker = calculateEmsTax({ area: "hecker", mode: "bill", taxableValue: "49872" });
  const waterloo = calculateEmsTax({ area: "waterloo", mode: "bill", taxableValue: "12584" });
  assert.deepEqual([hecker.before, hecker.after, hecker.increase, hecker.monthlyIncrease], [0, 149.62, 149.62, 12.47]);
  assert.deepEqual([waterloo.before, waterloo.after, waterloo.increase, waterloo.monthlyIncrease], [0, 37.75, 37.75, 3.15]);
  const halfCent = calculateEmsTax({ area: "hecker", mode: "bill", taxableValue: "5" });
  assert.deepEqual([halfCent.before, halfCent.after, halfCent.increase], [0, 0.02, 0.02]);
});

test("missing, unknown and invalid districts never default to an offset", () => {
  for (const area of [undefined, "", "unknown", "FDMI", "__proto__"]) {
    assert.throws(() => calculateEmsTax({ area, mode: "bill", taxableValue: "100000" } as unknown as TaxInput), /Choose the fire tax district/);
  }
});

test("$300,000 home with $6,000 exemption: source-derived hand calculation", () => {
  assert.deepEqual(home(), {
    homeValue: 300000, eav: 100000, exemptions: 6000, exemptionsExceedEav: false,
    taxableValue: 94000, before: 84.6, after: 282, increase: 197.4,
    monthlyIncrease: 16.45, ceiling: 376, ceilingIncrease: 291.4,
  });
});
test("independent reference table across ordinary home values", () => {
  const rows = [
    [100000, 24.6, 82, 57.4], [150000, 39.6, 132, 92.4],
    [200000, 54.6, 182, 127.4], [250000, 69.6, 232, 162.4],
    [400000, 114.6, 382, 267.4], [500000, 144.6, 482, 337.4],
  ];
  for (const [value, before, after, increase] of rows) {
    const r = home(String(value));
    assert.deepEqual([r.before, r.after, r.increase], [before, after, increase]);
  }
});
test("one-third precision: $100,000 without exemptions", () => {
  const r = home("100000", "0");
  assert.equal(r.eav, 33333.33);
  assert.deepEqual([r.before, r.after, r.increase], [30, 100, 70]);
});
test("equalization occurs before exemptions", () => {
  const r = home("300000", "6000", "1.05");
  assert.deepEqual([r.eav, r.taxableValue, r.before, r.after, r.increase], [105000, 99000, 89.1, 297, 207.9]);
});
test("tax-bill mode uses final value directly; no repeated exemption or division", () => {
  const r = bill("94,000");
  assert.deepEqual([r.taxableValue, r.before, r.after, r.increase], [94000, 84.6, 282, 197.4]);
  assert.equal(r.eav, null);
  assert.equal(r.homeValue, null);
});
test("county EAV and granted exemptions give the same tax as its net taxable value", () => {
  const r = eav("118,899", "13,000");
  assert.deepEqual([r.eav, r.exemptions, r.taxableValue, r.before, r.after, r.increase, r.monthlyIncrease],
    [118899, 13000, 105899, 95.31, 317.70, 222.39, 18.53]);
  assert.equal(r.homeValue, null);
  assert.equal(r.after, bill("105899").after);
  assert.equal(r.increase, bill("105899").increase);
});
test("EAV mode starts after equalization and retains cents when deducting exemptions", () => {
  const r = eav("105000", "6000");
  assert.deepEqual([r.taxableValue, r.before, r.after, r.increase], [99000, 89.1, 297, 207.9]);
  assert.equal(r.after, home("300000", "6000", "1.05").after);
  const cents = eav("12345.67", "12.34");
  assert.deepEqual([cents.taxableValue, cents.before, cents.after, cents.increase], [12333.33, 11.1, 37, 25.9]);
});
test("EAV mode handles zero, full exemptions and invalid or missing amounts", () => {
  assert.equal(eav("100000", "0").after, 300);
  for (const r of [eav("0", "0"), eav("1000", "1000"), eav("1000", "2000")]) {
    assert.deepEqual([r.taxableValue, r.before, r.after, r.increase], [0, 0, 0, 0]);
  }
  assert.equal(eav("1000", "2000").exemptionsExceedEav, true);
  for (const value of ["", "-1", "abc", "1.234", "1e5", "1000000000.01"]) {
    assert.throws(() => eav(value, "0"));
    assert.throws(() => eav("100000", value));
  }
});
test("zero taxable value and exemptions exceeding EAV never create a negative tax", () => {
  for (const r of [home("0", "0"), home("12000", "6000"), bill("0")]) {
    assert.deepEqual([r.taxableValue, r.before, r.after, r.increase, r.ceiling], [0, 0, 0, 0, 0]);
  }
  assert.equal(home("12000", "6000").exemptionsExceedEav, true);
});
test("cent rounding reconciles annual comparison, including half-cent cases", () => {
  const r = bill("50"); // .045 -> .05; .15 - .05 -> .10
  assert.deepEqual([r.before, r.after, r.increase], [0.05, 0.15, 0.1]);
  for (const value of ["5", "16.67", "12345.67", "33333.33", "999999999.99"]) {
    const r = bill(value);
    assert.equal(Math.round(r.after * 100) - Math.round(r.before! * 100), Math.round(r.increase! * 100));
  }
});
test("formatting accepts dollars and properly grouped commas without accepting malformed input", () => {
  assert.equal(parseDollars(" $300,000.25 "), BigInt(30000025));
  assert.equal(parseDollars("0.01"), BigInt(1));
  for (const value of ["", " ", "-1", "NaN", "Infinity", "1e6", "300,00", "abc", "1.234", "1,2,3", "1000000000.01"]) {
    assert.equal(parseDollars(value), null, value);
    assert.throws(() => bill(value));
  }
});
test("invalid equalization factors and exemptions are rejected", () => {
  for (const factor of ["", "0", "-1", "Infinity", "1.0000001", "10.1", "1abc"]) {
    assert.throws(() => home("300000", "6000", factor));
  }
  assert.throws(() => home("300000", ""));
  assert.throws(() => home("", "6000"));
});
test("bounded large values retain precision", () => {
  assert.equal(bill("1000000000").after, 3000000);
  assert.equal(home("1000000000", "0", "10").after, 10000000);
});

test("verified 2025 Traver Tine record reconciles to the flyer and planned net change", () => {
  assert.equal(REVIEWED_PARCEL.eav - REVIEWED_PARCEL.exemptions, 105899);
  assert.deepEqual([
    PARCEL_COMPARISON.before, PARCEL_COMPARISON.after, PARCEL_COMPARISON.increase,
    PARCEL_COMPARISON.monthlyIncrease, PARCEL_COMPARISON.ceiling, PARCEL_COMPARISON.ceilingIncrease,
  ], [95.31, 317.70, 222.39, 18.53, 423.60, 328.29]);
  assert.equal(Math.round(PARCEL_COMPARISON.ceiling), 424);
});

test("flyer's separate 0.50% illustration rounds half cents before subtracting the old tax", () => {
  assert.deepEqual(ILLUSTRATIVE_HALF_PERCENT, { annual: 529.50, increase: 434.19 });
});

test("the planning-budget gaps reconcile and already include 0.30% revenue", () => {
  assert.equal(PLANNED_BUDGET.operatingGap, 136404.39);
  assert.equal(PLANNED_BUDGET.fullGap, 398975.82);
  assert.equal(Math.round(PLANNED_BUDGET.totalRevenue * 100), 103107211 + 22727433);
  assert.equal(Math.round(PLANNED_BUDGET.totalBudget * 100), 139475083 + 26257143);
});

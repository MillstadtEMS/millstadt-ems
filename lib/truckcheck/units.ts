/**
 * Unit specs — drive tire-pressure layout, abnormal thresholds, and which
 * categories appear (e.g., DEF only on diesel units).
 */

export interface TirePosition {
  key: string;
  label: string;
  minPsi: number;
  maxPsi: number;
}

export interface UnitSpec {
  number: string;
  name: string;
  description: string;
  dually: boolean;
  hasDef: boolean;
  hasNarcotics: boolean;
  fuelMinPercent: number;       // for "fuel below minimum" flag (Illinois law often calls for ≥75%)
  mainO2MinPsi: number;
  portableO2MinPsi: number;
  tires: TirePosition[];
}

const FRONT: TirePosition[] = [
  { key: "tire_front_left",  label: "Front Left",  minPsi: 75,  maxPsi: 95 },
  { key: "tire_front_right", label: "Front Right", minPsi: 75,  maxPsi: 95 },
];

const DUALLY_REAR: TirePosition[] = [
  { key: "tire_rear_left_outer",  label: "Rear Left Outer",  minPsi: 75, maxPsi: 95 },
  { key: "tire_rear_left_inner",  label: "Rear Left Inner",  minPsi: 75, maxPsi: 95 },
  { key: "tire_rear_right_outer", label: "Rear Right Outer", minPsi: 75, maxPsi: 95 },
  { key: "tire_rear_right_inner", label: "Rear Right Inner", minPsi: 75, maxPsi: 95 },
];

const SINGLE_REAR: TirePosition[] = [
  { key: "tire_rear_left",  label: "Rear Left",  minPsi: 35, maxPsi: 55 },
  { key: "tire_rear_right", label: "Rear Right", minPsi: 35, maxPsi: 55 },
];

const dually = (num: string, name: string, description: string): UnitSpec => ({
  number: num,
  name,
  description,
  dually: true,
  hasDef: true,
  hasNarcotics: true,
  fuelMinPercent: 75,
  mainO2MinPsi: 1500,
  portableO2MinPsi: 1500,
  tires: [...FRONT, ...DUALLY_REAR],
});

const sprinter = (num: string, name: string, description: string): UnitSpec => ({
  number: num,
  name,
  description,
  dually: false,
  hasDef: true,
  hasNarcotics: true,
  fuelMinPercent: 75,
  mainO2MinPsi: 1500,
  portableO2MinPsi: 1500,
  tires: [...FRONT, ...SINGLE_REAR],
});

export const UNITS: UnitSpec[] = [
  dually("3935", "M3935", "Paramedic Unit — 2025 Ford E450 Demers"),
  dually("3926", "M3926", "Paramedic Unit — Ford E450 Demers"),
  dually("3026", "M3026", "Paramedic Unit — Ford dually"),
  sprinter("3925", "M3925", "Reserve Unit — Demers Sprinter Van"),
];

export function getUnit(unitNumber: string): UnitSpec | null {
  return UNITS.find((u) => u.number === unitNumber.trim()) ?? null;
}

export function unitOrFallback(unitNumber: string): UnitSpec {
  const u = getUnit(unitNumber);
  if (u) return u;
  // Fallback: dually layout so we never under-collect data on an unknown unit.
  return dually(unitNumber || "UNKNOWN", `Unit ${unitNumber || "?"}`, "Unknown unit");
}

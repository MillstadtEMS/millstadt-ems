/**
 * Structured truck-check checklist template.
 *
 * Each item declares its responseType and the rules around it so the form,
 * the pencil-whip detector, and the trend dashboard all stay in sync.
 */

import type { UnitSpec } from "./units";

export type ResponseType =
  | "passfail"   // Pass | Fail | NA — comment required on Fail
  | "status"     // enum of statuses — comment required on configured statuses
  | "fluid"      // status enum + optional "amount added" — comment required on configured statuses
  | "numeric"    // numeric value with min/max bounds
  | "tire_psi"   // expands into N tire fields, one per position on the unit
  | "stock";     // Stocked | Low | Missing | Restocked | Expired | Not Checked — comment required on non-stocked

export interface ItemBase {
  itemKey: string;
  label: string;
  category: string;
  trendGroup?: string;     // groups related items for trend analysis (e.g. "washer_fluid")
  optional?: boolean;
}

export interface PassFailItem extends ItemBase {
  responseType: "passfail";
  failComment: true;
  options?: readonly string[]; // defaults to Pass | Issue Noted | Fail | NA
}

export interface StatusItem extends ItemBase {
  responseType: "status";
  statuses: readonly string[];
  commentRequiredOn: readonly string[];
}

export interface FluidItem extends ItemBase {
  responseType: "fluid";
  statuses: readonly string[];                  // e.g. Full | Filled | Low | Empty | Leak Noted | Not Checked
  commentRequiredOn: readonly string[];
  amountUnit?: string;                          // gallons | quarts | liters | oz
  amountRequiredOn: readonly string[];          // e.g. ['Filled']
}

export interface NumericItem extends ItemBase {
  responseType: "numeric";
  unitOfMeasure: string;
  min?: number;                                  // values below this are abnormal (require comment)
  max?: number;
  required: boolean;
}

export interface TirePsiItem extends ItemBase {
  responseType: "tire_psi";
  // Tire positions come from the unit spec at runtime.
}

export interface StockItem extends ItemBase {
  responseType: "stock";
  amountUnit?: string;
}

export type ChecklistItem =
  | PassFailItem
  | StatusItem
  | FluidItem
  | NumericItem
  | TirePsiItem
  | StockItem;

export interface CategoryDef {
  category: string;
  description?: string;
  items: ChecklistItem[];
}

// ── Shared option lists ──────────────────────────────────────────────────

export const PASSFAIL_OPTS = ["Pass", "Issue Noted", "Fail", "N/A"] as const;
export const FLUID_OPTS = [
  "Full",
  "Filled",
  "Low",
  "Empty",
  "Leak Noted",
  "Not Checked",
] as const;
export const OIL_OPTS = [
  "Full",
  "Added Oil",
  "Low",
  "Overfilled",
  "Leak Noted",
  "Not Checked",
] as const;
export const STOCK_OPTS = [
  "Stocked",
  "Low",
  "Missing",
  "Restocked",
  "Expired",
  "Not Checked",
] as const;

// ── Template ─────────────────────────────────────────────────────────────

export function buildTemplate(unit: UnitSpec): CategoryDef[] {
  const cats: CategoryDef[] = [
    {
      category: "Vehicle Exterior",
      items: [
        { itemKey: "body_damage",      label: "Body damage",           category: "Vehicle Exterior", responseType: "passfail", failComment: true },
        { itemKey: "emergency_lights", label: "Emergency lights",      category: "Vehicle Exterior", responseType: "passfail", failComment: true },
        { itemKey: "siren",            label: "Siren / air horn",      category: "Vehicle Exterior", responseType: "passfail", failComment: true },
        { itemKey: "headlights",       label: "Headlights / high beams", category: "Vehicle Exterior", responseType: "passfail", failComment: true },
        { itemKey: "brake_lights",     label: "Brake lights",          category: "Vehicle Exterior", responseType: "passfail", failComment: true },
        { itemKey: "turn_signals",     label: "Turn signals / hazards", category: "Vehicle Exterior", responseType: "passfail", failComment: true },
        { itemKey: "scene_lights",     label: "Scene / load lights",   category: "Vehicle Exterior", responseType: "passfail", failComment: true },
        { itemKey: "mirrors_windows",  label: "Mirrors / windows",     category: "Vehicle Exterior", responseType: "status",
          statuses: ["Pass", "Damage Noted", "Fail"], commentRequiredOn: ["Damage Noted", "Fail"] },
        { itemKey: "wipers",           label: "Windshield wipers",     category: "Vehicle Exterior", responseType: "status",
          statuses: ["Pass", "Replaced", "Fail"], commentRequiredOn: ["Replaced", "Fail"] },
        { itemKey: "washer_fluid",     label: "Windshield washer fluid", category: "Vehicle Exterior", responseType: "fluid", trendGroup: "washer_fluid",
          statuses: FLUID_OPTS.slice() as unknown as string[], amountUnit: "oz", amountRequiredOn: ["Filled"], commentRequiredOn: ["Filled", "Low", "Empty", "Leak Noted"] },
        { itemKey: "shoreline",        label: "Shoreline plugged in / charging", category: "Vehicle Exterior", responseType: "status",
          statuses: ["Yes", "No", "Issue"], commentRequiredOn: ["No", "Issue"] },
        { itemKey: "ext_compartments", label: "Exterior compartments secured", category: "Vehicle Exterior", responseType: "status",
          statuses: ["Yes", "No"], commentRequiredOn: ["No"] },
      ],
    },
    {
      category: "Tires",
      items: [
        { itemKey: "tire_psi",         label: "Tire pressures",         category: "Tires", responseType: "tire_psi", trendGroup: "tire_psi" },
        { itemKey: "tire_condition",   label: "Tire condition",         category: "Tires", responseType: "status",
          statuses: ["Good", "Wear Noted", "Damage Noted", "Leak Suspected"], commentRequiredOn: ["Wear Noted", "Damage Noted", "Leak Suspected"] },
      ],
    },
    {
      category: "Fluids",
      items: [
        { itemKey: "oil",      label: "Engine oil",      category: "Fluids", responseType: "fluid", trendGroup: "oil",
          statuses: OIL_OPTS.slice() as unknown as string[], amountUnit: "qt", amountRequiredOn: ["Added Oil"], commentRequiredOn: ["Added Oil", "Low", "Overfilled", "Leak Noted"] },
        { itemKey: "coolant",  label: "Coolant",         category: "Fluids", responseType: "fluid", trendGroup: "coolant",
          statuses: FLUID_OPTS.slice() as unknown as string[], amountUnit: "oz", amountRequiredOn: ["Filled"], commentRequiredOn: ["Filled", "Low", "Empty", "Leak Noted"] },
        { itemKey: "brake_fluid", label: "Brake fluid",  category: "Fluids", responseType: "status",
          statuses: ["Full", "Low", "Issue"], commentRequiredOn: ["Low", "Issue"] },
        { itemKey: "power_steering", label: "Power steering fluid", category: "Fluids", responseType: "status", optional: true,
          statuses: ["Full", "Low", "Issue", "N/A"], commentRequiredOn: ["Low", "Issue"] },
      ],
    },
    {
      category: "Cab / Driver",
      items: [
        { itemKey: "odometer",       label: "Odometer (miles)",      category: "Cab / Driver", responseType: "numeric", unitOfMeasure: "mi", required: true },
        { itemKey: "fuel_level",     label: "Fuel level",            category: "Cab / Driver", responseType: "status", trendGroup: "fuel_level",
          statuses: ["Full", "3/4", "1/2", "1/4", "Empty"], commentRequiredOn: ["1/4", "Empty"] },
        { itemKey: "tablet_mdc",     label: "Tablet / MDC present + charging", category: "Cab / Driver", responseType: "status",
          statuses: ["Yes", "No", "Issue"], commentRequiredOn: ["No", "Issue"] },
        { itemKey: "radio_main",     label: "Mobile radio functional", category: "Cab / Driver", responseType: "status",
          statuses: ["Yes", "No", "Issue"], commentRequiredOn: ["No", "Issue"] },
        { itemKey: "portable_radio", label: "Portable radio battery charged", category: "Cab / Driver", responseType: "status",
          statuses: ["Yes", "No", "Issue"], commentRequiredOn: ["No", "Issue"] },
        { itemKey: "ppe_complete",   label: "PPE available",          category: "Cab / Driver", responseType: "status",
          statuses: ["Complete", "Missing", "Issue"], commentRequiredOn: ["Missing", "Issue"] },
        { itemKey: "reg_insurance",  label: "Registration / insurance cards", category: "Cab / Driver", responseType: "status",
          statuses: ["Present", "Missing"], commentRequiredOn: ["Missing"] },
        { itemKey: "fuel_card",      label: "Fuel card present",      category: "Cab / Driver", responseType: "status",
          statuses: ["Yes", "No"], commentRequiredOn: ["No"] },
        { itemKey: "cab_cleanliness", label: "Cab cleanliness",       category: "Cab / Driver", responseType: "status",
          statuses: ["Clean", "Needs Cleaning", "Issue"], commentRequiredOn: ["Needs Cleaning", "Issue"] },
      ],
    },
    {
      category: "Patient Compartment",
      items: [
        { itemKey: "main_o2_psi",    label: "Main oxygen", category: "Patient Compartment", responseType: "numeric",
          unitOfMeasure: "psi", min: unit.mainO2MinPsi, max: 2200, required: true, trendGroup: "main_o2" },
        { itemKey: "portable_o2_psi", label: "Portable oxygen", category: "Patient Compartment", responseType: "numeric",
          unitOfMeasure: "psi", min: unit.portableO2MinPsi, max: 2200, required: true, trendGroup: "portable_o2" },
        { itemKey: "o2_wrench",      label: "Oxygen wrench present", category: "Patient Compartment", responseType: "status",
          statuses: ["Yes", "No"], commentRequiredOn: ["No"] },
        { itemKey: "suction_built",  label: "Built-in suction",      category: "Patient Compartment", responseType: "status",
          statuses: ["Yes", "No", "Issue"], commentRequiredOn: ["No", "Issue"] },
        { itemKey: "suction_port",   label: "Portable suction charged", category: "Patient Compartment", responseType: "status",
          statuses: ["Yes", "No", "Issue"], commentRequiredOn: ["No", "Issue"] },
        { itemKey: "monitor",        label: "Monitor present + charged", category: "Patient Compartment", responseType: "status",
          statuses: ["Yes", "No", "Issue"], commentRequiredOn: ["No", "Issue"] },
        { itemKey: "monitor_battery", label: "Spare monitor battery charged", category: "Patient Compartment", responseType: "status",
          statuses: ["Yes", "No"], commentRequiredOn: ["No"] },
        { itemKey: "lucas",          label: "LUCAS",                  category: "Patient Compartment", responseType: "status",
          statuses: ["Pass", "Fail", "N/A"], commentRequiredOn: ["Fail"] },
        { itemKey: "stretcher",      label: "Stretcher operational",  category: "Patient Compartment", responseType: "status",
          statuses: ["Yes", "No", "Issue"], commentRequiredOn: ["No", "Issue"] },
        { itemKey: "stretcher_battery", label: "Stretcher battery charged", category: "Patient Compartment", responseType: "status",
          statuses: ["Yes", "No"], commentRequiredOn: ["No"] },
        { itemKey: "stair_chair",    label: "Stair chair functional", category: "Patient Compartment", responseType: "status",
          statuses: ["Yes", "No", "Issue"], commentRequiredOn: ["No", "Issue"] },
        { itemKey: "backboard",      label: "Backboard / scoop",      category: "Patient Compartment", responseType: "status",
          statuses: ["Present", "Missing", "Issue"], commentRequiredOn: ["Missing", "Issue"] },
        { itemKey: "linens",         label: "Linens stocked",         category: "Patient Compartment", responseType: "stock", amountUnit: "set" },
        { itemKey: "sharps",         label: "Sharps container",       category: "Patient Compartment", responseType: "status",
          statuses: ["OK", "Replaced", "Full", "Needs Replacement"], commentRequiredOn: ["Full", "Needs Replacement"] },
        { itemKey: "biohazard",      label: "Biohazard bag supply",   category: "Patient Compartment", responseType: "stock", amountUnit: "bags" },
        { itemKey: "trash_emptied",  label: "Trash emptied",          category: "Patient Compartment", responseType: "status",
          statuses: ["Yes", "No"], commentRequiredOn: ["No"] },
      ],
    },
    {
      category: "Medical Supplies",
      items: [
        { itemKey: "airway",        label: "Airway",        category: "Medical Supplies", responseType: "stock", amountUnit: "items" },
        { itemKey: "bls_supplies",  label: "BLS supplies",  category: "Medical Supplies", responseType: "stock", amountUnit: "items" },
        { itemKey: "als_supplies",  label: "ALS supplies",  category: "Medical Supplies", responseType: "stock", amountUnit: "items" },
        { itemKey: "iv_io",         label: "IV / IO supplies", category: "Medical Supplies", responseType: "stock", amountUnit: "items" },
        { itemKey: "trauma",        label: "Trauma supplies", category: "Medical Supplies", responseType: "stock", amountUnit: "items" },
        { itemKey: "ob_kit",        label: "OB kit",        category: "Medical Supplies", responseType: "stock", amountUnit: "items" },
        { itemKey: "pediatric",     label: "Pediatric supplies", category: "Medical Supplies", responseType: "stock", amountUnit: "items" },
        { itemKey: "burn",          label: "Burn supplies", category: "Medical Supplies", responseType: "stock", amountUnit: "items" },
        { itemKey: "infection",     label: "Infection control / PPE", category: "Medical Supplies", responseType: "stock", amountUnit: "items" },
      ],
    },
    {
      category: "Cleaning / Infection Control",
      items: [
        { itemKey: "cab_clean",          label: "Cab clean",                category: "Cleaning / Infection Control", responseType: "passfail", failComment: true },
        { itemKey: "compartment_clean", label: "Patient compartment clean", category: "Cleaning / Infection Control", responseType: "passfail", failComment: true },
        { itemKey: "stretcher_clean",   label: "Stretcher cleaned",        category: "Cleaning / Infection Control", responseType: "passfail", failComment: true },
        { itemKey: "high_touch",        label: "High-touch surfaces disinfected", category: "Cleaning / Infection Control", responseType: "passfail", failComment: true },
        { itemKey: "trash_removed",     label: "Trash removed",            category: "Cleaning / Infection Control", responseType: "passfail", failComment: true },
        { itemKey: "biohazard_disposed", label: "Biohazard disposed",      category: "Cleaning / Infection Control", responseType: "passfail", failComment: true },
        { itemKey: "ppe_restocked",     label: "Gloves / masks / gowns restocked", category: "Cleaning / Infection Control", responseType: "stock", amountUnit: "boxes" },
      ],
    },
  ];

  if (unit.hasDef) {
    cats[2].items.push({
      itemKey: "def",
      label: "DEF",
      category: "Fluids",
      responseType: "fluid",
      trendGroup: "def",
      statuses: ["Full", "Filled", "Low", "Empty", "Not Applicable", "Not Checked"],
      amountUnit: "gal",
      amountRequiredOn: ["Filled"],
      commentRequiredOn: ["Filled", "Low", "Empty"],
    });
  }

  if (unit.hasNarcotics) {
    cats.push({
      category: "Controlled Substances",
      description: "Restricted — narcotic safe + drug box + seal verification.",
      items: [
        { itemKey: "narc_safe_locked",   label: "Narcotic safe locked",   category: "Controlled Substances", responseType: "passfail", failComment: true },
        { itemKey: "narc_count_verified", label: "Narcotic count verified", category: "Controlled Substances", responseType: "status",
          statuses: ["Verified", "Discrepancy"], commentRequiredOn: ["Discrepancy"] },
        { itemKey: "drug_box_sealed",    label: "Drug box present + sealed", category: "Controlled Substances", responseType: "passfail", failComment: true },
        { itemKey: "seal_number",        label: "Seal number",            category: "Controlled Substances", responseType: "status",
          statuses: ["Match", "Mismatch", "Not Recorded"], commentRequiredOn: ["Mismatch", "Not Recorded"] },
        { itemKey: "med_expiration",     label: "Medication expiration check", category: "Controlled Substances", responseType: "status",
          statuses: ["All In Date", "Near Expiry", "Expired Found"], commentRequiredOn: ["Near Expiry", "Expired Found"] },
        { itemKey: "med_temp",           label: "Temperature-sensitive medication", category: "Controlled Substances", responseType: "status",
          statuses: ["In Range", "Out of Range", "N/A"], commentRequiredOn: ["Out of Range"] },
      ],
    });
  }

  return cats;
}

export function templateAllItems(unit: UnitSpec): ChecklistItem[] {
  return buildTemplate(unit).flatMap((c) => c.items);
}

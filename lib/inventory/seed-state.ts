/**
 * Seed state/system inspection items into the inventory database.
 * These are the SWIL + Illinois required equipment items from the
 * EMS vehicle inspection checklist.
 */

import { createCategory, createItem, clearInventoryDataByType, ensureInventorySchema } from "./db";

interface StateItem {
  id: string;
  name: string;
  par: number;
  narcotic?: boolean;
  optional?: boolean;
}

interface StateCategory {
  name: string;
  slug: string;
  section: "SWIL" | "Illinois";
  hasExpiry: boolean;
  items: StateItem[];
}

const STATE_CATEGORIES: StateCategory[] = [
  // ══════════════════════════════════════════════
  // SWIL — ALS Medications
  // ══════════════════════════════════════════════
  {
    name: "ALS Medications",
    slug: "state-als-medications",
    section: "SWIL",
    hasExpiry: true,
    items: [
      // Narcotics
      { id: "st_med_fentanyl",        name: "Fentanyl 100mcg/2ml",             par: 4, narcotic: true },
      { id: "st_med_morphine",        name: "Morphine Sulfate 10mg/ml",        par: 2, narcotic: true },
      { id: "st_med_midazolam",       name: "Midazolam (Versed) 5mg/ml",      par: 4, narcotic: true },
      { id: "st_med_ketamine",        name: "Ketamine 500mg/10ml",             par: 1, narcotic: true },
      { id: "st_med_succinylcholine", name: "Succinylcholine 200mg/10ml",      par: 1, narcotic: true },
      // Standard ALS meds
      { id: "st_med_adenosine_6",     name: "Adenosine 6mg/2ml",               par: 2 },
      { id: "st_med_adenosine_12",    name: "Adenosine 12mg/4ml",              par: 2 },
      { id: "st_med_amiodarone",      name: "Amiodarone 150mg/3ml",            par: 2 },
      { id: "st_med_aspirin",         name: "Aspirin 324mg (chewable)",         par: 4 },
      { id: "st_med_atropine",        name: "Atropine 1mg/10ml",               par: 2 },
      { id: "st_med_calcium",         name: "Calcium Chloride 1g/10ml",        par: 2 },
      { id: "st_med_dextrose",        name: "Dextrose 50% 25g/50ml",           par: 2 },
      { id: "st_med_diphenhydramine", name: "Diphenhydramine 50mg/ml",         par: 2 },
      { id: "st_med_dopamine",        name: "Dopamine 400mg/250ml",            par: 2 },
      { id: "st_med_epi_1_1000",      name: "Epinephrine 1:1,000 — 1mg/ml",   par: 4 },
      { id: "st_med_epi_1_10000",     name: "Epinephrine 1:10,000 — 1mg/10ml",par: 4 },
      { id: "st_med_furosemide",      name: "Furosemide (Lasix) 40mg/4ml",     par: 2 },
      { id: "st_med_glucagon",        name: "Glucagon 1mg Kit",                par: 1 },
      { id: "st_med_magnesium",       name: "Magnesium Sulfate 1g/2ml",        par: 2 },
      { id: "st_med_methylpred",      name: "Methylprednisolone 125mg",        par: 2 },
      { id: "st_med_naloxone",        name: "Naloxone (Narcan) 0.4mg/ml",      par: 4 },
      { id: "st_med_nitro_spray",     name: "Nitroglycerin Spray 0.4mg/spray", par: 1 },
      { id: "st_med_ns_1000",         name: "Normal Saline 1000ml Bag",        par: 4 },
      { id: "st_med_ns_250",          name: "Normal Saline 250ml Bag",         par: 2 },
      { id: "st_med_ondansetron",     name: "Ondansetron (Zofran) 4mg/2ml",    par: 4 },
      { id: "st_med_sodium_bicarb",   name: "Sodium Bicarbonate 50mEq/50ml",   par: 2 },
      { id: "st_med_saline_flush",    name: "Saline Flush 10ml",               par: 10 },
    ],
  },

  // ══════════════════════════════════════════════
  // SWIL — ALS Equipment
  // ══════════════════════════════════════════════
  {
    name: "ALS Equipment",
    slug: "state-als-equipment",
    section: "SWIL",
    hasExpiry: false,
    items: [
      { id: "st_als_monitor",        name: "Cardiac Monitor / Defibrillator (LP15/Zoll)", par: 1 },
      { id: "st_als_monitor_batt",   name: "Monitor Battery Fully Charged",              par: 1 },
      { id: "st_als_ecg_elec",       name: "12-Lead ECG Electrodes",                     par: 10 },
      { id: "st_als_defib_adult",    name: "Defibrillator Pads Adult",                   par: 2 },
      { id: "st_als_defib_peds",     name: "Defibrillator Pads Pediatric",               par: 1 },
      { id: "st_als_etco2",          name: "EtCO2 Sensor / Nasal Cannula",               par: 2 },
      { id: "st_als_io_drill",       name: "IO Drill (EZ-IO)",                           par: 1 },
      { id: "st_als_io_15mm",        name: "IO Needle 15mm Pink",                        par: 2 },
      { id: "st_als_io_25mm",        name: "IO Needle 25mm Blue",                        par: 2 },
      { id: "st_als_io_45mm",        name: "IO Needle 45mm Yellow",                      par: 1 },
      { id: "st_als_iv_14g",         name: "IV Catheter 14g",                            par: 4 },
      { id: "st_als_iv_16g",         name: "IV Catheter 16g",                            par: 4 },
      { id: "st_als_iv_18g",         name: "IV Catheter 18g",                            par: 6 },
      { id: "st_als_iv_20g",         name: "IV Catheter 20g",                            par: 6 },
      { id: "st_als_iv_22g",         name: "IV Catheter 22g",                            par: 4 },
      { id: "st_als_iv_ext",         name: "IV Extension Set",                           par: 4 },
      { id: "st_als_iv_macro",       name: "IV Tubing Macro Drip",                       par: 4 },
      { id: "st_als_iv_micro",       name: "IV Tubing Micro Drip",                       par: 2 },
      { id: "st_als_laryngoscope",   name: "Laryngoscope Handle",                        par: 1 },
      { id: "st_als_blade_mac3",     name: "Mac Blade #3",                               par: 1 },
      { id: "st_als_blade_mac4",     name: "Mac Blade #4",                               par: 1 },
      { id: "st_als_blade_mil1",     name: "Miller Blade #1",                            par: 1 },
      { id: "st_als_blade_mil2",     name: "Miller Blade #2",                            par: 1 },
      { id: "st_als_ett_70",         name: "ETT 7.0 Cuffed",                             par: 2 },
      { id: "st_als_ett_75",         name: "ETT 7.5 Cuffed",                             par: 2 },
      { id: "st_als_ett_80",         name: "ETT 8.0 Cuffed",                             par: 2 },
      { id: "st_als_stylet",         name: "ETT Stylet",                                 par: 2 },
      { id: "st_als_king_3",         name: "King LT Airway Size 3",                      par: 1 },
      { id: "st_als_king_4",         name: "King LT Airway Size 4",                      par: 1 },
      { id: "st_als_king_5",         name: "King LT Airway Size 5",                      par: 1 },
      { id: "st_als_tube_holder",    name: "Endotracheal Tube Holder",                   par: 2 },
      { id: "st_als_spo2",           name: "SpO2 Sensor / Probe",                        par: 1 },
      { id: "st_als_tourniquet",     name: "Tourniquet (CAT / SOFT-T)",                  par: 4 },
      { id: "st_als_needle_decomp",  name: "Needle Decompression 14g × 3.25\"",          par: 2 },
      { id: "st_als_chest_seal",     name: "Chest Seal Vented",                          par: 2 },
      { id: "st_als_hemostatic",     name: "Hemostatic Gauze (QuikClot)",                par: 2 },
      { id: "st_als_video_laryngo",  name: "Video Laryngoscope",                         par: 1, optional: true },
    ],
  },

  // ══════════════════════════════════════════════
  // Illinois — Patient Transport Equipment
  // ══════════════════════════════════════════════
  {
    name: "Patient Transport",
    slug: "state-patient-transport",
    section: "Illinois",
    hasExpiry: false,
    items: [
      { id: "st_pt_stretcher",   name: "Stretcher / Cot",                par: 1 },
      { id: "st_pt_straps",      name: "Stretcher Straps (min. 3)",      par: 3 },
      { id: "st_pt_stair_chair", name: "Stair Chair",                    par: 1 },
      { id: "st_pt_scoop",       name: "Scoop / Orthopedic Stretcher",   par: 1, optional: true },
      { id: "st_pt_blankets",    name: "Blankets",                       par: 2 },
      { id: "st_pt_sheets",      name: "Sheets",                         par: 2 },
      { id: "st_pt_pillows",     name: "Pillows",                        par: 2 },
    ],
  },

  // ══════════════════════════════════════════════
  // Illinois — Oxygen Equipment
  // ══════════════════════════════════════════════
  {
    name: "Oxygen Equipment",
    slug: "state-oxygen-equipment",
    section: "Illinois",
    hasExpiry: false,
    items: [
      { id: "st_o2_main_tank",     name: "On-Board O2 Tank",                par: 1 },
      { id: "st_o2_portable_tank", name: "Portable O2 Tank",                par: 1 },
      { id: "st_o2_reg_main",      name: "O2 Regulator (main)",             par: 1 },
      { id: "st_o2_reg_portable",  name: "O2 Regulator (portable)",         par: 1 },
      { id: "st_o2_nrb_adult",     name: "Non-Rebreather Mask Adult",       par: 2 },
      { id: "st_o2_nrb_peds",      name: "Non-Rebreather Mask Pediatric",   par: 2 },
      { id: "st_o2_nc_adult",      name: "Nasal Cannula Adult",             par: 4 },
      { id: "st_o2_nc_peds",       name: "Nasal Cannula Pediatric",         par: 2 },
      { id: "st_o2_simple_mask",   name: "Simple Face Mask",                par: 2 },
      { id: "st_o2_venturi",       name: "Venturi Mask",                    par: 1, optional: true },
    ],
  },

  // ══════════════════════════════════════════════
  // Illinois — Airway & Suction
  // ══════════════════════════════════════════════
  {
    name: "Airway & Suction",
    slug: "state-airway-suction",
    section: "Illinois",
    hasExpiry: false,
    items: [
      { id: "st_aw_suction_unit",   name: "Powered Suction Unit",           par: 1 },
      { id: "st_aw_suction_tubing", name: "Suction Tubing",                 par: 2 },
      { id: "st_aw_yankauer",       name: "Yankauer Suction Catheter",      par: 2 },
      { id: "st_aw_opa_sm",         name: "OPA Size Small (60–70mm)",       par: 1 },
      { id: "st_aw_opa_md",         name: "OPA Size Medium (80–90mm)",      par: 1 },
      { id: "st_aw_opa_lg",         name: "OPA Size Large (100mm)",         par: 1 },
      { id: "st_aw_npa_26",         name: "NPA 26fr + Lube",                par: 1 },
      { id: "st_aw_npa_28",         name: "NPA 28fr + Lube",                par: 1 },
      { id: "st_aw_npa_30",         name: "NPA 30fr + Lube",                par: 1 },
      { id: "st_aw_npa_32",         name: "NPA 32fr + Lube",                par: 1 },
      { id: "st_aw_bvm_adult",      name: "BVM Resuscitator Adult",         par: 1 },
      { id: "st_aw_bvm_peds",       name: "BVM Resuscitator Pediatric",     par: 1 },
      { id: "st_aw_bvm_infant",     name: "BVM Resuscitator Infant",        par: 1 },
    ],
  },

  // ══════════════════════════════════════════════
  // Illinois — Resuscitation Equipment
  // ══════════════════════════════════════════════
  {
    name: "Resuscitation",
    slug: "state-resuscitation",
    section: "Illinois",
    hasExpiry: false,
    items: [
      { id: "st_res_aed",       name: "AED / Defibrillator",               par: 1 },
      { id: "st_res_aed_adult", name: "AED Pads Adult",                    par: 2 },
      { id: "st_res_aed_peds",  name: "AED Pads Pediatric",                par: 1 },
      { id: "st_res_cpr_board", name: "CPR Board / Hard Surface",          par: 1 },
      { id: "st_res_lucas",     name: "LUCAS / Mechanical CPR Device",     par: 1, optional: true },
    ],
  },

  // ══════════════════════════════════════════════
  // Illinois — Immobilization / Extrication
  // ══════════════════════════════════════════════
  {
    name: "Immobilization",
    slug: "state-immobilization",
    section: "Illinois",
    hasExpiry: false,
    items: [
      { id: "st_imm_long_board",   name: "Long Backboard",               par: 1 },
      { id: "st_imm_ked",          name: "Short Backboard / KED",        par: 1 },
      { id: "st_imm_head_imm",     name: "Head Immobilizer Blocks",      par: 1 },
      { id: "st_imm_collar_s",     name: "Cervical Collar Small",        par: 1 },
      { id: "st_imm_collar_m",     name: "Cervical Collar Medium",       par: 1 },
      { id: "st_imm_collar_l",     name: "Cervical Collar Large",        par: 1 },
      { id: "st_imm_collar_nn",    name: "Cervical Collar No-Neck",      par: 1 },
      { id: "st_imm_traction",     name: "Traction Splint",              par: 1 },
      { id: "st_imm_sam_splints",  name: "SAM Splints (assorted)",       par: 4 },
      { id: "st_imm_triangular",   name: "Triangular Bandages",          par: 4 },
      { id: "st_imm_straps",       name: "Cravats / Padded Straps",      par: 4 },
    ],
  },

  // ══════════════════════════════════════════════
  // Illinois — Assessment Equipment
  // ══════════════════════════════════════════════
  {
    name: "Assessment",
    slug: "state-assessment",
    section: "Illinois",
    hasExpiry: false,
    items: [
      { id: "st_ax_stethoscope",    name: "Stethoscope",              par: 1 },
      { id: "st_ax_bp_regular",     name: "BP Cuff Adult Regular",    par: 1 },
      { id: "st_ax_bp_large",       name: "BP Cuff Large Adult",      par: 1 },
      { id: "st_ax_bp_peds",        name: "BP Cuff Pediatric",        par: 1 },
      { id: "st_ax_pulse_ox",       name: "Pulse Oximeter",           par: 1 },
      { id: "st_ax_glucometer",     name: "Glucometer",               par: 1 },
      { id: "st_ax_glucose_strips", name: "Glucometer Test Strips",   par: 1 },
      { id: "st_ax_thermometer",    name: "Thermometer",              par: 1 },
      { id: "st_ax_penlight",       name: "Penlight",                 par: 1 },
      { id: "st_ax_broselow",       name: "Broselow Pediatric Tape",  par: 1 },
    ],
  },

  // ══════════════════════════════════════════════
  // Illinois — Medical Supplies
  // ══════════════════════════════════════════════
  {
    name: "Medical Supplies",
    slug: "state-medical-supplies",
    section: "Illinois",
    hasExpiry: false,
    items: [
      { id: "st_sup_gauze_4x4",     name: "Gauze Pads 4×4 (pkg)",             par: 10 },
      { id: "st_sup_gauze_roll",     name: "Gauze Roll 4\" (Kerlix)",          par: 6 },
      { id: "st_sup_trauma_dress",   name: "Trauma Dressing / Multi-Trauma",   par: 4 },
      { id: "st_sup_elastic_band",   name: "Elastic Bandage 4\"",              par: 4 },
      { id: "st_sup_abdo_pads",      name: "Abdominal Pads",                   par: 4 },
      { id: "st_sup_tape",           name: "Medical Tape 1\"",                 par: 2 },
      { id: "st_sup_scissors",       name: "Trauma Shears",                    par: 1 },
      { id: "st_sup_alcohol",        name: "Alcohol Prep Pads",                par: 20 },
      { id: "st_sup_betadine",       name: "Betadine Swabs",                   par: 10 },
      { id: "st_sup_lancets",        name: "Lancets",                          par: 10 },
      { id: "st_sup_oral_glucose",   name: "Oral Glucose Gel",                 par: 2 },
      { id: "st_sup_ob_kit",         name: "OB Delivery Kit",                  par: 1 },
      { id: "st_sup_burn_sheet",     name: "Burn Sheet",                       par: 1 },
      { id: "st_sup_cold_packs",     name: "Cold Packs",                       par: 4 },
      { id: "st_sup_emesis_bag",     name: "Emesis Bags",                      par: 4 },
      { id: "st_sup_epipen_adult",   name: "Epi-Pen Adult",                    par: 2, optional: true },
      { id: "st_sup_epipen_jr",      name: "Epi-Pen Jr Pediatric",             par: 1, optional: true },
    ],
  },

  // ══════════════════════════════════════════════
  // Illinois — PPE
  // ══════════════════════════════════════════════
  {
    name: "PPE",
    slug: "state-ppe",
    section: "Illinois",
    hasExpiry: false,
    items: [
      { id: "st_ppe_gloves_s",       name: "Gloves Small (box)",                par: 1 },
      { id: "st_ppe_gloves_m",       name: "Gloves Medium (box)",               par: 2 },
      { id: "st_ppe_gloves_l",       name: "Gloves Large (box)",                par: 2 },
      { id: "st_ppe_gloves_xl",      name: "Gloves XL (box)",                   par: 1 },
      { id: "st_ppe_n95",            name: "N95 Respirator Masks",              par: 4 },
      { id: "st_ppe_surgical_mask",  name: "Surgical / Procedure Masks",        par: 10 },
      { id: "st_ppe_safety_glasses", name: "Safety Glasses / Goggles",          par: 2 },
      { id: "st_ppe_face_shield",    name: "Face Shield",                       par: 2 },
      { id: "st_ppe_gown",           name: "Isolation Gown / Tyvek Suit",       par: 2 },
    ],
  },

  // ══════════════════════════════════════════════
  // Illinois — Linens
  // ══════════════════════════════════════════════
  {
    name: "Linens",
    slug: "state-linens",
    section: "Illinois",
    hasExpiry: false,
    items: [
      { id: "st_lin_sheets",       name: "Sheets",       par: 4 },
      { id: "st_lin_blankets",     name: "Blankets",     par: 2 },
      { id: "st_lin_pillow_cases", name: "Pillow Cases", par: 2 },
    ],
  },

  // ══════════════════════════════════════════════
  // Illinois — Communication
  // ══════════════════════════════════════════════
  {
    name: "Communication",
    slug: "state-communication",
    section: "Illinois",
    hasExpiry: false,
    items: [
      { id: "st_com_radio_base", name: "Vehicle Radio (Base)",              par: 1 },
      { id: "st_com_radio_port", name: "Portable Radio",                   par: 2 },
      { id: "st_com_paging",     name: "Paging System Functional",         par: 1 },
      { id: "st_com_cell",       name: "Cell Phone / Tablet (Charging)",   par: 1, optional: true },
    ],
  },

  // ══════════════════════════════════════════════
  // Illinois — Vehicle Safety
  // ══════════════════════════════════════════════
  {
    name: "Vehicle Safety",
    slug: "state-vehicle-safety",
    section: "Illinois",
    hasExpiry: false,
    items: [
      { id: "st_veh_flares",       name: "Road Flares / Warning Triangles", par: 3 },
      { id: "st_veh_fire_ext",     name: "Fire Extinguisher (charged)",     par: 1 },
      { id: "st_veh_first_aid",    name: "Crew First Aid Kit",              par: 1 },
      { id: "st_veh_ref_vests",    name: "Reflective Safety Vests",         par: 2 },
      { id: "st_veh_biohazard",    name: "Biohazard Disposal Bags",         par: 4 },
      { id: "st_veh_sharps",       name: "Sharps Container",                par: 1 },
      { id: "st_veh_chocks",       name: "Wheel Chocks",                    par: 2 },
      { id: "st_veh_jump_cables",  name: "Jumper Cables",                   par: 1, optional: true },
    ],
  },
];

/**
 * Seed state/system inspection items into the database.
 * Clears existing state items first (does NOT touch backstock).
 */
export async function seedStateItems(): Promise<{ categories: number; items: number }> {
  await ensureInventorySchema();
  await clearInventoryDataByType("state");

  let totalItems = 0;

  for (let si = 0; si < STATE_CATEGORIES.length; si++) {
    const cat = STATE_CATEGORIES[si];

    const category = await createCategory({
      name: cat.name,
      slug: cat.slug,
      sortOrder: si,
      hasExpiry: cat.hasExpiry,
      inventoryType: "state",
    });

    for (let ii = 0; ii < cat.items.length; ii++) {
      const item = cat.items[ii];
      await createItem({
        categoryId: category.id,
        name: item.name,
        location: cat.section, // SWIL or Illinois as location grouping
        par: item.par,
        currentStock: 0,
        sortOrder: ii,
      });
      totalItems++;
    }
  }

  return { categories: STATE_CATEGORIES.length, items: totalItems };
}

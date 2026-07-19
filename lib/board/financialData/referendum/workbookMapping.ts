export type WorkbookFieldAccess = "read-only" | "editable";

export interface WorkbookFieldMap {
  portalField: string;
  worksheet: string;
  cellOrRange: string;
  dataType: "currency" | "percent" | "number" | "text";
  access: WorkbookFieldAccess;
  rolesAllowedToEdit: string[];
  validation: string;
}

export const REFERENDUM_WORKBOOK_IDENTITY = {
  fileName: "Millstadt_EMS_Referendum_Financial_Model (1).xlsx",
  owner: "Kenneth.james@millstadtems.org",
  status: "Configuration Required",
} as const;

export const REFERENDUM_WORKBOOK_FIELD_MAP: WorkbookFieldMap[] = [
  {
    portalField: "Equalized Assessed Value (EAV)",
    worksheet: "Levy Calculator",
    cellOrRange: "B5",
    dataType: "currency",
    access: "editable",
    rolesAllowedToEdit: ["admin"],
    validation: "Positive number greater than zero.",
  },
  {
    portalField: "Selected Levy Rate",
    worksheet: "Levy Calculator",
    cellOrRange: "B6",
    dataType: "percent",
    access: "editable",
    rolesAllowedToEdit: ["admin"],
    validation: "Decimal workbook rate such as 0.004 for 0.40%.",
  },
  {
    portalField: "Collection Factor",
    worksheet: "Levy Calculator",
    cellOrRange: "B7",
    dataType: "number",
    access: "editable",
    rolesAllowedToEdit: ["admin"],
    validation: "Positive collection factor; workbook currently uses 1.0.",
  },
  {
    portalField: "Projected Levy Revenue",
    worksheet: "Levy Calculator",
    cellOrRange: "E5",
    dataType: "currency",
    access: "read-only",
    rolesAllowedToEdit: [],
    validation: "Formula cell. Do not write from portal.",
  },
  {
    portalField: "Total Projected Revenue",
    worksheet: "Levy Calculator",
    cellOrRange: "E10",
    dataType: "currency",
    access: "read-only",
    rolesAllowedToEdit: [],
    validation: "Formula cell. Do not write from portal.",
  },
  {
    portalField: "Total Projected Annual Need",
    worksheet: "Levy Calculator",
    cellOrRange: "E11",
    dataType: "currency",
    access: "read-only",
    rolesAllowedToEdit: [],
    validation: "Formula cell tied to Referendum Overview!F10.",
  },
  {
    portalField: "Projected Funding Margin/(Gap)",
    worksheet: "Levy Calculator",
    cellOrRange: "E12",
    dataType: "currency",
    access: "read-only",
    rolesAllowedToEdit: [],
    validation: "Formula cell. Do not write from portal.",
  },
  {
    portalField: "Break-Even Levy Rate",
    worksheet: "Levy Calculator",
    cellOrRange: "E13",
    dataType: "percent",
    access: "read-only",
    rolesAllowedToEdit: [],
    validation: "Formula cell. Do not write from portal.",
  },
  {
    portalField: "Projected Personnel Cost",
    worksheet: "Referendum Overview",
    cellOrRange: "F5",
    dataType: "currency",
    access: "read-only",
    rolesAllowedToEdit: [],
    validation: "Formula from Proposed Staffing.",
  },
  {
    portalField: "Projected Operating Needs",
    worksheet: "Referendum Overview",
    cellOrRange: "F6",
    dataType: "currency",
    access: "read-only",
    rolesAllowedToEdit: [],
    validation: "Formula from Operating Needs.",
  },
  {
    portalField: "Annual Debt Service",
    worksheet: "Referendum Overview",
    cellOrRange: "F7",
    dataType: "currency",
    access: "read-only",
    rolesAllowedToEdit: [],
    validation: "Formula from Debt & Liabilities.",
  },
  {
    portalField: "Annual Payable Catch-Up",
    worksheet: "Referendum Overview",
    cellOrRange: "F8",
    dataType: "currency",
    access: "read-only",
    rolesAllowedToEdit: [],
    validation: "Formula from Debt & Liabilities.",
  },
  {
    portalField: "Capital Replacement Reserves",
    worksheet: "Referendum Overview",
    cellOrRange: "F9",
    dataType: "currency",
    access: "read-only",
    rolesAllowedToEdit: [],
    validation: "Formula from Capital Reserves.",
  },
];

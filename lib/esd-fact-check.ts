import { calculateEmsTax } from "./esd-tax";

// County record read October 2, 2026. Keep the tax year visible wherever used.
// Publish only the address, parcel, and aggregate values needed for the calculation.
export const REVIEWED_PARCEL = {
  address: "305 Traver Tine Circle, Millstadt",
  parcel: "12-10.0-414-002",
  taxYear: 2025,
  payableYear: 2026,
  eav: 118899,
  exemptions: 13000, // County granted amounts: $6,000 + $5,000 + $2,000.
  taxableValue: 105899,
  totalBill: 7583.86,
  source: "https://stclairil.devnetwedge.com/parcel/view/12100414002/2025",
} as const;

export const PARCEL_COMPARISON = calculateEmsTax({
  area: "millstadt", mode: "bill", taxableValue: String(REVIEWED_PARCEL.taxableValue),
});

// Exact for this whole-dollar county value: 50 hundredths of a percent,
// converted to cents before rounding. This is an illustration, not a planned levy.
const halfPercentCents = Math.round(REVIEWED_PARCEL.taxableValue * 50 / 100);
export const ILLUSTRATIVE_HALF_PERCENT = {
  annual: halfPercentCents / 100,
  increase: (halfPercentCents - Math.round(PARCEL_COMPARISON.before * 100)) / 100,
};

// The pro forma already includes 0.30% tax revenue. These are NOT current-rate losses.
export const PLANNED_BUDGET = {
  taxRevenue: 1031072.11,
  totalRevenue: 1258346.44,
  serviceCosts: 1394750.83,
  replacementSavings: 262571.43,
  totalBudget: 1657322.26,
  operatingGap: (139475083 - 125834644) / 100,
  fullGap: (165732226 - 125834644) / 100,
  source: "/financial-transparency/budgets/millstadt-ems-annual-budget-pro-forma.pdf",
} as const;

// Public source documents checked against the live website on October 2, 2026.
// Money-market figures describe one account, not all cash or an estimated runway.
export const FINANCIAL_RECORDS = {
  moneyMarketStart: 201826.25,
  moneyMarketEnd: 14338.08,
  moneyMarketDecrease: (20182625 - 1433808) / 100,
  pastDue: 66330.66,
  auditRevenue: 974719,
  auditExpenses: 876668,
  auditNetAssetIncrease: 98051,
  auditCash: 141516,
  moneyMarketSource: "/financial-transparency/bank-statements/money-market-account-2023-01-31-to-2026-08-31.pdf",
  auditSource: "/financial-transparency/audits/annual-audit-fy-2024-2025.pdf",
} as const;

export const ESD_REVIEW_SOURCES = {
  countyRates: "https://www.co.st-clair.il.us/webdocuments/departments/countyclerk/taxextensions/2025%20Tax%20Computation%20Reports.pdf#page=57",
  districtAct: "https://www.ilga.gov/Legislation/ILCS/Articles?ActID=959&Chapter=SPECIAL+DISTRICTS&ChapterID=15&MajorTopic=GOVERNMENT",
  imrf: "https://www.ilga.gov/legislation/ilcs/fulltext?DocName=004000050K7-171",
  socialSecurity: "https://www.ilga.gov/legislation/ILCS/details?ActID=638&ActName=Illinois+Pension+Code.&ChapAct=40+ILCS+5%2F&Chapter=PENSIONS&ChapterID=9&MajorTopic=GOVERNMENT&Print=True&SeqEnd=232300000&SeqStart=227900000",
  liability: "https://www.ilga.gov/legislation/ilcs/fulltext?DocName=074500100K9-107",
  fireDistrictAct: "https://ilga.gov/Documents/legislation/ilcs/documents/007007050K22.htm",
  serviceRequirements: "https://www.ilga.gov/commission/jcar/admincode/077/077005150F08100R.html",
  imrfManual: "https://www.imrf.org/AAmanual/online_AA_Manual/4.15.htm",
  essentialServiceBill: "https://ilga.gov/Legislation/BillStatus?DocNum=5133&DocTypeID=HB&GAID=18&LegId=166724&Print=1&SessionID=114",
} as const;

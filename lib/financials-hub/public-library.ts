import { TAX_COMPUTATION_DATA, type TaxComputationData } from "./tax-computation-data";

export type PublicLibraryDocument = {
  id: string;
  kind: "form_990" | "irs_record" | "tax_computation" | "management_pay" | "official_record" | "annual_audit";
  title: string;
  category: string;
  periodLabel: string;
  dateLabel: string;
  pageCount?: number;
  sourceLabel?: string;
  note?: string;
  sortOrder: number;
  filingYear?: number;
  statusLabel: "Filed" | "Official record" | "County record" | "Approved public report";
  employee?: "Kenneth James" | "Jennifer Goetz";
  attachmentOf?: string;
  taxData?: TaxComputationData;
  searchText: string;
  viewUrl: string;
  downloadUrl: string;
  printUrl: string;
};

type Form990Source = {
  fiscalYearEnding: number;
  pageCount: number;
};

const FORM_990_SOURCES: Form990Source[] = [
  { fiscalYearEnding: 2025, pageCount: 30 },
  { fiscalYearEnding: 2024, pageCount: 31 },
  { fiscalYearEnding: 2023, pageCount: 33 },
  { fiscalYearEnding: 2022, pageCount: 34 },
  { fiscalYearEnding: 2021, pageCount: 28 },
  { fiscalYearEnding: 2020, pageCount: 30 },
  { fiscalYearEnding: 2019, pageCount: 30 },
  { fiscalYearEnding: 2017, pageCount: 30 },
  { fiscalYearEnding: 2016, pageCount: 31 },
  { fiscalYearEnding: 2015, pageCount: 31 },
  { fiscalYearEnding: 2014, pageCount: 28 },
  { fiscalYearEnding: 2013, pageCount: 31 },
  { fiscalYearEnding: 2012, pageCount: 30 },
  { fiscalYearEnding: 2011, pageCount: 28 },
  { fiscalYearEnding: 2010, pageCount: 30 },
  { fiscalYearEnding: 2009, pageCount: 30 },
  { fiscalYearEnding: 2008, pageCount: 24 },
  { fiscalYearEnding: 2007, pageCount: 24 },
  { fiscalYearEnding: 2006, pageCount: 22 },
  { fiscalYearEnding: 2005, pageCount: 17 },
  { fiscalYearEnding: 2004, pageCount: 15 },
  { fiscalYearEnding: 2003, pageCount: 15 },
  { fiscalYearEnding: 2002, pageCount: 15 },
];

type TaxComputationSource = {
  taxYear: number;
  millstadtPage: number;
  url: string;
};

const TAX_COMPUTATION_SOURCES: TaxComputationSource[] = [
  { taxYear: 2025, millstadtPage: 57, url: "https://www.stclaircountyil.gov/webdocuments/departments/countyclerk/taxextensions/2025%20Tax%20Computation%20Reports.pdf" },
  { taxYear: 2024, millstadtPage: 55, url: "https://www.stclaircountyil.gov/webdocuments/departments/countyclerk/taxextensions/2024%20Tax%20Computation%20Reports.pdf" },
  { taxYear: 2023, millstadtPage: 55, url: "https://www.stclaircountyil.gov/webdocuments/departments/countyclerk/taxextensions/2023%20Tax%20Computation%20Reports.pdf" },
  { taxYear: 2022, millstadtPage: 55, url: "https://www.stclaircountyil.gov/webdocuments/departments/countyclerk/taxextensions/2022%20Tax%20Computation%20Reports.pdf" },
  { taxYear: 2021, millstadtPage: 55, url: "https://www.stclaircountyil.gov/webdocuments/departments/countyclerk/taxextensions/2021%20Tax%20Computation%20report.pdf" },
  { taxYear: 2020, millstadtPage: 55, url: "https://www.stclaircountyil.gov/webdocuments/departments/countyclerk/taxextensions/2020%20Tax%20Computation%20Report.pdf" },
  { taxYear: 2019, millstadtPage: 55, url: "https://www.stclaircountyil.gov/webdocuments/departments/countyclerk/taxextensions/TaxComputationReport2019taxyear.pdf" },
  { taxYear: 2018, millstadtPage: 55, url: "https://www.stclaircountyil.gov/webdocuments/departments/countyclerk/taxextensions/2018TaxComputationReport.pdf" },
  { taxYear: 2017, millstadtPage: 55, url: "https://www.stclaircountyil.gov/webdocuments/departments/countyclerk/taxextensions/2017TaxComputationReport.pdf" },
  { taxYear: 2016, millstadtPage: 54, url: "https://www.stclaircountyil.gov/webdocuments/departments/countyclerk/taxextensions/TaxComputationReport2016.pdf" },
  { taxYear: 2015, millstadtPage: 55, url: "https://www.stclaircountyil.gov/webdocuments/departments/countyclerk/taxextensions/TaxComputationReport2015.pdf" },
  { taxYear: 2014, millstadtPage: 55, url: "https://www.stclaircountyil.gov/webdocuments/departments/countyclerk/taxextensions/2014%20Tax%20Computation%20Report.pdf" },
  { taxYear: 2013, millstadtPage: 55, url: "https://www.stclaircountyil.gov/webdocuments/departments/countyclerk/taxextensions/2013%20Tax%20Computation%20Report.pdf" },
  { taxYear: 2012, millstadtPage: 55, url: "https://www.stclaircountyil.gov/webdocuments/departments/countyclerk/taxextensions/2012%20Tax%20Computation%20Report.pdf" },
  { taxYear: 2011, millstadtPage: 55, url: "https://www.stclaircountyil.gov/webdocuments/departments/countyclerk/taxextensions/2011%20Tax%20Computation%20Report.pdf" },
  { taxYear: 2010, millstadtPage: 56, url: "https://www.stclaircountyil.gov/webdocuments/departments/countyclerk/taxextensions/2010%20Tax%20Computation%20Report.pdf" },
  { taxYear: 2009, millstadtPage: 56, url: "https://www.stclaircountyil.gov/webdocuments/departments/countyclerk/taxextensions/2009%20Tax%20Computation%20Report.pdf" },
  { taxYear: 2008, millstadtPage: 56, url: "https://www.stclaircountyil.gov/webdocuments/departments/countyclerk/taxextensions/2008%20Tax%20Computation%20Report.pdf" },
  { taxYear: 2007, millstadtPage: 56, url: "https://www.stclaircountyil.gov/webdocuments/departments/countyclerk/taxextensions/2007%20Tax%20Computation%20Report.pdf" },
  { taxYear: 2006, millstadtPage: 56, url: "https://www.stclaircountyil.gov/webdocuments/departments/countyclerk/taxextensions/2006%20Tax%20Computation%20Report.pdf" },
  { taxYear: 2005, millstadtPage: 56, url: "https://www.stclaircountyil.gov/webdocuments/departments/countyclerk/taxextensions/2005%20Tax%20Computation%20Report.pdf" },
  { taxYear: 2004, millstadtPage: 56, url: "https://www.stclaircountyil.gov/webdocuments/departments/countyclerk/taxextensions/2004%20Tax%20Computation%20Report.pdf" },
];

export function publicFinancialDocumentLibrary(): PublicLibraryDocument[] {
  const annualAudits: PublicLibraryDocument[] = [
    { ending: 2025, pageCount: 22, reportDate: "August 24, 2026" },
    { ending: 2024, pageCount: 21, reportDate: "April 4, 2026" },
    { ending: 2023, pageCount: 20, reportDate: "March 31, 2026" },
  ].map(({ ending, pageCount, reportDate }) => {
    const id = `annual-audit-fy-${ending - 1}-${ending}`;
    const title = `Annual Audit — FY ${ending - 1}–${ending}`;
    const url = `/financial-transparency/audits/${id}.pdf`;
    return {
      id, kind: "annual_audit", title, category: "Operational",
      periodLabel: `May 1, ${ending - 1} through April 30, ${ending}`,
      dateLabel: `Auditor’s report dated ${reportDate}`, pageCount,
      sourceLabel: "Scheffel Boyle · Independent auditor’s report",
      filingYear: ending, sortOrder: ending * 10000 + 430,
      statusLabel: "Approved public report",
      searchText: `${title} Annual Audits FY ${ending - 1}-${ending} FY ${String(ending - 1).slice(-2)}-${String(ending).slice(-2)} Financial report financial statements Independent auditor Scheffel Boyle prior-year comparative figures Operational`,
      viewUrl: url, downloadUrl: url, printUrl: url,
    };
  });

  const form990s = FORM_990_SOURCES.map(({ fiscalYearEnding, pageCount }) => {
    const url = `/financial-transparency/form-990/form-990-fy-ending-${fiscalYearEnding}.pdf`;
    const title = `Form 990 - FY ending April ${fiscalYearEnding}`;
    return {
      id: `form-990-fy-ending-${fiscalYearEnding}`,
      kind: "form_990" as const,
      title,
      category: "990",
      periodLabel: `Fiscal year ending April 30, ${fiscalYearEnding}`,
      dateLabel: fiscalYearEnding === 2025 ? "Public copy · Form 990 and schedules" : "Original filed return",
      pageCount,
      sortOrder: fiscalYearEnding * 10_000 + 430,
      filingYear: fiscalYearEnding,
      statusLabel: fiscalYearEnding === 2025 ? "Official record" as const : "Filed" as const,
      searchText: `${title} IRS Form 990 Filings ${fiscalYearEnding - 1}-${fiscalYearEnding} Fiscal year ending April 30 ${fiscalYearEnding === 2025 ? "Public copy Form 990 and schedules" : "Original filed return"}`.toLowerCase(),
      viewUrl: url,
      downloadUrl: url,
      printUrl: url,
    };
  });

  const reinstatementUrl = "/financial-transparency/records/irs-reinstatement.pdf";
  const irsRecords: PublicLibraryDocument[] = [
    {
      id: "irs-reinstatement",
      kind: "irs_record",
      title: "IRS Reinstatement",
      category: "Operational",
      periodLabel: "Effective September 15, 2025",
      dateLabel: "Letter dated April 20, 2026",
      pageCount: 2,
      sortOrder: 20260420,
      filingYear: 2025,
      statusLabel: "Official record",
      searchText: "IRS reinstatement Operational Official IRS Record 501(c)(3) exemption September 15 2025 April 20 2026",
      viewUrl: reinstatementUrl,
      downloadUrl: reinstatementUrl,
      printUrl: reinstatementUrl,
    },
  ];

  const settlementSheetUrl = "/financial-transparency/settlement-sheets/fdmi-settlement-sheet-tax-year-2025.pdf";
  const settlementSheets: PublicLibraryDocument[] = [
    {
      id: "fdmi-settlement-sheet-tax-year-2025",
      kind: "official_record",
      title: "2025 FDMI Settlement Sheet - Millstadt Fire Protection District",
      category: "Operational",
      periodLabel: "Tax year 2025",
      dateLabel: "Settlement sheet generated August 4, 2026 at 10:55",
      pageCount: 1,
      sourceLabel: "St. Clair County · FDMI settlement sheet",
      note: "To see why the previous website figure appeared, see Distribution Summary (3 distributions totaling $238,525.85) and Fund Summary - rows 001 CORPORATE and 064 AMBULANCE. The distribution total combines both funds and is not the certified annual ambulance tax extension. The annual extension appears in the existing 2025 Tax Computation Report on page 57.",
      sortOrder: 20260804,
      filingYear: 2025,
      statusLabel: "County record",
      searchText: "2025 FDMI Settlement Sheet Millstadt Fire Protection District Distribution Summary 3 distributions $238,525.85 Fund Summary 001 Corporate 064 Ambulance combined funds county record tax year 2025".toLowerCase(),
      viewUrl: settlementSheetUrl,
      downloadUrl: settlementSheetUrl,
      printUrl: settlementSheetUrl,
    },
  ];

  const taxComputationReports: PublicLibraryDocument[] = TAX_COMPUTATION_SOURCES.map(
    ({ taxYear, millstadtPage, url }) => {
      const taxData = TAX_COMPUTATION_DATA.find((record) => record.year === taxYear);
      const title = `Tax Computation Report - ${taxYear}`;
      const pageUrl = `${url}#page=${millstadtPage}`;
      return {
        id: `tax-computation-${taxYear}`,
        kind: "tax_computation",
        title,
        category: "Operational",
        periodLabel: `Tax year ${taxYear}`,
        dateLabel: `Millstadt page ${millstadtPage}`,
        sourceLabel: "St. Clair County PDF",
        pageCount: taxData?.pageCount,
        taxData,
        sortOrder: taxYear * 10_000 + 1231,
        filingYear: taxYear,
        statusLabel: "County record",
        searchText: `${title} Operational Tax year ${taxYear} Millstadt page ${millstadtPage} St. Clair County Tax Computation Reports Rate Setting EAV Certified Ambulance Rate Ambulance Extension After TIF & EZ ${taxData ? Object.values(taxData).join(" ") : "Verification pending"}`.toLowerCase(),
        viewUrl: pageUrl,
        downloadUrl: url,
        printUrl: pageUrl,
      };
    },
  );

  const managementReports: PublicLibraryDocument[] = [
    { employee: "Kenneth James" as const, slug: "kenneth-james", ending: 2026, pageCount: 3 },
    { employee: "Kenneth James" as const, slug: "kenneth-james", ending: 2025, pageCount: 2 },
    { employee: "Jennifer Goetz" as const, slug: "jennifer-goetz", ending: 2026, pageCount: 3 },
    { employee: "Jennifer Goetz" as const, slug: "jennifer-goetz", ending: 2025, pageCount: 3 },
  ].map(({ employee, slug, ending, pageCount }) => {
    const fiscalYear = `${ending - 1}–${ending}`;
    const id = `${slug}-fy-${ending - 1}-${ending}`;
    const url = `/financial-transparency/management/${id}.pdf`;
    const title = `${employee} FY ${ending - 1}-${ending} Hours and Compensation Report`;
    return {
      id, kind: "management_pay", employee, title, category: "Operational",
      periodLabel: `Fiscal Year ${fiscalYear}`, dateLabel: `May 1, ${ending - 1} through April 30, ${ending}`,
      pageCount, filingYear: ending, sortOrder: ending * 10000 + 430,
      statusLabel: "Approved public report", sourceLabel: "Employee Hours and Compensation Report",
      searchText: `${title} ${fiscalYear} Management Pay Transparency Employee Hours and Compensation Report Operational`,
      viewUrl: url, downloadUrl: url, printUrl: url,
    };
  });
  return [...annualAudits, ...settlementSheets, ...irsRecords, ...taxComputationReports, ...form990s, ...managementReports];
}

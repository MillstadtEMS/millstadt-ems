export type PublicLibraryDocument = {
  id: string;
  kind: "form_990" | "irs_record" | "tax_computation";
  title: string;
  category: string;
  periodLabel: string;
  dateLabel: string;
  pageCount?: number;
  sourceLabel?: string;
  sortOrder: number;
  filingYear?: number;
  statusLabel: "Filed" | "Official record" | "County record";
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
  const form990s = FORM_990_SOURCES.map(({ fiscalYearEnding, pageCount }) => {
    const url = `/financial-transparency/form-990/form-990-fy-ending-${fiscalYearEnding}.pdf`;
    const title = `Form 990 - FY ending April ${fiscalYearEnding}`;
    return {
      id: `form-990-fy-ending-${fiscalYearEnding}`,
      kind: "form_990" as const,
      title,
      category: "990",
      periodLabel: `Fiscal year ending April 30, ${fiscalYearEnding}`,
      dateLabel: "Original filed return",
      pageCount,
      sortOrder: fiscalYearEnding * 10_000 + 430,
      filingYear: fiscalYearEnding,
      statusLabel: "Filed" as const,
      searchText: `${title} Form 990 990 ${fiscalYearEnding} Fiscal year ending April 30 Original filed return`.toLowerCase(),
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
      searchText: "IRS reinstatement Operational official record 501(c)(3) exemption September 15 2025 April 20 2026",
      viewUrl: reinstatementUrl,
      downloadUrl: reinstatementUrl,
      printUrl: reinstatementUrl,
    },
  ];

  const taxComputationReports: PublicLibraryDocument[] = TAX_COMPUTATION_SOURCES.map(
    ({ taxYear, millstadtPage, url }) => {
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
        sortOrder: taxYear * 10_000 + 1231,
        filingYear: taxYear,
        statusLabel: "County record",
        searchText: `${title} Operational Tax year ${taxYear} Millstadt page ${millstadtPage} St. Clair County`.toLowerCase(),
        viewUrl: pageUrl,
        downloadUrl: url,
        printUrl: pageUrl,
      };
    },
  );

  return [...irsRecords, ...taxComputationReports, ...form990s];
}

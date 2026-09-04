export type AnnualAuditSource = {
  ending: number;
  pageCount: number;
  reportDate: string;
  auditor: string;
};

// Complete reports only. Fiscal years 1984-1985 and 2016-2017 are withheld
// because their supplied scans omit audit pages. Blank scan reverses are retained.
export const ANNUAL_AUDIT_SOURCES: readonly AnnualAuditSource[] = [
  { ending: 2025, pageCount: 22, reportDate: "August 24, 2026", auditor: "Scheffel Boyle" },
  { ending: 2024, pageCount: 21, reportDate: "April 4, 2026", auditor: "Scheffel Boyle" },
  { ending: 2023, pageCount: 20, reportDate: "March 31, 2026", auditor: "Scheffel Boyle" },
  { ending: 2019, pageCount: 38, reportDate: "October 2, 2019", auditor: "Scheffel Boyle" },
  { ending: 2018, pageCount: 38, reportDate: "September 13, 2018", auditor: "Scheffel Boyle" },
  { ending: 2016, pageCount: 42, reportDate: "September 23, 2016", auditor: "Scheffel Boyle" },
  { ending: 2015, pageCount: 24, reportDate: "September 1, 2015", auditor: "Scheffel Boyle" },
  { ending: 2014, pageCount: 22, reportDate: "September 11, 2014", auditor: "Allison Knapp & Siekmann, Ltd." },
  { ending: 2013, pageCount: 22, reportDate: "April 9, 2014", auditor: "Allison Knapp & Siekmann, Ltd." },
  { ending: 2012, pageCount: 26, reportDate: "April 30, 2013", auditor: "Allison Knapp & Siekmann, Ltd." },
  { ending: 2011, pageCount: 28, reportDate: "January 11, 2012", auditor: "Allison Knapp & Siekmann, Ltd." },
  { ending: 2009, pageCount: 26, reportDate: "January 20, 2010", auditor: "Allison Knapp & Siekmann, Ltd." },
  { ending: 2008, pageCount: 28, reportDate: "December 4, 2008", auditor: "Allison Knapp & Siekmann, Ltd." },
  { ending: 2007, pageCount: 26, reportDate: "November 27, 2007", auditor: "Allison Knapp & Siekmann, Ltd." },
  { ending: 2006, pageCount: 26, reportDate: "August 16, 2006", auditor: "Allison Knapp & Siekmann, Ltd." },
  { ending: 2002, pageCount: 28, reportDate: "July 3, 2002", auditor: "Allison Knapp & Siekmann, Ltd." },
  { ending: 2001, pageCount: 26, reportDate: "June 7, 2001", auditor: "Allison Knapp & Siekmann, Ltd." },
  { ending: 2000, pageCount: 26, reportDate: "July 6, 2000", auditor: "Allison Knapp & Siekmann, Ltd." },
  { ending: 1999, pageCount: 27, reportDate: "July 22, 1999", auditor: "Allison Knapp & Siekmann, Ltd." },
  { ending: 1998, pageCount: 22, reportDate: "June 9, 1998", auditor: "Allison Knapp & Siekmann, Ltd." },
  { ending: 1997, pageCount: 22, reportDate: "June 5, 1997", auditor: "Allison Knapp & Siekmann, Ltd." },
  { ending: 1996, pageCount: 22, reportDate: "June 18, 1996", auditor: "Allison Knapp & Siekmann, Ltd." },
  { ending: 1995, pageCount: 22, reportDate: "June 1, 1995", auditor: "Allison Knapp & Siekmann, Ltd." },
  { ending: 1994, pageCount: 22, reportDate: "August 25, 1994", auditor: "Allison Knapp & Siekmann, Ltd." },
  { ending: 1993, pageCount: 20, reportDate: "August 30, 1993", auditor: "Allison Knapp & Siekmann, Ltd." },
  { ending: 1992, pageCount: 22, reportDate: "June 24, 1992", auditor: "Allison Knapp & Siekmann, Ltd." },
  { ending: 1991, pageCount: 26, reportDate: "May 22, 1991", auditor: "Allison Knapp & Siekmann, Ltd." },
  { ending: 1990, pageCount: 24, reportDate: "May 23, 1990", auditor: "Allison Knapp & Siekmann" },
  { ending: 1989, pageCount: 18, reportDate: "July 26, 1989", auditor: "Allison Knapp & Siekmann" },
  { ending: 1988, pageCount: 10, reportDate: "May 19, 1988", auditor: "Allison Knapp & Siekmann" },
  { ending: 1987, pageCount: 10, reportDate: "July 6, 1987", auditor: "Allison Knapp & Siekmann" },
  { ending: 1986, pageCount: 12, reportDate: "May 20, 1986", auditor: "Bert H. Allison and Company" },
  { ending: 1984, pageCount: 12, reportDate: "May 24, 1984", auditor: "Bert H. Allison and Company" },
  { ending: 1982, pageCount: 7, reportDate: "June 1, 1982", auditor: "Bert H. Allison and Company" },
];

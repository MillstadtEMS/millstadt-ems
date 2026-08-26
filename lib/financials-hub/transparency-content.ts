import type { PublicLibraryDocument } from "./public-library";

export const VOTER_RESOURCES_URL = "https://www.co.st-clair.il.us/departments/county-clerk/elections/voter-resources";
export const FACEBOOK_URL = "https://www.facebook.com/MillstadtEMS/";
export const REPORT_EMAIL = "webdev@millstadtems.org";
export const PUBLIC_PAGE_URL = "https://www.millstadtems.org/financials-information-hub";
export const PENDING_TITLE = "Fiscal Year 2025–2026";
export const PENDING_COPY = "The Fiscal Year 2025–2026 Form 990 is not currently available because it has not yet been received from the CPA. It will be posted here when received.";
export const PENDING_SEARCH = `${PENDING_TITLE} IRS Form 990 Filings Pending from CPA Currently Unavailable ${PENDING_COPY} Management Pay Transparency Available Kenneth James Jennifer Goetz`;
export const BILLING_ROWS = [
  { year: "2022–2023", revenue: "$296,850.31", runs: "536", transfers: "4", nonTransfer: "532" },
  { year: "2023–2024", revenue: "$356,491.15", runs: "728", transfers: "225", nonTransfer: "503" },
  { year: "2024–2025", revenue: "$598,688.61", runs: "1,264", transfers: "745", nonTransfer: "519" },
] as const;
export const BILLING_EXPLANATION = "Calculated non-transfer billable runs equal total billable runs minus interfacility transfers.";
export const MEDICLAIMS_CLOSE = {
  title: "Mediclaims Close — FY 2024–2025",
  period: "May 1, 2024 through April 30, 2025",
  rows: [
    { item: "Charges", amount: "$1,717,157.16" },
    { item: "Receipts", amount: "$605,031.67" },
    { item: "Adjustments", amount: "$1,003,290.49" },
    { item: "Net accounts receivable", amount: "$108,835.00" },
    { item: "Total accounts receivable", amount: "$440,106.33" },
    { item: "Medicare adjustments", amount: "$814,149.35" },
    { item: "Medicaid write-offs", amount: "$72,974.64" },
    { item: "Uncollectible accounts", amount: "$10,945.76" },
    { item: "Write-offs due to death", amount: "$3,372.85" },
    { item: "VA adjustments", amount: "$5,450.66" },
    { item: "Hardship/bankruptcy", amount: "$0.00" },
  ],
} as const;
export const MEDICLAIMS_CLOSE_SECTION = {
  id: "mediclaims-close",
  title: MEDICLAIMS_CLOSE.title,
  text: `${MEDICLAIMS_CLOSE.period} · ${MEDICLAIMS_CLOSE.rows.map(row => `${row.item} ${row.amount}`).join(" · ")}`,
};
export const BILLING_HISTORY_SECTION = {
  id: "billing-history",
  title: "Fiscal-Year Billing Activity — FY 2022–2025",
  text: `${BILLING_EXPLANATION} ${BILLING_ROWS.map(row => Object.values(row).join(" ")).join(" ")}`,
};

export const TRIP_CATEGORIES = [
  { key: "emergency", label: "Emergency" },
  { key: "nonEmergency", label: "Non-emergency" },
  { key: "treatment", label: "Treatment / no transport" },
] as const;
type TripCategory = typeof TRIP_CATEGORIES[number]["key"];
type TripFigures = { trips: number | null; revenue: number | null };
export type BillingMonth = Record<TripCategory, TripFigures> & {
  month: string; label: string; totalTrips: number; totalRevenue: number; nonBillable: number | null;
};
export type BillingReport = {
  id: string; title: string; period: string; partial: boolean;
  categories: Record<TripCategory, TripFigures>;
  totalTrips: number; totalRevenue: number; nonBillable: number;
  months: BillingMonth[];
};

// Transcribed once from the supplied EMS|MC summaries. Null means the source
// cell/row is not listed; it must not be presented as a reported zero.
export const BILLING_REPORTS: BillingReport[] = [
  {
    id: "billing-fy-2025-2026", title: "EMS|MC Billing — FY 2025–2026",
    period: "May 1, 2025 through April 30, 2026", partial: false,
    categories: { emergency: { trips: 577, revenue: 349125.65 }, nonEmergency: { trips: 812, revenue: 304416.76 }, treatment: { trips: 25, revenue: 4478.84 } },
    totalTrips: 1414, totalRevenue: 658021.25, nonBillable: 66,
    months: [
      { month: "2025-05", label: "May 2025", emergency: { trips: 38, revenue: 22591.62 }, nonEmergency: { trips: 45, revenue: 13441.33 }, treatment: { trips: 1, revenue: 112.50 }, totalTrips: 84, totalRevenue: 36145.45, nonBillable: null },
      { month: "2025-06", label: "June 2025", emergency: { trips: 53, revenue: 32905.89 }, nonEmergency: { trips: 65, revenue: 21445.09 }, treatment: { trips: 3, revenue: 0 }, totalTrips: 121, totalRevenue: 54350.98, nonBillable: 5 },
      { month: "2025-07", label: "July 2025", emergency: { trips: 57, revenue: 37223.33 }, nonEmergency: { trips: 110, revenue: 40808.61 }, treatment: { trips: 3, revenue: 1066.34 }, totalTrips: 170, totalRevenue: 79098.28, nonBillable: 6 },
      { month: "2025-08", label: "August 2025", emergency: { trips: 33, revenue: 22871.39 }, nonEmergency: { trips: 86, revenue: 33591.53 }, treatment: { trips: null, revenue: null }, totalTrips: 119, totalRevenue: 56462.92, nonBillable: 3 },
      { month: "2025-09", label: "September 2025", emergency: { trips: 48, revenue: 29939.61 }, nonEmergency: { trips: 87, revenue: 26882.58 }, treatment: { trips: 2, revenue: 0 }, totalTrips: 137, totalRevenue: 56822.19, nonBillable: 4 },
      { month: "2025-10", label: "October 2025", emergency: { trips: 56, revenue: 36170.50 }, nonEmergency: { trips: 87, revenue: 35515.42 }, treatment: { trips: 4, revenue: 250 }, totalTrips: 147, totalRevenue: 71935.92, nonBillable: 8 },
      { month: "2025-11", label: "November 2025", emergency: { trips: 40, revenue: 23759.27 }, nonEmergency: { trips: 73, revenue: 38280.70 }, treatment: { trips: 2, revenue: 0 }, totalTrips: 115, totalRevenue: 62039.97, nonBillable: 4 },
      { month: "2025-12", label: "December 2025", emergency: { trips: 56, revenue: 34389.72 }, nonEmergency: { trips: 94, revenue: 37398.54 }, treatment: { trips: null, revenue: null }, totalTrips: 150, totalRevenue: 71788.26, nonBillable: 4 },
      { month: "2026-01", label: "January 2026", emergency: { trips: 41, revenue: 24391.85 }, nonEmergency: { trips: 57, revenue: 22410.27 }, treatment: { trips: 1, revenue: 0 }, totalTrips: 99, totalRevenue: 46802.12, nonBillable: 4 },
      { month: "2026-02", label: "February 2026", emergency: { trips: 44, revenue: 25926.47 }, nonEmergency: { trips: 24, revenue: 7528.66 }, treatment: { trips: 1, revenue: 250 }, totalTrips: 69, totalRevenue: 33705.13, nonBillable: null },
      { month: "2026-03", label: "March 2026", emergency: { trips: 52, revenue: 30288.97 }, nonEmergency: { trips: 42, revenue: 14950.26 }, treatment: { trips: 3, revenue: 2250 }, totalTrips: 97, totalRevenue: 47489.23, nonBillable: 14 },
      { month: "2026-04", label: "April 2026", emergency: { trips: 59, revenue: 28667.03 }, nonEmergency: { trips: 42, revenue: 12163.77 }, treatment: { trips: 5, revenue: 550 }, totalTrips: 106, totalRevenue: 41380.80, nonBillable: 14 },
    ],
  },
  {
    id: "billing-may-july-2026", title: "EMS|MC Billing — May–July 2026",
    period: "May 1 through July 31, 2026 · Partial FY 2026–2027", partial: true,
    categories: { emergency: { trips: 130, revenue: 50088.08 }, nonEmergency: { trips: 190, revenue: 44868.64 }, treatment: { trips: 21, revenue: 240.06 } },
    totalTrips: 341, totalRevenue: 95196.78, nonBillable: 30,
    months: [
      { month: "2026-05", label: "May 2026", emergency: { trips: 47, revenue: 23007.13 }, nonEmergency: { trips: 53, revenue: 22012.01 }, treatment: { trips: 7, revenue: 240.06 }, totalTrips: 107, totalRevenue: 45259.20, nonBillable: 9 },
      { month: "2026-06", label: "June 2026", emergency: { trips: 49, revenue: 23087.80 }, nonEmergency: { trips: 58, revenue: 13234.91 }, treatment: { trips: 6, revenue: 0 }, totalTrips: 113, totalRevenue: 36322.71, nonBillable: 19 },
      { month: "2026-07", label: "July 2026", emergency: { trips: 34, revenue: 3993.15 }, nonEmergency: { trips: 79, revenue: 9621.72 }, treatment: { trips: 8, revenue: 0 }, totalTrips: 121, totalRevenue: 13614.87, nonBillable: 2 },
    ],
  },
];

export const COLLECTIONS_SNAPSHOT = {
  id: "collections-snapshot-2026",
  title: "EMS|MC Collections — 2026 Snapshot",
  period: "January–August 2026 posting months · Report dated August 13, 2026",
  reportedTotals: { actual: 441847, target: 295230, variance: 146617 },
  months: [
    { month: "2026-01", label: "January 2026", actual: 74070, target: 35117, variance: 38953 },
    { month: "2026-02", label: "February 2026", actual: 59194, target: 33445, variance: 25749 },
    { month: "2026-03", label: "March 2026", actual: 48005, target: 36789, variance: 11216 },
    { month: "2026-04", label: "April 2026", actual: 65914, target: 36789, variance: 29125 },
    { month: "2026-05", label: "May 2026", actual: 47843, target: 33445, variance: 14398 },
    { month: "2026-06", label: "June 2026", actual: 57242, target: 35117, variance: 22125 },
    { month: "2026-07", label: "July 2026", actual: 64781, target: 61987, variance: 2794 },
    { month: "2026-08", label: "August 2026 (partial)", actual: 24799, target: 22541, variance: 2259 },
  ],
  note: "This is a dated posting-month collections snapshot, not a full-year result or additional trip revenue. August is partial. The source shows whole dollars: displayed monthly actuals add to $1 more than its reported total, and monthly variances add to $2 more. Reported figures are retained.",
} as const;

const billingDollarsAndCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const billingWholeDollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const billingCounts = new Intl.NumberFormat("en-US");
export function formatBillingMoney(value: number, cents = true) {
  return (cents ? billingDollarsAndCents : billingWholeDollars).format(value);
}
export function formatBillingCount(value: number) { return billingCounts.format(value); }
function tripFiguresSearchText(figures: Record<TripCategory, TripFigures>) {
  return TRIP_CATEGORIES.map(category => {
    const row = figures[category.key];
    return `${category.label} ${row.trips === null ? "Not listed" : formatBillingCount(row.trips)} ${row.revenue === null ? "Not listed" : formatBillingMoney(row.revenue)}`;
  }).join(" · ");
}
export function billingMonthSearchText(month: BillingMonth) {
  return `${month.label} ${month.month} ${tripFiguresSearchText(month)} ${formatBillingCount(month.totalTrips)} ${formatBillingMoney(month.totalRevenue)} Non-billable trips by import month ${month.nonBillable === null ? "Not listed" : formatBillingCount(month.nonBillable)}`;
}
export function billingReportSearchText(report: BillingReport) {
  return [report.title, report.period, "EMS|MC billing summary Non-billable trips by import month", formatBillingCount(report.nonBillable),
    tripFiguresSearchText(report.categories), formatBillingCount(report.totalTrips), formatBillingMoney(report.totalRevenue), ...report.months.map(billingMonthSearchText),
  ].join(" · ");
}
export const BILLING_REPORT_SECTIONS = BILLING_REPORTS.map(report => ({ id: report.id, title: report.title, text: billingReportSearchText(report) }));
export const COLLECTIONS_ABOVE_TARGET = `${(COLLECTIONS_SNAPSHOT.reportedTotals.variance / COLLECTIONS_SNAPSHOT.reportedTotals.target * 100).toFixed(1)}%`;
export const COLLECTIONS_SNAPSHOT_SECTION = {
  id: COLLECTIONS_SNAPSHOT.id, title: COLLECTIONS_SNAPSHOT.title,
  text: `${COLLECTIONS_SNAPSHOT.period} Actual collections Prorated collection target Reported variance Above target ${COLLECTIONS_ABOVE_TARGET} ${[COLLECTIONS_SNAPSHOT.reportedTotals, ...COLLECTIONS_SNAPSHOT.months].map(row => [formatBillingMoney(row.actual, false), formatBillingMoney(row.target, false), formatBillingMoney(row.variance, false)].join(" ")).join(" · ")} ${COLLECTIONS_SNAPSHOT.months.map(row => `${row.label} ${row.month}`).join(" · ")}`,
};
export const CALENDAR_EXPLANATION = "911 call volumes are reported by calendar year, January 1 through December 31.";
export const PAY_RATE_GROUPS = [
  { position: "EMT", rates: [
    { type: "Regular", amount: "$16.00" },
    { type: "Overtime", amount: "$24.00" },
    { type: "Holiday", amount: "$32.00" },
  ] },
  { position: "Paramedic", rates: [
    { type: "Regular", amount: "$20.00" },
    { type: "Overtime", amount: "$30.00" },
    { type: "Holiday", amount: "$40.00" },
  ] },
] as const;
export const TRANSFER_CALL_STIPEND = "$10.00 per call";
export const NURSING_REGULAR_RATE = "$20.00/hour";

// Only the five visible loan rows are transcribed. The supplied correction
// overrides Zoll's worksheet rate and includes its balance despite its OFF toggle.
export const DEBT_LOANS = [
  { id: "mortgage", obligation: "First National Bank — mortgage", balance: 143348, interestRate: 6, frequency: "Monthly", scheduledPayment: 2141.30, paymentsPerYear: 12 },
  { id: "ambulance-3935", obligation: "Ambulance loan — Unit 3935", balance: 175842, interestRate: 6, frequency: "Monthly", scheduledPayment: 3000, paymentsPerYear: 12 },
  { id: "stryker-1", obligation: "Stryker Loan 1", balance: 8486, interestRate: 0, frequency: "Monthly", scheduledPayment: 446.65, paymentsPerYear: 12 },
  { id: "stryker-2", obligation: "Stryker Loan 2", balance: 122347, interestRate: 0, frequency: "Monthly", scheduledPayment: 1773.14, paymentsPerYear: 12 },
  { id: "zoll-monitor", obligation: "Zoll monitor loan", balance: 35558, interestRate: 7.99, frequency: "Annual", scheduledPayment: 17779.03, paymentsPerYear: 1 },
] as const;
export const DEBT_CREDIT_CARD = { obligation: "Credit card", balance: 0, status: "Paid off" } as const;
export const PAST_DUE_BILLS = [
  { obligation: "Accounting arrears", balance: 28000, planningYears: 2 },
  { obligation: "EMSMC account catch-up", balance: 28331, planningYears: 2 },
  { obligation: "Mediclaims unpaid invoice", balance: 10000, planningYears: 2 },
] as const;
export const PAST_DUE_EXPLANATION = "To meet payroll obligations, Millstadt Ambulance Service prioritized payroll payments, resulting in past-due balances on certain vendor accounts.";
export const PAST_DUE_PLANNING_NOTE = "The worksheet lists a two-year catch-up period for each account. This is presented as a planning assumption, not an approved payment schedule.";
export function annualizedLoanPaymentCents(loan: { scheduledPayment: number; paymentsPerYear: number }) {
  return Math.round(loan.scheduledPayment * 100) * loan.paymentsPerYear;
}
export function formatDebtRate(rate: number) { return `${rate.toFixed(2)}%`; }
const listedLoanBalance = DEBT_LOANS.reduce((total, loan) => total + loan.balance, 0);
const listedPastDueBalance = PAST_DUE_BILLS.reduce((total, bill) => total + bill.balance, 0);
export const DEBT_TOTALS = {
  loans: listedLoanBalance,
  pastDue: listedPastDueBalance,
  creditCard: DEBT_CREDIT_CARD.balance,
  combined: listedLoanBalance + listedPastDueBalance + DEBT_CREDIT_CARD.balance,
  annualizedLoanPaymentCents: DEBT_LOANS.reduce((total, loan) => total + annualizedLoanPaymentCents(loan), 0),
};
export function debtLoanSearchText(loan: typeof DEBT_LOANS[number]) {
  return `${loan.obligation} ${formatBillingMoney(loan.balance, false)} ${formatDebtRate(loan.interestRate)} ${loan.frequency} ${formatBillingMoney(loan.scheduledPayment)} ${loan.paymentsPerYear} payments per year Annualized scheduled payments ${formatBillingMoney(annualizedLoanPaymentCents(loan) / 100)}`;
}
export const DEBT_LIABILITIES_SECTION = {
  id: "debt-liabilities", title: "Debt/Liabilities",
  text: [
    ...DEBT_LOANS.map(debtLoanSearchText),
    `${DEBT_CREDIT_CARD.obligation} ${DEBT_CREDIT_CARD.status} ${formatBillingMoney(DEBT_CREDIT_CARD.balance, false)}`,
    `Past-due bills ${PAST_DUE_EXPLANATION} ${PAST_DUE_PLANNING_NOTE}`,
    ...PAST_DUE_BILLS.map(bill => `${bill.obligation} ${formatBillingMoney(bill.balance, false)} ${bill.planningYears} years`),
    `Total listed loan balance ${formatBillingMoney(DEBT_TOTALS.loans, false)} Total past-due bills ${formatBillingMoney(DEBT_TOTALS.pastDue, false)} Total listed liabilities ${formatBillingMoney(DEBT_TOTALS.combined, false)} Annualized listed loan payments ${formatBillingMoney(DEBT_TOTALS.annualizedLoanPaymentCents / 100)}`,
  ].join(" · "),
};
// Actual repair entries only; blank months and budget figures are excluded.
// Totals use the individual unit rows, not the incomplete worksheet subtotal.
export const TRUCK_REPAIRS = [
  { unit: "3925", months: [
    { month: "2026-05", label: "May 2026", amountCents: 153888 },
    { month: "2026-06", label: "June 2026", amountCents: 405690 },
    { month: "2026-07", label: "July 2026", amountCents: 0 },
    { month: "2026-08", label: "August 2026", amountCents: 434799 },
  ] },
  { unit: "3926", months: [
    { month: "2026-05", label: "May 2026", amountCents: 0 },
    { month: "2026-06", label: "June 2026", amountCents: 134476 },
    { month: "2026-07", label: "July 2026", amountCents: 0 },
    { month: "2026-08", label: "August 2026", amountCents: 4100 },
  ] },
  { unit: "3935", months: [
    { month: "2026-05", label: "May 2026", amountCents: 0 },
    { month: "2026-06", label: "June 2026", amountCents: 171807 },
    { month: "2026-07", label: "July 2026", amountCents: 167707 },
  ] },
] as const;
export const TRUCK_REPAIRS_PERIOD = "FY 2026–2027 · Recorded entries since May 1, 2026";
export const TRUCK_REPAIRS_CONTEXT = "Since the start of this fiscal year, Units 3925 and 3926 have both required transmission replacements. Unit 3926 has since experienced another transmission failure; the additional transmission repair is covered under warranty.";
export const TRUCK_REPAIRS_NOTE = "These are recorded truck-repair costs, not an itemized breakdown of transmission work. Totals include only entered amounts from May–August 2026; August is partial. Blank months are omitted, and no additional warranty-related cost is assumed.";
export function truckRepairTotalCents(truck: typeof TRUCK_REPAIRS[number]) {
  return truck.months.reduce((total, month) => total + month.amountCents, 0);
}
export const TRUCK_REPAIRS_TOTAL_CENTS = TRUCK_REPAIRS.reduce((total, truck) => total + truckRepairTotalCents(truck), 0);
export function truckRepairSearchText(truck: typeof TRUCK_REPAIRS[number]) {
  return `Unit ${truck.unit} Truck repairs ${formatBillingMoney(truckRepairTotalCents(truck) / 100)} ${truck.months.map(month => `${month.label} ${month.month} ${formatBillingMoney(month.amountCents / 100)}`).join(" · ")}`;
}
export const TRUCK_REPAIRS_SECTION = {
  id: "truck-repair-costs", title: "Truck repairs — FY 2026–2027",
  text: `Expenses Truck repair costs ${TRUCK_REPAIRS_PERIOD} ${TRUCK_REPAIRS_CONTEXT} ${TRUCK_REPAIRS_NOTE} Total recorded repair costs ${formatBillingMoney(TRUCK_REPAIRS_TOTAL_CENTS / 100)} ${TRUCK_REPAIRS.map(truckRepairSearchText).join(" · ")}`,
};
export const UNIFORM_SHIRT_EXPENSE = {
  title: "Employee uniform shirts",
  vendor: "Custom Screenprinting",
  amountCents: 399552,
  // The user said "last year" without specifying a fiscal or calendar year.
  periodLabel: "Prior-year purchase (as reported)",
} as const;
export const UNIFORM_SHIRT_SECTION = {
  id: "uniform-shirt-expense", title: UNIFORM_SHIRT_EXPENSE.title,
  text: `Expenses Uniforms ${UNIFORM_SHIRT_EXPENSE.vendor} ${formatBillingMoney(UNIFORM_SHIRT_EXPENSE.amountCents / 100)} ${UNIFORM_SHIRT_EXPENSE.periodLabel}`,
};
export const SECTION_SEARCH = [
  { id: "personnel", title: "Number of personnel", text: "18 EMTs 9 Paramedics 1 Pre-Hospital Registered Nurse 2 Advanced Practice Prehospital Registered Nurse Practitioners Total personnel 30" },
  { id: "district-support", title: "Current EMS Tax Amount", text: "$238,525.85" },
  { id: "pay-transparency", title: "Pay Transparency", text: `${PAY_RATE_GROUPS.flatMap(group => group.rates.map(rate => `${group.position} ${rate.type} ${rate.amount}/hour`)).join(" · ")} · Transfer-call stipend ${TRANSFER_CALL_STIPEND} · PHRN / APHRN regular ${NURSING_REGULAR_RATE}` },
  { id: "annual-call-volume", title: "Annual 911 call volume", text: `${CALENDAR_EXPLANATION} 2022 618 2023 734 2024 748 2025 880 2026 through current Live` },
  BILLING_HISTORY_SECTION,
  MEDICLAIMS_CLOSE_SECTION,
  ...BILLING_REPORT_SECTIONS,
  COLLECTIONS_SNAPSHOT_SECTION,
  DEBT_LIABILITIES_SECTION,
  TRUCK_REPAIRS_SECTION,
  UNIFORM_SHIRT_SECTION,
  { id: "voter-resources", title: "Ready to Vote?", text: "Access official St. Clair County voter-registration, polling-place, election, and voter-information resources. View Official Voter Resources" },
];

export function normalizeSearch(value: string) {
  return value.toLowerCase().replace(/[–—−]/g, "-").replace(/\s+/g, " ").trim();
}
export function matchesSearch(text: string, query: string) {
  return normalizeSearch(text).includes(normalizeSearch(query));
}
export function documentSearchText(document: PublicLibraryDocument) {
  return [document.title,document.periodLabel,document.dateLabel,document.sourceLabel,document.searchText,document.employee,document.statusLabel,"PDF",document.pageCount ? `${document.pageCount} pages` : "",document.attachmentOf ? "Attachments" : ""].filter(Boolean).join(" ");
}
export function reportDraft(document?: PublicLibraryDocument, description = "") {
  const subject = document ? `Document problem: ${document.title}` : "Millstadt EMS technical problem";
  const body = [`Page: ${PUBLIC_PAGE_URL}`, ...(document ? [`Document: ${document.title}`, `Link: ${document.viewUrl.startsWith("http") ? document.viewUrl : `https://www.millstadtems.org${document.viewUrl}`}`] : []), "", "Please describe the problem (do not include private or medical information):", description.trim()].filter((line,index,lines)=>index<lines.length-1||line!=="").join("\n");
  return {
    subject,
    body,
    text: `To: ${REPORT_EMAIL}\nSubject: ${subject}\n\n${body}`,
    href: `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  };
}
export function reportHref(document?: PublicLibraryDocument) {
  return reportDraft(document).href;
}

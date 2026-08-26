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
export const SECTION_SEARCH = [
  { id: "personnel", title: "Number of personnel", text: "18 EMTs 9 Paramedics 1 Pre-Hospital Registered Nurse 2 Advanced Practice Prehospital Registered Nurse Practitioners Total personnel 30" },
  { id: "district-support", title: "Current EMS Tax Amount", text: "$238,525.85" },
  { id: "pay-transparency", title: "Pay Transparency", text: `${PAY_RATE_GROUPS.flatMap(group => group.rates.map(rate => `${group.position} ${rate.type} ${rate.amount}/hour`)).join(" · ")} · Transfer-call stipend ${TRANSFER_CALL_STIPEND} · PHRN / APHRN regular ${NURSING_REGULAR_RATE}` },
  { id: "annual-call-volume", title: "Annual 911 call volume", text: `${CALENDAR_EXPLANATION} 2022 618 2023 734 2024 748 2025 880 2026 through current Live` },
  { id: "billing-activity", title: "Fiscal-Year Billing Activity", text: `${BILLING_EXPLANATION} ${BILLING_ROWS.map(r=>Object.values(r).join(" ")).join(" ")}` },
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

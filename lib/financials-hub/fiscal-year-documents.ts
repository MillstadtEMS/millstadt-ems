import type { PublicLibraryDocument } from "./public-library";

export function matchesLibraryCategory(document: PublicLibraryDocument, category: string) {
  return category === "All documents" || document.category === category || (category === "990" && document.kind === "management_pay");
}

export function payReportsForYear(documents: PublicLibraryDocument[], endingYear: number) {
  return documents.filter(document => document.kind === "management_pay" && document.filingYear === endingYear);
}

export function filingYearGroups(documents: PublicLibraryDocument[], matchedDocuments: PublicLibraryDocument[], category: string, pendingYear?: number) {
  if (category === "Operational") return [];
  const years = [...new Set(matchedDocuments.filter(document => document.kind === "form_990" || document.kind === "management_pay").map(document => document.filingYear))]
    .filter((year): year is number => typeof year === "number" && year !== pendingYear)
    .sort((a, b) => b - a);
  return years.map(year => {
    const filings = documents.filter(document => document.kind === "form_990" && document.filingYear === year);
    const reports = payReportsForYear(documents, year);
    return { year, filings, reports, fileCount: filings.length + reports.length };
  });
}

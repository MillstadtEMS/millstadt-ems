"use client";

import { useSyncExternalStore } from "react";
import type { PublicLibraryDocument } from "@/lib/financials-hub/public-library";
import { ANNUAL_AUDIT_NOTE, type PendingAnnualAudit } from "@/lib/financials-hub/annual-audits";
import { normalizeSearch } from "@/lib/financials-hub/transparency-content";
import { Disclosure, DocumentRow, Highlight } from "./DocumentRows";
import styles from "./PublicDocumentLibrary.module.css";

function subscribeToAnchor(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
function readAnchor() { return window.location.hash.slice(1); }
function serverAnchor() { return ""; }

export default function AnnualAudits({ documents, pending, query = "" }: {
  documents: PublicLibraryDocument[];
  pending: readonly PendingAnnualAudit[];
  query?: string;
}) {
  const anchor = useSyncExternalStore(subscribeToAnchor, readAnchor, serverAnchor);
  const needle = normalizeSearch(query);
  const years = [
    ...documents.map(document => ({ id: document.id, year: document.filingYear!, document, pending: undefined })),
    ...pending.map(report => ({ id: report.id, year: report.year, document: undefined, pending: report })),
  ].sort((a, b) => b.year - a.year);

  if (years.length === 0) return null;

  return <div id="annual-audits" className={styles.billingReport}>
    <Disclosure
      key={`audits-${needle}-${anchor}`}
      title="Annual Audits"
      meta={`${documents.length} ${documents.length === 1 ? "file" : "files"}`}
      initiallyOpen={Boolean(needle) || anchor === "annual-audits" || years.some(year => year.id === anchor)}
      query={query}
    >
      <p className={styles.categoryNote}><Highlight text={ANNUAL_AUDIT_NOTE} query={query}/></p>
      {years.map(({ id, document, pending: report }) => <div id={id} key={id}>
        <Disclosure
          title={document?.title ?? report!.title}
          meta={document ? "1 file" : report!.statusLabel}
          level={4}
          initiallyOpen={Boolean(needle) || anchor === id}
          query={query}
        >
          {document ? <DocumentRow document={document} query={query} level={5}/> : <div className={styles.pendingContent}>
            <p><Highlight text={report!.periodLabel} query={query}/></p>
            <p><Highlight text={report!.message} query={query}/></p>
          </div>}
        </Disclosure>
      </div>)}
    </Disclosure>
  </div>;
}

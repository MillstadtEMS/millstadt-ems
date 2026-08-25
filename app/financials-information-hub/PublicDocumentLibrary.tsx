"use client";

import {
  Bug,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSearch,
  FileText,
  Filter,
  Printer,
  Search,
  X,
  ZoomIn,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

import type { PublicLibraryDocument } from "@/lib/financials-hub/public-library";
import AnnualCallSummary from "./AnnualCallSummary";
import styles from "./PublicDocumentLibrary.module.css";

const ALL_CATEGORIES = "All documents";
const DOCUMENT_REPORT_EMAIL = "kenneth.james@millstadtems.org";
const PUBLIC_SITE_ORIGIN = "https://millstadtems.org";

export default function PublicDocumentLibrary({
  documents,
}: {
  documents: PublicLibraryDocument[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES);

  const categories = useMemo(
    () => [
      ALL_CATEGORIES,
      ...Array.from(new Set(documents.map((document) => document.category))).sort(),
    ],
    [documents],
  );

  const filteredDocuments = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return documents.filter(
      (document) =>
        (category === ALL_CATEGORIES || document.category === category) &&
        (!needle || document.searchText.includes(needle)),
    );
  }, [category, documents, query]);

  const form990s = filteredDocuments.filter((document) => document.category === "990");
  const operationalDocuments = filteredDocuments.filter(
    (document) => document.category !== "990",
  );
  const filtersActive = Boolean(query.trim()) || category !== ALL_CATEGORIES;

  function clearFilters() {
    setQuery("");
    setCategory(ALL_CATEGORIES);
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="financial-library-title">
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={`${styles.shell} ${styles.heroLayout}`}>
          <div>
            <p className={styles.eyebrow}>Millstadt Ambulance Service</p>
            <h1 id="financial-library-title">Financial Transparency</h1>
            <p className={styles.heroLead}>Direct public access to annual IRS filings and operational records.</p>
          </div>
          <div className={styles.heroBrand} aria-hidden="true">
            <Image
              src="/images/financial-transparency/millstadt-ems-financial-transparency.png"
              alt=""
              width={384}
              height={256}
              className={styles.heroLogo}
            />
          </div>
        </div>
      </section>

      <AnnualCallSummary />

      <section className={styles.library} id="document-library" aria-labelledby="library-heading">
        <div className={styles.shell}>
          <div className={styles.libraryHeading}>
            <div>
              <h2 id="library-heading">Document library</h2>
              <p>Search by document name, year, category, or filing date.</p>
            </div>
          </div>

          <div className={styles.toolbar}>
            <label className={styles.searchField}>
              <span className={styles.srOnly}>Search documents</span>
              <Search aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search documents or years"
              />
            </label>
            <label className={styles.filterField}>
              <span className={styles.srOnly}>Filter by document category</span>
              <Filter aria-hidden="true" />
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            {filtersActive && (
              <button className={styles.clearButton} type="button" onClick={clearFilters}>
                <X aria-hidden="true" /> Clear
              </button>
            )}
          </div>

          {filteredDocuments.length === 0 ? (
            <div className={styles.emptyState}>
              <FileSearch aria-hidden="true" />
              <h3>No documents match that search.</h3>
              <p>Clear the filters to return to the complete public library.</p>
              <button type="button" onClick={clearFilters}>Show all documents</button>
            </div>
          ) : (
            <div className={styles.libraryGroups}>
              {form990s.length > 0 && (
                <AnnualDocumentGroup documents={form990s} />
              )}
              {operationalDocuments.length > 0 && (
                <DocumentGroup
                  title="Operational records"
                  description="Other official records released for direct public access."
                  documents={operationalDocuments}
                />
              )}
            </div>
          )}

          <DocumentUseNotice />
        </div>
      </section>
    </main>
  );
}

function AnnualDocumentGroup({
  documents,
}: {
  documents: PublicLibraryDocument[];
}) {
  const documentsByYear = documents.reduce<Record<string, PublicLibraryDocument[]>>(
    (groups, document) => {
      const year = String(document.filingYear ?? "Other");
      groups[year] = [...(groups[year] ?? []), document];
      return groups;
    },
    {},
  );

  const yearGroups = Object.entries(documentsByYear).sort(([yearA], [yearB]) =>
    yearB.localeCompare(yearA, undefined, { numeric: true }),
  );

  return (
    <section className={styles.documentGroup} aria-labelledby="annual-filings-heading">
      <div className={styles.groupHeading}>
        <div>
          <h3 id="annual-filings-heading">IRS Form 990 filings</h3>
          <p>Expand a tax year to view every document associated with that year.</p>
        </div>
      </div>
      <div className={styles.yearList}>
        {yearGroups.map(([year, yearDocuments]) => (
          <details className={styles.yearRow} key={year}>
            <summary>
              <span className={styles.yearIdentity}>
                <span>Tax year</span>
                <strong>{year}</strong>
              </span>
              <span className={styles.yearFileCount}>
                {yearDocuments.length} {yearDocuments.length === 1 ? "file" : "files"}
              </span>
              <span className={styles.yearToggle}>
                View files <ChevronDown aria-hidden="true" />
              </span>
            </summary>
            <div className={styles.attachmentList}>
              {yearDocuments.map((document) => (
                <AnnualAttachmentRow key={document.id} document={document} />
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function AnnualAttachmentRow({ document }: { document: PublicLibraryDocument }) {
  return (
    <article className={styles.attachmentRow}>
      <div className={styles.fileIcon} aria-hidden="true">
        <FileText />
        <span>PDF</span>
      </div>
      <div className={styles.attachmentInfo}>
        <span className={styles.category}>{document.category}</span>
        <h4>{document.title}</h4>
        <p>
          {document.dateLabel}
          {document.pageCount ? ` · ${document.pageCount} pages` : ""}
        </p>
        <a
          className={styles.attachmentReportLink}
          href={documentReportHref(document)}
          aria-label={`Report a problem with ${document.title}`}
        >
          <Bug aria-hidden="true" /> Report a problem
        </a>
      </div>
      <span className={styles.status}>
        <CheckCircle2 aria-hidden="true" /> {document.statusLabel}
      </span>
      <div className={styles.attachmentActions}>
        <a
          className={styles.primaryAction}
          href={document.viewUrl}
          target="_blank"
          rel="noreferrer"
          data-analytics-event="document_view"
          data-analytics-document-kind="public_form_990"
          data-analytics-document-id={document.id}
        >
          <ZoomIn aria-hidden="true" /> View
        </a>
        <a
          className={styles.secondaryAction}
          href={document.downloadUrl}
          download
          data-analytics-event="document_download"
          data-analytics-document-kind="public_form_990"
          data-analytics-document-id={document.id}
        >
          <Download aria-hidden="true" /> Download
        </a>
        <a
          className={styles.secondaryAction}
          href={document.printUrl}
          target="_blank"
          rel="noreferrer"
          data-analytics-event="print_selection"
          data-analytics-document-kind="public_form_990"
          data-analytics-document-id={document.id}
        >
          <Printer aria-hidden="true" /> Print
        </a>
      </div>
    </article>
  );
}

function DocumentGroup({
  title,
  description,
  documents,
}: {
  title: string;
  description: string;
  documents: PublicLibraryDocument[];
}) {
  return (
    <section className={styles.documentGroup} aria-labelledby={`${documents[0]?.kind}-heading`}>
      <div className={styles.groupHeading}>
        <div>
          <h3 id={`${documents[0]?.kind}-heading`}>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <div className={styles.documentGrid}>
        {documents.map((document) => (
          <DocumentCard key={document.id} document={document} />
        ))}
      </div>
    </section>
  );
}

function DocumentCard({ document }: { document: PublicLibraryDocument }) {
  return (
    <article className={styles.documentCard}>
      <div className={styles.cardTop}>
        <div className={styles.fileIcon} aria-hidden="true">
          <FileText />
          <span>PDF</span>
        </div>
        <div className={styles.cardTitle}>
          <span className={styles.category}>{document.category}</span>
          <h4>{document.title}</h4>
        </div>
        <span className={styles.status}>
          <CheckCircle2 aria-hidden="true" /> {document.statusLabel}
        </span>
      </div>

      <dl className={styles.metadata}>
        <div><dt>Period</dt><dd>{document.periodLabel}</dd></div>
        <div><dt>Record</dt><dd>{document.dateLabel}</dd></div>
        {document.pageCount ? (
          <div><dt>Length</dt><dd>{document.pageCount} page{document.pageCount === 1 ? "" : "s"}</dd></div>
        ) : (
          <div><dt>Source</dt><dd>{document.sourceLabel}</dd></div>
        )}
      </dl>

      <div className={styles.cardActions}>
        <a
          className={styles.primaryAction}
          href={document.viewUrl}
          target="_blank"
          rel="noreferrer"
          data-analytics-event="document_view"
          data-analytics-document-kind={document.kind === "form_990" ? "public_form_990" : "public_operational_document"}
          data-analytics-document-id={document.id}
        >
          <ZoomIn aria-hidden="true" /> View PDF
        </a>
        <a
          className={styles.secondaryAction}
          href={document.downloadUrl}
          download
          data-analytics-event="document_download"
          data-analytics-document-kind={document.kind === "form_990" ? "public_form_990" : "public_operational_document"}
          data-analytics-document-id={document.id}
        >
          <Download aria-hidden="true" /> Download
        </a>
        <a
          className={styles.secondaryAction}
          href={document.printUrl}
          target="_blank"
          rel="noreferrer"
          data-analytics-event="print_selection"
          data-analytics-document-kind={document.kind === "form_990" ? "public_form_990" : "public_operational_document"}
          data-analytics-document-id={document.id}
        >
          <Printer aria-hidden="true" /> Print
        </a>
      </div>
      <p className={styles.viewerHint}>The PDF opens with your browser’s zoom, print, and save controls.</p>
      <a
        className={styles.reportLink}
        href={documentReportHref(document)}
        aria-label={`Report a problem with ${document.title}`}
      >
        <Bug aria-hidden="true" /> Report a problem
      </a>
    </article>
  );
}

function documentReportHref(document: PublicLibraryDocument) {
  const subject = `Financial Transparency document problem: ${document.title}`;
  const body = [
    "A document in the Millstadt EMS Financial Transparency library may be unavailable or returning an error.",
    "",
    `Document: ${document.title}`,
    `Document ID: ${document.id}`,
    `Link: ${document.viewUrl.startsWith("http") ? document.viewUrl : `${PUBLIC_SITE_ORIGIN}${document.viewUrl}`}`,
    "",
    "Please describe what happened:",
  ].join("\n");

  return `mailto:${DOCUMENT_REPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function DocumentUseNotice() {
  return (
    <aside className={styles.notice} aria-labelledby="document-use-notice">
      <div className={styles.noticeIcon} aria-hidden="true">
        <FileText />
      </div>
      <div>
        <h2 id="document-use-notice"><em>Document Use Notice</em></h2>
        <p><em>These materials are provided for informational and public-disclosure purposes. The posted version is the District’s official website copy as identified by its tax year, filing date, and status.</em></p>
        <p><strong><em>It is not permitted to misrepresent the source, authenticity, or contents of these materials, materially alter them while presenting them as originals, or use them for an unlawful purpose.</em></strong></p>
        <p><em>Artificial-intelligence tools may inaccurately summarize, interpret, reproduce, or attribute information from these materials. AI-generated results should be verified against the complete original document. The filed document controls.</em></p>
      </div>
    </aside>
  );
}

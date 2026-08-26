"use client";

import { ChevronDown, Download, FileText, Printer, ExternalLink } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import type { PublicLibraryDocument } from "@/lib/financials-hub/public-library";
import { normalizeSearch } from "@/lib/financials-hub/transparency-content";
import ReportProblem from "./ReportProblem";
import styles from "./PublicDocumentLibrary.module.css";

export function Highlight({ text, query = "" }: { text: string; query?: string }) {
  const needle = normalizeSearch(query);
  const index = needle ? normalizeSearch(text).indexOf(needle) : -1;
  if (index < 0) return <>{text}</>;
  return <>{text.slice(0,index)}<mark>{text.slice(index,index+needle.length)}</mark>{text.slice(index+needle.length)}</>;
}

export function Disclosure({ title, meta, children, initiallyOpen = false, level = 3, query = "" }: {
  title: string; meta?: ReactNode; children: ReactNode; initiallyOpen?: boolean; level?: 3 | 4 | 5; query?: string;
}) {
  const id = useId();
  const [open,setOpen] = useState(initiallyOpen);
  const Heading = `h${level}` as "h3" | "h4" | "h5";
  return <section className={`${styles.disclosure} ${level === 3 ? styles.categoryDisclosure : ""}`}>
    <Heading className={styles.disclosureHeading}>
      <button type="button" aria-expanded={open} aria-controls={`${id}-panel`} id={`${id}-button`} onClick={()=>setOpen(!open)} className={styles.disclosureButton}>
        <span><Highlight text={title} query={query}/>{meta ? <span className={styles.disclosureMeta}>{meta}</span> : null}</span>
        <ChevronDown aria-hidden="true" className={open ? styles.rotated : ""}/>
      </button>
    </Heading>
    <div hidden={!open} id={`${id}-panel`} aria-labelledby={`${id}-button`} className={styles.disclosurePanel}>{children}</div>
  </section>;
}

export function DocumentActions({ document }: { document: PublicLibraryDocument }) {
  const analytics={"data-analytics-document-kind":document.kind === "form_990" ? "public_form_990" : "public_operational_document","data-analytics-document-id":document.id};
  const [status,setStatus] = useState<"idle" | "checking" | "failed">("idle");
  const [message,setMessage] = useState("");
  async function checkSource() {
    setStatus("checking");
    try {
      const response = await fetch(`/api/financials/public-document-status?id=${encodeURIComponent(document.id)}`, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error("Source check failed");
      const result = await response.json();
      if (!result.available) throw new Error("File unavailable");
      setStatus("idle");
    } catch {
      setStatus("failed");
      setMessage("The source could not be reached. Try again or report this document problem.");
    }
  }
  return <div className={styles.actionArea}>
    <div className={styles.documentActions} aria-label={`Actions for ${document.title}`}>
      <a href={document.viewUrl} {...analytics} data-analytics-event="document_view" target="_blank" rel="noopener noreferrer" onClick={checkSource} aria-label={`View PDF: ${document.title}`}><FileText aria-hidden="true"/>View PDF</a>
      <a href={document.downloadUrl} {...analytics} data-analytics-event="document_download" download target="_blank" rel="noopener noreferrer" onClick={checkSource} aria-label={`Download: ${document.title}`}><Download aria-hidden="true"/>Download</a>
      <a href={document.printUrl} {...analytics} data-analytics-event="print_selection" target="_blank" rel="noopener noreferrer" onClick={checkSource} aria-label={`Print: ${document.title} (opens PDF; use browser print)`} title="Open PDF and use the browser’s Print control"><Printer aria-hidden="true"/>Print</a>
      <ReportProblem document={document} className={styles.reportAction}/>
    </div>
    <div role="status" className={styles.actionStatus}>
      {status === "checking" ? "Checking document source…" : status === "failed" ? <><span>{message}</span><button type="button" onClick={checkSource}>Check again</button></> : null}
    </div>
  </div>;
}

export function DocumentRow({ document, query = "", level = 3, idPrefix = "document" }: { document: PublicLibraryDocument; query?: string; level?: 3 | 4 | 5 | 6; idPrefix?: string }) {
  const Heading = `h${level}` as "h3" | "h4" | "h5" | "h6";
  return <article className={styles.documentRow} id={`${idPrefix}-${document.id}`}>
    <div className={styles.documentInfo}>
      {document.kind !== "management_pay" ? <p className={styles.recordType}>{document.kind === "irs_record" ? "Official IRS Record" : document.attachmentOf ? "Attachment" : document.statusLabel}</p> : null}
      <Heading><Highlight text={document.title} query={query}/></Heading>
      <p><Highlight text={document.periodLabel} query={query}/></p>
      <p className={styles.metadata}><Highlight text={`${document.dateLabel} · PDF${document.pageCount ? ` · ${document.pageCount} pages` : ""}`} query={query}/></p>
    </div>
    <DocumentActions document={document}/>
  </article>;
}

export function TaxRow({ document, query }: { document: PublicLibraryDocument; query: string }) {
  const [open,setOpen]=useState(Boolean(query.trim()));
  const id=useId();
  const data=document.taxData;
  const fields=data ? [
    ["Taxing District",data.district], ["Fund",data.fund], ["Rate Setting EAV — Total + Overlap",data.rateSettingEav],
    ["Levy Request",data.levyRequest],["Maximum Rate",data.maximumRate],["Calculated Rate",data.calculatedRate],
    ["Actual Rate",data.actualRate],["Certified Rate",data.certifiedRate],["Total Extension",data.totalExtension],
    ["Total Extension After TIF & EZ",data.extensionAfterTifEz],["Total Extension With Overlaps",data.extensionWithOverlaps],["Percent",data.percent],
  ] : [];
  return <article className={styles.taxRow}>
    <div className={styles.taxSummary}>
      <h4><button type="button" aria-controls={id} aria-expanded={open} onClick={()=>setOpen(!open)}><Highlight text={`Tax year ${document.filingYear}`} query={query}/><ChevronDown aria-hidden="true" className={open?styles.rotated:""}/></button></h4>
      <dl className={styles.taxMetrics}>
        <div><dt>Certified Ambulance Rate</dt><dd><Highlight text={data?.certifiedRate ?? "Verification pending"} query={query}/></dd></div>
        <div><dt>Ambulance Extension After TIF &amp; EZ</dt><dd><Highlight text={data?.extensionAfterTifEz ?? "Verification pending"} query={query}/></dd></div>
        <div><dt>Source page</dt><dd>{data?.sourcePage ?? document.viewUrl.split("#page=")[1]}</dd></div>
      </dl>
    </div>
    <DocumentActions document={document}/>
    <div hidden={!open} id={id} className={styles.taxDetails}>
      <p>Source: <a href={document.viewUrl} target="_blank" rel="noopener noreferrer">{document.title} <ExternalLink aria-hidden="true"/></a>{document.pageCount ? ` · ${document.pageCount} pages` : ""}</p>
      {data ? <dl>{fields.map(([label,value])=><div key={label}><dt><Highlight text={label} query={query}/></dt><dd><Highlight text={value} query={query}/></dd></div>)}</dl> : <p>Verification pending. Consult the official source PDF.</p>}
    </div>
  </article>;
}

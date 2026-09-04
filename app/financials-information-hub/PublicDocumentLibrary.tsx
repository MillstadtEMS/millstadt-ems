"use client";

import { CheckSquare, ExternalLink, FileText, Filter, Search, X } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import type { PublicLibraryDocument } from "@/lib/financials-hub/public-library";
import { PENDING_ANNUAL_AUDITS } from "@/lib/financials-hub/annual-audits";
import { filingYearGroups, matchesLibraryCategory, payReportsForYear } from "@/lib/financials-hub/fiscal-year-documents";
import { documentSearchText, matchesSearch, normalizeSearch, PENDING_COPY, PENDING_SEARCH, PENDING_TITLE, SECTION_SEARCH, VOTER_RESOURCES_URL, FACEBOOK_URL } from "@/lib/financials-hub/transparency-content";
import AnnualCallSummary from "./AnnualCallSummary";
import AnnualAudits from "./AnnualAudits";
import DebtLiabilities from "./DebtLiabilities";
import ExpenseRecords from "./ExpenseRecords";
import { BillingActivity, PersonnelAndPay } from "./FinancialOverview";
import { Disclosure, DocumentRow, Highlight, TaxRow } from "./DocumentRows";
import ReportProblem from "./ReportProblem";
import styles from "./PublicDocumentLibrary.module.css";

export default function PublicDocumentLibrary({documents}:{documents:PublicLibraryDocument[]}) {
  const [query,setQuery]=useState("");
  const [category,setCategory]=useState("All documents");
  const [liveCalls,setLiveCalls]=useState<number|null>(null);
  const needle=normalizeSearch(query);
  const matching=useMemo(()=>documents.filter(d=>matchesLibraryCategory(d,category)&&matchesSearch(documentSearchText(d),query)),[documents,category,query]);
  const audits=matching.filter(d=>d.kind==="annual_audit");
  const pendingAudits=category==="990" ? [] : PENDING_ANNUAL_AUDITS.filter(report=>matchesSearch(report.searchText,query));
  const taxes=matching.filter(d=>d.kind==="tax_computation");
  const management=category==="990" ? [] : matching.filter(d=>d.kind==="management_pay");
  const irs=matching.filter(d=>d.kind==="irs_record");
  const settlements=matching.filter(d=>d.id==="fdmi-settlement-sheet-tax-year-2025");
  const corporateAnnualReports=matching.filter(d=>d.id==="state-of-illinois-domestic-corporation-annual-report-2026");
  const moneyMarketStatements=matching.filter(d=>d.id==="money-market-account-2023-01-31-to-2026-08-31");
  const featuredRecordIds=new Set([...settlements,...corporateAnnualReports,...moneyMarketStatements].map(d=>d.id));
  const others=matching.filter(d=>d.kind==="official_record"&&!featuredRecordIds.has(d.id));
  const hasCurrentFiling=documents.some(d=>d.kind==="form_990"&&d.filingYear===2026&&!d.attachmentOf);
  const pendingMatches=!hasCurrentFiling && category!=="Operational" && matchesSearch(PENDING_SEARCH,query);
  const showPending=pendingMatches || (!hasCurrentFiling && category!=="Operational" && matching.some(d=>d.kind==="management_pay"&&d.filingYear===2026));
  const sectionMatches=needle ? SECTION_SEARCH.filter(s=>matchesSearch(`${s.title} ${s.text}${s.id==="annual-call-volume" && liveCalls!==null ? ` ${liveCalls} ${liveCalls.toLocaleString()}` : ""}`,query)) : [];
  const resultCount=matching.length+pendingAudits.length+Number(pendingMatches)+sectionMatches.length;
  const yearGroups=filingYearGroups(documents,matching,category,hasCurrentFiling?undefined:2026);
  const reset=()=>{setQuery("");setCategory("All documents");};
  return <div className={styles.page}>
    <section className={styles.hero} aria-labelledby="financial-library-title">
      <div className={styles.heroGlow} aria-hidden="true"/>
      <div className={`${styles.shell} ${styles.heroLayout}`}>
        <div><p className={styles.eyebrow}>Millstadt Ambulance Service</p><h1 id="financial-library-title">Financial Transparency</h1><p className={styles.heroLead}>Direct public access to annual IRS filings and operational records.</p></div>
        <div className={styles.heroBrand}><Image src="/images/financial-transparency/millstadt-ems-financial-transparency.png" alt="" width={384} height={256} className={styles.heroLogo}/></div>
        <div className={styles.heroActions} aria-label="Official external resources">
          <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer">Follow Millstadt EMS <ExternalLink aria-hidden="true"/></a>
          <a href={VOTER_RESOURCES_URL} target="_blank" rel="noopener noreferrer"><CheckSquare aria-hidden="true"/>Voter Resources <ExternalLink aria-hidden="true"/></a>
        </div>
      </div>
    </section>
    <PersonnelAndPay/>
    <AnnualCallSummary onCurrentCalls={setLiveCalls}/>
    <section id="document-library" aria-labelledby="library-heading" className={styles.library}>
      <div className={styles.shell}>
        <div className={styles.libraryHeading}><p className={styles.eyebrow}>Open access</p><h2 id="library-heading">Document library</h2><p>Explore filings, official records, and approved public reports.</p></div>
        <div className={styles.toolbar}>
          <label className={styles.searchField}><span className={styles.srOnly}>Search this page and documents</span><Search aria-hidden="true"/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search names, years, documents, or figures"/></label>
          <label className={styles.filterField}><span className={styles.srOnly}>Filter by document category</span><Filter aria-hidden="true"/><select value={category} onChange={e=>setCategory(e.target.value)}><option>All documents</option><option>990</option><option>Operational</option></select></label>
          <button className={styles.clearButton} type="button" onClick={reset} disabled={!needle&&category==="All documents"}><X aria-hidden="true"/>Reset</button>
        </div>
        <p className={styles.resultCount} role="status" aria-live="polite">{needle||category!=="All documents" ? `${resultCount} ${resultCount===1?"result":"results"}` : `${documents.length} public documents`}</p>
        {sectionMatches.length>0 ? <nav className={styles.sectionResults} aria-label="Matching page sections"><h3>On this page</h3>{sectionMatches.map(s=><a href={`#${s.id}`} key={s.id}><Highlight text={s.title} query={query}/><span><Highlight text={s.text} query={query}/></span></a>)}</nav> : null}
        <div className={styles.libraryGroups}>
          {settlements.map(d=><Disclosure key={`${d.id}-${needle}`} title={d.title} meta={`County record · PDF · ${d.pageCount} page`} initiallyOpen={Boolean(needle)} query={query}><DocumentRow document={d} query={query} level={4}/></Disclosure>)}
          {corporateAnnualReports.map(d=><Disclosure key={`${d.id}-${needle}`} title={d.title} meta={`Official record · PDF · ${d.pageCount} pages`} initiallyOpen={Boolean(needle)} query={query}><DocumentRow document={d} query={query} level={4}/></Disclosure>)}
          {moneyMarketStatements.map(d=><Disclosure key={`${d.id}-${needle}`} title={d.title} meta={`Approved public report · Combined PDF · 3 source documents · ${d.pageCount} pages`} initiallyOpen={Boolean(needle)} query={query}><DocumentRow document={d} query={query} level={4}/>{d.disclaimer ? <p className={styles.categoryNote}><Highlight text={d.disclaimer} query={query}/></p> : null}</Disclosure>)}
          <AnnualAudits documents={audits} pending={pendingAudits} query={query}/>
          <BillingActivity query={query}/>
          <DebtLiabilities query={query}/>
          <ExpenseRecords query={query}/>
          {yearGroups.length>0||showPending ? <Disclosure key={`forms-${needle}`} title="IRS Form 990 Filings" initiallyOpen={Boolean(needle)} query={query}>
            {showPending ? <Disclosure key={`pending-${needle}`} title={PENDING_TITLE} meta={<><span className={styles.pendingBadge}>Pending from CPA</span><span>Currently Unavailable</span></>} level={4} initiallyOpen={Boolean(needle)} query={query}>
              <div className={styles.pendingContent}><h5>Form 990 — Pending from CPA</h5><p><Highlight text={PENDING_COPY} query={query}/></p></div>
              <RelatedPayReports reports={payReportsForYear(documents,2026)} year={2026} query={query}/>
            </Disclosure> : null}
            {yearGroups.map(({year,filings:yearDocs,reports,fileCount})=>{
              const primary=yearDocs.filter(d=>!d.attachmentOf);
              const attachments=yearDocs.filter(d=>d.attachmentOf);
              return <Disclosure key={`${year}-${needle}`} title={`Fiscal Year ${year-1}–${year}`} meta={`${fileCount} ${fileCount===1?"file":"files"}`} level={4} initiallyOpen={Boolean(needle)} query={query}>
                {primary.length===0 ? <p className={styles.categoryNote}>No Form 990 is currently posted for this fiscal year. The compensation reports are listed below.</p> : null}
                {primary.map(d=><DocumentRow key={d.id} document={d} query={query} level={5}/>)}
                {attachments.length>0 ? <Disclosure title={`Attachments (${attachments.length})`} level={5} initiallyOpen={Boolean(needle)}>{attachments.map(d=><DocumentRow key={d.id} document={d} query={query} level={6}/>)}</Disclosure> : null}
                <RelatedPayReports reports={reports} year={year} query={query}/>
              </Disclosure>;
            })}
          </Disclosure> : null}
          {irs.map(d=><Disclosure key={`${d.id}-${needle}`} title={d.title} meta={`Official IRS Record · ${d.pageCount} pages`} initiallyOpen={Boolean(needle)} query={query}><DocumentRow document={d} query={query} level={4}/></Disclosure>)}
          {management.length>0 ? <Disclosure key={`management-${needle}`} title="Management Pay Transparency" meta={`${management.length} approved public ${management.length===1?"report":"reports"}`} initiallyOpen={Boolean(needle)} query={query}>
            {(["Jennifer Goetz","Kenneth James"] as const).map(employee=>{const reports=management.filter(d=>d.employee===employee);return reports.length ? <Disclosure key={`${employee}-${needle}`} title={employee} level={4} meta={`${reports.length} ${reports.length===1?"report":"reports"}`} initiallyOpen={Boolean(needle)} query={query}>{reports.map(d=><DocumentRow key={d.id} document={d} query={query} level={5}/>)}</Disclosure> : null;})}
          </Disclosure> : null}
          {others.length>0 ? <Disclosure title="Illinois Certificate of Good Standing" key={`others-${needle}`} initiallyOpen={Boolean(needle)}>{others.map(d=><DocumentRow key={d.id} document={d} query={query}/>)}</Disclosure> : null}
          {taxes.length>0 ? <Disclosure key={`taxes-${needle}`} title="St. Clair County Tax Computation Reports" meta={`${taxes.length} source ${taxes.length===1?"report":"reports"}`} initiallyOpen={Boolean(needle)} query={query}><p className={styles.categoryNote}>County PDFs open on the official source website. Use the PDF viewer’s save or print controls.</p>{taxes.map(d=><TaxRow key={`${d.id}-${needle}`} document={d} query={query}/>)}</Disclosure> : null}
          {resultCount===0 ? <div className={styles.emptyState}><h3>No results found.</h3><p>Try another name, year, or document title.</p><button type="button" onClick={reset}>Reset search</button></div> : null}
        </div>
        <DocumentUseNotice/>
        <div className={styles.technicalReport}><ReportProblem/><p>For website bugs and technical problems only. Requests are not accepted. Reports go to webdev@millstadtems.org.</p></div>
      </div>
    </section>
    <section className={styles.voteSection} id="voter-resources" aria-labelledby="vote-title"><div className={styles.shell}><a className={styles.voteCard} href={VOTER_RESOURCES_URL} target="_blank" rel="noopener noreferrer"><Image src="/images/financial-transparency/get-out-and-vote.png" alt="Get Out & Vote, with a ballot box and red, white, and blue stars" width={1536} height={1024} sizes="(max-width:700px) 100vw, 450px"/><div><p className={styles.eyebrow}>Official civic resources</p><h2 id="vote-title">Ready to Vote?</h2><p>Access official St. Clair County voter-registration, polling-place, election, and voter-information resources.</p><span className={styles.voteCta}>View Official Voter Resources <ExternalLink aria-hidden="true"/></span></div></a></div></section>
  </div>;
}

function RelatedPayReports({reports,year,query}:{reports:PublicLibraryDocument[];year:number;query:string}) {
  if(reports.length===0) return null;
  return <>{reports.map(document=><DocumentRow key={document.id} document={document} query={query} level={5} idPrefix={`990-pay-${year}`}/>)}</>;
}

function DocumentUseNotice() {
  return <aside className={styles.notice} aria-labelledby="document-use-notice"><FileText aria-hidden="true"/><div><h2 id="document-use-notice"><em>Document Use Notice</em></h2><p><em>These materials are provided for informational and public-disclosure purposes. The posted version is the District’s official website copy as identified by its tax year, filing date, and status.</em></p><p><strong><em>It is not permitted to misrepresent the source, authenticity, or contents of these materials, materially alter them while presenting them as originals, or use them for an unlawful purpose.</em></strong></p><p><em>Artificial-intelligence tools may inaccurately summarize, interpret, reproduce, or attribute information from these materials. AI-generated results should be verified against the complete original document. The filed document controls.</em></p></div></aside>;
}

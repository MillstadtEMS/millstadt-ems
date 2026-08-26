"use client";

import { useSyncExternalStore } from "react";
import {
  BILLING_ROWS, BILLING_EXPLANATION, BILLING_HISTORY_SECTION,
  MEDICLAIMS_CLOSE, MEDICLAIMS_CLOSE_SECTION, BILLING_REPORTS, BILLING_REPORT_SECTIONS,
  COLLECTIONS_SNAPSHOT, COLLECTIONS_SNAPSHOT_SECTION, COLLECTIONS_ABOVE_TARGET, TRIP_CATEGORIES,
  billingReportSearchText, billingMonthSearchText, formatBillingMoney, formatBillingCount, matchesSearch, normalizeSearch,
  type BillingReport,
} from "@/lib/financials-hub/transparency-content";
import { Disclosure, Highlight } from "./DocumentRows";
import styles from "./PublicDocumentLibrary.module.css";

const reportSections = [BILLING_HISTORY_SECTION, MEDICLAIMS_CLOSE_SECTION, ...BILLING_REPORT_SECTIONS, COLLECTIONS_SNAPSHOT_SECTION];
function subscribeToAnchor(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
function readAnchor() { return window.location.hash.slice(1); }
function serverAnchor() { return ""; }

export default function BillingReports({ query = "" }: { query?: string }) {
  const needle = normalizeSearch(query);
  const anchor = useSyncExternalStore(subscribeToAnchor, readAnchor, serverAnchor);
  const isOpen = (section: { id: string; title: string; text: string }) => anchor === section.id || (Boolean(needle) && matchesSearch(`${section.title} ${section.text}`, query));
  const groupOpen = anchor === "billing-activity" || reportSections.some(isOpen);
  return <div id="billing-activity" className={styles.billingReport}>
      <Disclosure key={`billing-group-${needle}-${anchor}`} title="Billing & Mediclaims reports" meta="5 summaries" level={3} initiallyOpen={groupOpen} query={query}>
        <p className={styles.categoryNote}>Each report retains its own dates and reporting basis. Billing trips and collections are separate from the calendar-year 911 call count.</p>
        {[...BILLING_REPORTS].reverse().map(report => <div id={report.id} className={styles.billingReport} key={report.id}>
          <Disclosure title={report.title} meta={<Highlight text={report.period} query={query}/>} level={4} initiallyOpen={isOpen({ id: report.id, title: report.title, text: billingReportSearchText(report) })} query={query}>
            <TripReport report={report} query={query}/>
          </Disclosure>
        </div>)}
        <div id={MEDICLAIMS_CLOSE_SECTION.id} className={styles.billingReport}>
          <Disclosure title={MEDICLAIMS_CLOSE.title} meta={<Highlight text={MEDICLAIMS_CLOSE.period} query={query}/>} level={4} initiallyOpen={isOpen(MEDICLAIMS_CLOSE_SECTION)} query={query}>
            <AmountTable caption={`Mediclaims close reported for ${MEDICLAIMS_CLOSE.period}`} rows={MEDICLAIMS_CLOSE.rows} query={query}/>
          </Disclosure>
        </div>
        <div id={BILLING_HISTORY_SECTION.id} className={styles.billingReport}>
          <Disclosure title={BILLING_HISTORY_SECTION.title} meta="Previously posted billing revenue and billable runs" level={4} initiallyOpen={isOpen(BILLING_HISTORY_SECTION)} query={query}>
            <p className={styles.categoryNote}><Highlight text={BILLING_EXPLANATION} query={query}/></p>
            <table className={styles.billingTable}>
              <caption className={styles.srOnly}>Billing revenue and billable runs by fiscal year</caption>
              <thead><tr><th scope="col">Fiscal year</th><th scope="col">Billing revenue</th><th scope="col">Total billable runs</th><th scope="col">Interfacility transfers</th><th scope="col">Calculated non-transfer billable runs</th></tr></thead>
              <tbody>{BILLING_ROWS.map(row => <tr key={row.year}><th scope="row">FY {row.year}</th><td data-label="Billing revenue"><Highlight text={row.revenue} query={query}/></td><td data-label="Total billable runs">{row.runs}</td><td data-label="Interfacility transfers">{row.transfers}</td><td data-label="Calculated non-transfer billable runs">{row.nonTransfer}</td></tr>)}</tbody>
            </table>
          </Disclosure>
        </div>
        <div id={COLLECTIONS_SNAPSHOT.id} className={styles.billingReport}>
          <Disclosure title={COLLECTIONS_SNAPSHOT.title} meta={<Highlight text={COLLECTIONS_SNAPSHOT.period} query={query}/>} level={4} initiallyOpen={isOpen(COLLECTIONS_SNAPSHOT_SECTION)} query={query}>
            <CollectionsReport query={query}/>
          </Disclosure>
        </div>
      </Disclosure>
  </div>;
}

function AmountTable({ caption, rows, query }: { caption: string; rows: readonly { item: string; amount: string }[]; query: string }) {
  return <table className={styles.mediclaimsTable}>
    <caption className={styles.srOnly}>{caption}</caption>
    <thead><tr><th scope="col">Item</th><th scope="col">Amount</th></tr></thead>
    <tbody>{rows.map(row => <tr key={row.item}><th scope="row"><Highlight text={row.item} query={query}/></th><td><Highlight text={row.amount} query={query}/></td></tr>)}</tbody>
  </table>;
}

function TripTable({ caption, categories, totalTrips, totalRevenue, query }: {
  caption: string; categories: BillingReport["categories"]; totalTrips: number; totalRevenue: number; query: string;
}) {
  return <table className={styles.tripTable}>
    <caption className={styles.srOnly}>{caption}</caption>
    <thead><tr><th scope="col">Category</th><th scope="col">Billable trips</th><th scope="col">Reported revenue</th></tr></thead>
    <tbody>{TRIP_CATEGORIES.map(category => {
      const figures = categories[category.key];
      return <tr key={category.key}><th scope="row"><Highlight text={category.label} query={query}/></th><td><Highlight text={figures.trips === null ? "Not listed" : formatBillingCount(figures.trips)} query={query}/></td><td><Highlight text={figures.revenue === null ? "Not listed" : formatBillingMoney(figures.revenue)} query={query}/></td></tr>;
    })}</tbody>
    <tfoot><tr><th scope="row">Total billable</th><td><Highlight text={formatBillingCount(totalTrips)} query={query}/></td><td><Highlight text={formatBillingMoney(totalRevenue)} query={query}/></td></tr></tfoot>
  </table>;
}

function TripReport({ report, query }: { report: BillingReport; query: string }) {
  const needle = normalizeSearch(query);
  return <>
    <p className={styles.categoryNote}>Source: EMS|MC billing summary. {report.partial ? "This covers May–July only, not a complete fiscal year. " : ""}“Non-emergency” is the source category; it is not relabeled as interfacility transfers.</p>
    <TripTable caption={`${report.title} — category totals`} categories={report.categories} totalTrips={report.totalTrips} totalRevenue={report.totalRevenue} query={query}/>
    <p className={styles.nonBillableLine}><span>Non-billable trips — reported separately by import month</span><strong><Highlight text={formatBillingCount(report.nonBillable)} query={query}/></strong></p>
    <p className={styles.categoryNote}>Non-billable counts are not included in the billable totals above. “Not listed” preserves a blank cell or an omitted month in the source.</p>
    <p className={styles.monthlyLabel}>Monthly detail</p>
    {report.months.map(month => {
      const monthText = billingMonthSearchText(month);
      return <Disclosure key={`${month.month}-${needle}`} title={month.label} meta={<Highlight text={`${formatBillingCount(month.totalTrips)} billable trips · ${formatBillingMoney(month.totalRevenue)}`} query={query}/>} level={5} initiallyOpen={Boolean(needle) && matchesSearch(monthText, query)} query={query}>
        <TripTable caption={`${month.label} — billable trips and revenue`} categories={month} totalTrips={month.totalTrips} totalRevenue={month.totalRevenue} query={query}/>
        <p className={styles.nonBillableLine}><span>Non-billable trips — import month {month.label}</span><strong><Highlight text={month.nonBillable === null ? "Not listed" : formatBillingCount(month.nonBillable)} query={query}/></strong></p>
      </Disclosure>;
    })}
  </>;
}

function CollectionsReport({ query }: { query: string }) {
  const totals = COLLECTIONS_SNAPSHOT.reportedTotals;
  const needle = normalizeSearch(query);
  return <>
    <p className={styles.categoryNote}><Highlight text={COLLECTIONS_SNAPSHOT.note} query={query}/></p>
    <AmountTable caption="Reported collections snapshot totals" query={query} rows={[
      { item: "Reported actual collections", amount: formatBillingMoney(totals.actual, false) },
      { item: "Prorated collection target", amount: formatBillingMoney(totals.target, false) },
      { item: "Reported amount above target", amount: formatBillingMoney(totals.variance, false) },
      { item: "Above target (calculated from reported totals)", amount: COLLECTIONS_ABOVE_TARGET },
    ]}/>
    <p className={styles.monthlyLabel}>Monthly detail · Posting month</p>
    {COLLECTIONS_SNAPSHOT.months.map(month => {
      const rows = [
        { item: "Reported actual collections", amount: formatBillingMoney(month.actual, false) },
        { item: "Prorated collection target", amount: formatBillingMoney(month.target, false) },
        { item: "Reported variance", amount: formatBillingMoney(month.variance, false) },
      ];
      return <Disclosure key={`${month.month}-${needle}`} title={month.label} meta={`${formatBillingMoney(month.actual, false)} reported actual`} level={5} initiallyOpen={Boolean(needle) && matchesSearch(`${month.label} ${month.month} ${rows.map(row => `${row.item} ${row.amount}`).join(" ")}`, query)} query={query}>
        <AmountTable caption={`${month.label} — collections snapshot`} rows={rows} query={query}/>
        {month.month === "2026-08" ? <p className={styles.categoryNote}>The source reports a $2,259 variance; subtracting its displayed whole-dollar figures gives $2,258. The reported value is retained.</p> : null}
      </Disclosure>;
    })}
  </>;
}

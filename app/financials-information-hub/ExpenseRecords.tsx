"use client";

import { useSyncExternalStore } from "react";
import {
  TRUCK_REPAIR_REPORTS, UNIFORM_SHIRT_EXPENSE, UNIFORM_SHIRT_SECTION,
  formatBillingMoney, matchesSearch, normalizeSearch,
} from "@/lib/financials-hub/transparency-content";
import { Disclosure, Highlight } from "./DocumentRows";
import TruckRepairCosts from "./TruckRepairCosts";
import styles from "./PublicDocumentLibrary.module.css";

const expenseSections = [...TRUCK_REPAIR_REPORTS.map(report => report.section), UNIFORM_SHIRT_SECTION];
function subscribeToAnchor(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
function readAnchor() { return window.location.hash.slice(1); }
function serverAnchor() { return ""; }

export default function ExpenseRecords({ query = "" }: { query?: string }) {
  const needle = normalizeSearch(query);
  const anchor = useSyncExternalStore(subscribeToAnchor, readAnchor, serverAnchor);
  const isOpen = (section: { id: string; title: string; text: string }) => anchor === section.id || (Boolean(needle) && matchesSearch(`${section.title} ${section.text}`, query));
  const uniform = UNIFORM_SHIRT_EXPENSE;
  return <section id="expenses" aria-labelledby="expenses-title" className={styles.repairsSection}>
    <div className={styles.shell}>
      <h2 id="expenses-title">Expenses</h2>
      <p className={styles.sectionExplanation}>Selected operating expenses, organized by category and reporting period.</p>
      <Disclosure key={`expenses-${needle}-${anchor}`} title="Expenses" meta={`${expenseSections.length} summaries`} initiallyOpen={anchor === "expenses" || expenseSections.some(isOpen)} query={query}>
        <div id={UNIFORM_SHIRT_SECTION.id} className={styles.billingReport}>
          <Disclosure title={uniform.title} meta={<Highlight text={`${formatBillingMoney(uniform.amountCents / 100)} · ${uniform.periodLabel}`} query={query}/>} level={4} initiallyOpen={isOpen(UNIFORM_SHIRT_SECTION)} query={query}>
            <table className={styles.mediclaimsTable}>
              <caption className={styles.srOnly}>Employee uniform-shirt expense</caption>
              <thead><tr><th scope="col">Item</th><th scope="col">Amount / detail</th></tr></thead>
              <tbody>
                <tr><th scope="row">Vendor</th><td><Highlight text={uniform.vendor} query={query}/></td></tr>
                <tr><th scope="row">Recorded expense</th><td><Highlight text={formatBillingMoney(uniform.amountCents / 100)} query={query}/></td></tr>
              </tbody>
            </table>
            <p className={styles.categoryNote}>This prior-year purchase is reported separately from the truck-repair totals.</p>
          </Disclosure>
        </div>
        {TRUCK_REPAIR_REPORTS.map(report => <TruckRepairCosts key={report.section.id} report={report} query={query} anchor={anchor}/>)}
      </Disclosure>
    </div>
  </section>;
}

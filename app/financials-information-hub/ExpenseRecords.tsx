"use client";

import { useSyncExternalStore } from "react";
import {
  TRUCK_REPAIR_REPORTS, UNIFORM_SHIRT_EXPENSE, UNIFORM_SHIRT_SECTION,
  FISCAL_EXPENSE_REPORTS, FISCAL_EXPENSE_SECTIONS,
  formatBillingMoney, matchesSearch, normalizeSearch,
} from "@/lib/financials-hub/transparency-content";
import { Disclosure, Highlight } from "./DocumentRows";
import TruckRepairCosts from "./TruckRepairCosts";
import FiscalExpenseCosts from "./FiscalExpenseCosts";
import styles from "./PublicDocumentLibrary.module.css";

const expenseSections = [...TRUCK_REPAIR_REPORTS.map(report => report.section), UNIFORM_SHIRT_SECTION, ...FISCAL_EXPENSE_SECTIONS];
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
  const uniformContent = <div key={UNIFORM_SHIRT_SECTION.id} id={UNIFORM_SHIRT_SECTION.id} className={styles.billingReport}>
          <Disclosure title={uniform.title} meta={<Highlight text={`${formatBillingMoney(uniform.amountCents / 100)} · ${uniform.periodLabel}`} query={query}/>} level={4} initiallyOpen={isOpen(UNIFORM_SHIRT_SECTION)} query={query}>
            <table className={styles.mediclaimsTable}>
              <caption className={styles.srOnly}>Employee uniform-shirt expense</caption>
              <thead><tr><th scope="col">Item</th><th scope="col">Amount / detail</th></tr></thead>
              <tbody>
                <tr><th scope="row">Vendor</th><td><Highlight text={uniform.vendor} query={query}/></td></tr>
                <tr><th scope="row">Recorded expense</th><td><Highlight text={formatBillingMoney(uniform.amountCents / 100)} query={query}/></td></tr>
              </tbody>
            </table>
          </Disclosure>
        </div>;
  const groups = [
    { title: uniform.title, content: uniformContent },
    ...TRUCK_REPAIR_REPORTS.map(report => ({ title: "Truck repairs", content: <TruckRepairCosts key={report.section.id} report={report} query={query} anchor={anchor}/> })),
    ...FISCAL_EXPENSE_REPORTS.map(report => ({ title: report.title, content: <FiscalExpenseCosts key={report.id} report={report} query={query} anchor={anchor}/> })),
  ].sort((a, b) => a.title.localeCompare(b.title, "en"));
  return <div id="expenses" className={styles.billingReport}>
    <Disclosure key={`expenses-${needle}-${anchor}`} title="Expenses" meta={`${expenseSections.length} summaries`} level={3} initiallyOpen={anchor === "expenses" || expenseSections.some(isOpen)} query={query}>
      {groups.map(group => group.content)}
    </Disclosure>
  </div>;
}

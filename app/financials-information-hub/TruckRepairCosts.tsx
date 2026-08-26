"use client";

import {
  type TruckRepairReport,
  truckRepairTotalCents, truckRepairSearchText, formatBillingMoney, matchesSearch, normalizeSearch,
} from "@/lib/financials-hub/transparency-content";
import { Disclosure, Highlight } from "./DocumentRows";
import styles from "./PublicDocumentLibrary.module.css";

export default function TruckRepairCosts({ report, query = "", anchor = "" }: { report: TruckRepairReport; query?: string; anchor?: string }) {
  const needle = normalizeSearch(query);
  const { section, period, context, note, trucks, totalCents } = report;
  const queryMatches = (text: string) => Boolean(needle) && matchesSearch(text, query);
  return <div id={section.id} className={styles.billingReport}>
      <Disclosure key={`${section.id}-${needle}-${anchor}`} title={section.title} meta={`${formatBillingMoney(totalCents / 100)} recorded repairs`} level={4} initiallyOpen={anchor === section.id || queryMatches(`${section.title} ${section.text}`)} query={query}>
        <p className={styles.categoryNote}><Highlight text={period} query={query}/></p>
        {context ? <p className={styles.categoryNote}><Highlight text={context} query={query}/></p> : null}
        <table className={styles.mediclaimsTable}>
          <caption className={styles.srOnly}>{`${section.title} — recorded costs by unit`}</caption>
          <thead><tr><th scope="col">Unit</th><th scope="col">Recorded repair costs</th></tr></thead>
          <tbody>{trucks.map(truck => <tr key={truck.unit}>
            <th scope="row"><Highlight text={`Unit ${truck.unit}`} query={query}/></th>
            <td><Highlight text={formatBillingMoney(truckRepairTotalCents(truck) / 100)} query={query}/></td>
          </tr>)}</tbody>
          <tfoot><tr><th scope="row">Total recorded repair costs</th><td><Highlight text={formatBillingMoney(totalCents / 100)} query={query}/></td></tr></tfoot>
        </table>
        <p className={styles.categoryNote}><Highlight text={note} query={query}/></p>
        {trucks.map(truck => <Disclosure key={truck.unit} title={`Unit ${truck.unit} — monthly detail`} meta={formatBillingMoney(truckRepairTotalCents(truck) / 100)} level={5} initiallyOpen={queryMatches(truckRepairSearchText(truck))} query={query}>
          <table className={styles.mediclaimsTable}>
            <caption className={styles.srOnly}>{`${section.title} — Unit ${truck.unit} — entered monthly repair costs`}</caption>
            <thead><tr><th scope="col">Month</th><th scope="col">Recorded repair costs</th></tr></thead>
            <tbody>{truck.months.map(month => <tr key={month.month}>
              <th scope="row"><Highlight text={month.label} query={query}/></th>
              <td><Highlight text={formatBillingMoney(month.amountCents / 100)} query={query}/></td>
            </tr>)}</tbody>
          </table>
        </Disclosure>)}
      </Disclosure>
  </div>;
}

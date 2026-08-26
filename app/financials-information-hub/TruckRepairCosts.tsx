"use client";

import {
  TRUCK_REPAIRS, TRUCK_REPAIRS_PERIOD, TRUCK_REPAIRS_CONTEXT, TRUCK_REPAIRS_NOTE,
  TRUCK_REPAIRS_TOTAL_CENTS, TRUCK_REPAIRS_SECTION,
  truckRepairTotalCents, truckRepairSearchText, formatBillingMoney, matchesSearch, normalizeSearch,
} from "@/lib/financials-hub/transparency-content";
import { Disclosure, Highlight } from "./DocumentRows";
import styles from "./PublicDocumentLibrary.module.css";

export default function TruckRepairCosts({ query = "", anchor = "" }: { query?: string; anchor?: string }) {
  const needle = normalizeSearch(query);
  const section = TRUCK_REPAIRS_SECTION;
  const queryMatches = (text: string) => Boolean(needle) && matchesSearch(text, query);
  return <div id={section.id} className={styles.billingReport}>
      <Disclosure key={`repairs-${needle}-${anchor}`} title={section.title} meta={`${formatBillingMoney(TRUCK_REPAIRS_TOTAL_CENTS / 100)} recorded repairs`} level={4} initiallyOpen={anchor === section.id || queryMatches(`${section.title} ${section.text}`)} query={query}>
        <p className={styles.categoryNote}><Highlight text={TRUCK_REPAIRS_PERIOD} query={query}/></p>
        <p className={styles.categoryNote}><Highlight text={TRUCK_REPAIRS_CONTEXT} query={query}/></p>
        <table className={styles.mediclaimsTable}>
          <caption className={styles.srOnly}>Recorded truck repair costs by unit</caption>
          <thead><tr><th scope="col">Unit</th><th scope="col">Recorded repair costs</th></tr></thead>
          <tbody>{TRUCK_REPAIRS.map(truck => <tr key={truck.unit}>
            <th scope="row"><Highlight text={`Unit ${truck.unit}`} query={query}/></th>
            <td><Highlight text={formatBillingMoney(truckRepairTotalCents(truck) / 100)} query={query}/></td>
          </tr>)}</tbody>
          <tfoot><tr><th scope="row">Total recorded repair costs</th><td><Highlight text={formatBillingMoney(TRUCK_REPAIRS_TOTAL_CENTS / 100)} query={query}/></td></tr></tfoot>
        </table>
        <p className={styles.categoryNote}><Highlight text={TRUCK_REPAIRS_NOTE} query={query}/></p>
        {TRUCK_REPAIRS.map(truck => <Disclosure key={truck.unit} title={`Unit ${truck.unit} — monthly detail`} meta={formatBillingMoney(truckRepairTotalCents(truck) / 100)} level={5} initiallyOpen={queryMatches(truckRepairSearchText(truck))} query={query}>
          <table className={styles.mediclaimsTable}>
            <caption className={styles.srOnly}>{`Unit ${truck.unit} — entered monthly repair costs`}</caption>
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

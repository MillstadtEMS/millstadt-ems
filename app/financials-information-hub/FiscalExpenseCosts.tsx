"use client";

import {
  type FiscalExpenseReport, type FiscalExpenseRow, EXPENSE_MONTHS_2025_2026,
  expenseRowTotalCents, expenseReportTotalCents,
  expenseRowSearchText, fiscalExpenseSection, formatBillingMoney, matchesSearch, normalizeSearch,
} from "@/lib/financials-hub/transparency-content";
import { Disclosure, Highlight } from "./DocumentRows";
import styles from "./PublicDocumentLibrary.module.css";

function rowAmount(row: FiscalExpenseRow) {
  const total = expenseRowTotalCents(row);
  return total !== null ? formatBillingMoney(total / 100)
    : row.reportedYtdCents !== null ? formatBillingMoney(row.reportedYtdCents / 100)
    : "Not reported";
}

export default function FiscalExpenseCosts({ report, query = "", anchor = "" }: { report: FiscalExpenseReport; query?: string; anchor?: string }) {
  const needle = normalizeSearch(query);
  const section = fiscalExpenseSection(report);
  const total = expenseReportTotalCents(report);
  const queryMatches = (text: string) => Boolean(needle) && matchesSearch(text, query);
  return <div id={report.id} className={styles.billingReport}>
    <Disclosure key={`${report.id}-${needle}-${anchor}`} title={report.title} meta={`${formatBillingMoney(total / 100)} recorded entries`} level={4} initiallyOpen={anchor === report.id || queryMatches(`${section.title} ${section.text}`)} query={query}>
      <p className={styles.categoryNote}><Highlight text={report.period} query={query}/></p>
      {report.notes.map(note => <p key={note} className={styles.categoryNote}><Highlight text={note} query={query}/></p>)}
      <table className={styles.mediclaimsTable}>
        <caption className={styles.srOnly}>{`${report.title} — recorded amounts by category`}</caption>
        <thead><tr><th scope="col">Category</th><th scope="col">Recorded amount</th></tr></thead>
        <tbody>{report.rows.map(row => <tr key={row.id}>
          <th scope="row"><Highlight text={row.label} query={query}/></th>
          <td><Highlight text={rowAmount(row)} query={query}/></td>
        </tr>)}</tbody>
        <tfoot><tr><th scope="row">Total of recorded entries</th><td><Highlight text={formatBillingMoney(total / 100)} query={query}/></td></tr></tfoot>
      </table>
      {[...report.rows].sort((a, b) => a.label.localeCompare(b.label, "en")).map(row => <Disclosure key={row.id} title={row.label} meta={rowAmount(row)} level={5} initiallyOpen={queryMatches(expenseRowSearchText(row))} query={query}>
        <p className={styles.categoryNote}><Highlight text={row.description} query={query}/></p>
        {expenseRowTotalCents(row) === null ? null : <table className={styles.mediclaimsTable}>
          <caption className={styles.srOnly}>{`${report.title} — ${row.label} — monthly entries`}</caption>
          <thead><tr><th scope="col">Month</th><th scope="col">Recorded amount</th></tr></thead>
          <tbody>{row.monthlyCents.map((amount, index) => amount === null ? null : <tr key={EXPENSE_MONTHS_2025_2026[index].id}>
            <th scope="row"><Highlight text={EXPENSE_MONTHS_2025_2026[index].label} query={query}/></th>
            <td><Highlight text={formatBillingMoney(amount / 100)} query={query}/></td>
          </tr>)}</tbody>
        </table>}
      </Disclosure>)}
    </Disclosure>
  </div>;
}

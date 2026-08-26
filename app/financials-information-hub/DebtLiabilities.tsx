"use client";

import { useSyncExternalStore } from "react";
import {
  DEBT_LOANS, DEBT_CREDIT_CARD, DEBT_TOTALS, DEBT_LIABILITIES_SECTION,
  PAST_DUE_BILLS, PAST_DUE_EXPLANATION, PAST_DUE_PLANNING_NOTE,
  annualizedLoanPaymentCents, debtLoanSearchText, formatDebtRate,
  formatBillingMoney, matchesSearch, normalizeSearch,
} from "@/lib/financials-hub/transparency-content";
import { Disclosure, Highlight } from "./DocumentRows";
import styles from "./PublicDocumentLibrary.module.css";

function subscribeToAnchor(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
function readAnchor() { return window.location.hash.slice(1); }
function serverAnchor() { return ""; }

export default function DebtLiabilities({ query = "" }: { query?: string }) {
  const needle = normalizeSearch(query);
  const anchor = useSyncExternalStore(subscribeToAnchor, readAnchor, serverAnchor);
  const section = DEBT_LIABILITIES_SECTION;
  const queryMatches = (text: string) => Boolean(needle) && matchesSearch(text, query);
  const pastDueText = ["Past-due bills", PAST_DUE_EXPLANATION, PAST_DUE_PLANNING_NOTE, ...PAST_DUE_BILLS.map(bill => `${bill.obligation} ${formatBillingMoney(bill.balance, false)} ${bill.planningYears} years`), formatBillingMoney(DEBT_TOTALS.pastDue, false)].join(" ");
  return <section id={section.id} aria-labelledby="debt-title" className={styles.debtSection}>
    <div className={styles.shell}>
      <h2 id="debt-title">Debt &amp; liabilities</h2>
      <p className={styles.sectionExplanation}>Reported loan balances, credit-card status, and past-due bills.</p>
      <Disclosure key={`debt-${needle}-${anchor}`} title={section.title} meta={`${formatBillingMoney(DEBT_TOTALS.combined, false)} total listed balance`} initiallyOpen={anchor === section.id || queryMatches(`${section.title} ${section.text}`)} query={query}>
        <DebtTable caption="Summary of listed debt and liabilities" query={query} rows={[
          { label: "Listed loan balances", value: formatBillingMoney(DEBT_TOTALS.loans, false) },
          { label: "Past-due bills", value: formatBillingMoney(DEBT_TOTALS.pastDue, false) },
          { label: "Credit card — paid off", value: formatBillingMoney(DEBT_TOTALS.creditCard, false) },
          { label: "Total listed liabilities", value: formatBillingMoney(DEBT_TOTALS.combined, false) },
        ]}/>
        <p className={styles.categoryNote}>Totals cover only the loans, credit card, and past-due bills listed here. Balances are reported in whole dollars.</p>
        {DEBT_LOANS.map(loan => <Disclosure key={loan.id} title={loan.obligation} meta={<Highlight text={`${formatBillingMoney(loan.balance, false)} balance · ${formatDebtRate(loan.interestRate)} interest`} query={query}/>} level={4} initiallyOpen={queryMatches(debtLoanSearchText(loan))} query={query}>
          <DebtTable caption={`${loan.obligation} — reported balance and payment schedule`} query={query} rows={[
            { label: "Reported remaining balance", value: formatBillingMoney(loan.balance, false) },
            { label: "Interest rate", value: formatDebtRate(loan.interestRate) },
            { label: "Payment frequency", value: loan.frequency },
            { label: "Scheduled payment", value: formatBillingMoney(loan.scheduledPayment) },
            { label: "Payments per year", value: String(loan.paymentsPerYear) },
            { label: "Annualized scheduled payments (calculated)", value: formatBillingMoney(annualizedLoanPaymentCents(loan) / 100) },
          ]}/>
          {loan.id === "zoll-monitor" ? <p className={styles.categoryNote}>The remaining Zoll balance is included with a 7.99% interest rate. The listed annual payment is retained; no revised loan terms or payoff date are calculated.</p> : null}
        </Disclosure>)}
        <Disclosure title={DEBT_CREDIT_CARD.obligation} meta="$0 balance · Paid off" level={4} initiallyOpen={queryMatches(`${DEBT_CREDIT_CARD.obligation} ${DEBT_CREDIT_CARD.status} $0`)} query={query}>
          <DebtTable caption="Credit-card balance and status" query={query} rows={[
            { label: "Current balance", value: formatBillingMoney(DEBT_CREDIT_CARD.balance, false) },
            { label: "Status", value: DEBT_CREDIT_CARD.status },
          ]}/>
        </Disclosure>
        <p className={styles.categoryNote}>Annualized listed loan payments total <strong><Highlight text={formatBillingMoney(DEBT_TOTALS.annualizedLoanPaymentCents / 100)} query={query}/></strong>, calculated from the payment amounts and frequencies above, including Zoll’s listed annual payment. This is not a payoff forecast and does not include a repayment schedule for past-due bills.</p>
        <Disclosure title="Past-due bills" meta={formatBillingMoney(DEBT_TOTALS.pastDue, false)} level={4} initiallyOpen={queryMatches(pastDueText)} query={query}>
          <p className={styles.categoryNote}><Highlight text={PAST_DUE_EXPLANATION} query={query}/></p>
          <DebtTable caption="Reported past-due bills" query={query} rows={[
            ...PAST_DUE_BILLS.map(bill => ({ label: bill.obligation, value: formatBillingMoney(bill.balance, false) })),
            { label: "Total past-due bills", value: formatBillingMoney(DEBT_TOTALS.pastDue, false) },
          ]}/>
          <p className={styles.categoryNote}><Highlight text={PAST_DUE_PLANNING_NOTE} query={query}/></p>
        </Disclosure>
      </Disclosure>
    </div>
  </section>;
}

function DebtTable({ caption, rows, query }: { caption: string; rows: readonly { label: string; value: string }[]; query: string }) {
  return <table className={styles.mediclaimsTable}>
    <caption className={styles.srOnly}>{caption}</caption>
    <thead><tr><th scope="col">Item</th><th scope="col">Amount / detail</th></tr></thead>
    <tbody>{rows.map(row => <tr key={row.label}><th scope="row"><Highlight text={row.label} query={query}/></th><td><Highlight text={row.value} query={query}/></td></tr>)}</tbody>
  </table>;
}

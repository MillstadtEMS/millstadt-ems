import { BILLING_ROWS, BILLING_EXPLANATION, PAY_RATE_GROUPS, TRANSFER_CALL_STIPEND, NURSING_REGULAR_RATE } from "@/lib/financials-hub/transparency-content";
import styles from "./PublicDocumentLibrary.module.css";

export function PersonnelAndPay() {
  return <>
    <section className={styles.overviewSection} id="personnel" aria-labelledby="personnel-title">
      <div className={styles.shell}>
        <div className={styles.overviewHeading}><div><p className={styles.eyebrow}>Our team</p><h2 id="personnel-title">Number of personnel</h2></div><div className={styles.supportMetric} id="district-support"><h3>Current EMS Tax Amount</h3><p>$238,525.85</p></div></div>
        <dl className={styles.personnelGrid}>
          <div><dt>EMTs</dt><dd>18</dd></div><div><dt>Paramedics</dt><dd>9</dd></div>
          <div><dt>Pre-Hospital Registered Nurse</dt><dd>1</dd></div>
          <div><dt>Advanced Practice Prehospital Registered Nurse Practitioners</dt><dd>2</dd></div>
          <div className={styles.personnelTotal}><dt>Total personnel</dt><dd>30</dd></div>
        </dl>
      </div>
    </section>
    <section id="pay-transparency" aria-labelledby="pay-title" className={styles.paySection}>
      <div className={`${styles.shell} ${styles.payBand}`}>
        <h2 id="pay-title">Pay Transparency</h2>
        <div className={styles.payRateGroups}>
          {PAY_RATE_GROUPS.map(group => (
            <div className={styles.payRateGroup} key={group.position}>
              <h3 id={`pay-${group.position.toLowerCase()}`}>{group.position}</h3>
              <dl className={styles.payRates} aria-labelledby={`pay-${group.position.toLowerCase()}`}>
                {group.rates.map(rate => (
                  <div key={rate.type}>
                    <dt>{rate.type}</dt>
                    <dd><strong>{rate.amount}</strong><span>/hour</span></dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
        <div className={styles.payExtras}>
          <p className={styles.transferStipend}><span>Transfer-call stipend</span><strong>{TRANSFER_CALL_STIPEND}</strong></p>
          <p className={styles.nursingRate}>PHRN / APHRN regular rate: <strong>{NURSING_REGULAR_RATE}</strong></p>
        </div>
      </div>
    </section>
  </>;
}

export function BillingActivity() {
  return <section id="billing-activity" aria-labelledby="billing-title" className={styles.billingSection}>
    <div className={styles.shell}><p className={styles.eyebrow}>Fiscal-year reporting</p><h2 id="billing-title">Fiscal-Year Billing Activity</h2><p className={styles.sectionExplanation}>{BILLING_EXPLANATION}</p>
      <table className={styles.billingTable}><caption className={styles.srOnly}>Billing revenue and billable runs by fiscal year</caption>
        <thead><tr><th scope="col">Fiscal year</th><th scope="col">Billing revenue</th><th scope="col">Total billable runs</th><th scope="col">Interfacility transfers</th><th scope="col">Calculated non-transfer billable runs</th></tr></thead>
        <tbody>{BILLING_ROWS.map(r=><tr key={r.year}><th scope="row">FY {r.year}</th><td data-label="Billing revenue">{r.revenue}</td><td data-label="Total billable runs">{r.runs}</td><td data-label="Interfacility transfers">{r.transfers}</td><td data-label="Calculated non-transfer billable runs">{r.nonTransfer}</td></tr>)}</tbody>
      </table>
    </div>
  </section>;
}

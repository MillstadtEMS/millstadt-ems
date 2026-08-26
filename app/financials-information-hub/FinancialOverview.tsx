import { PAY_RATE_GROUPS, TRANSFER_CALL_STIPEND, NURSING_REGULAR_RATE } from "@/lib/financials-hub/transparency-content";
import BillingReports from "./BillingReports";
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

export function BillingActivity({ query = "" }: { query?: string }) {
  return <BillingReports query={query}/>;
}

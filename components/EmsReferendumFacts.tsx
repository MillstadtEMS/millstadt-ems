import Image from "next/image";
import {
  REVIEWED_PARCEL as parcel, PARCEL_COMPARISON as comparison,
  ILLUSTRATIVE_HALF_PERCENT as halfPercent, PLANNED_BUDGET as budget,
  FINANCIAL_RECORDS as financials,
  ESD_REVIEW_SOURCES as sources,
} from "@/lib/esd-fact-check";
import styles from "./EmsReferendumFacts.module.css";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const dollars = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const flyer = "/images/ems-tax-calculator/circulated-flyer-original.png";

export default function EmsReferendumFacts() {
  return (
    <>
      <section id="referendum-facts" className={styles.section} aria-labelledby="referendum-facts-title">
        <div className="wrap">
          <h2 id="referendum-facts-title" className={styles.title}>EMS Referendum</h2>
          <div className={styles.factsGrid}>
            <article className={styles.card}>
              <h3>What is on the ballot?</h3>
              <p>The November 3, 2026 ballot question asks whether to create Millstadt EMS ESD and authorize its base property-tax levy up to <strong>0.40%</strong>. Approval would authorize that rate; it would not require the board to levy the maximum.</p>
              <p>Our plan uses a <strong>0.30% total ESD property-tax rate with no separate IMRF levy added on top</strong>. Our proposed budget includes IMRF and other employer costs. The new district&apos;s board would adopt the actual levy within its legal authority.</p>
              <p><a href={sources.districtAct} target="_blank" rel="noopener noreferrer">Emergency Services Districts Act, sections 4, 5 and 11 ↗</a></p>
            </article>
            <article className={styles.card}>
              <h3>What happens to the existing ambulance levy?</h3>
              <p>In Millstadt Fire District, this calculator compares its certified 0.09% ambulance levy with the planned 0.30% ESD levy, assuming the existing ambulance levy is replaced. The difference is <strong>0.21 percentage points</strong>: $21 per year for every $10,000 of taxable value.</p>
              <p>For the included Hecker and Waterloo portions, the county&apos;s 2025 reports list no separate ambulance levy. We subtract no ambulance levy there, so the estimated increase is the full planned 0.30%: $30 per year for every $10,000 of taxable value. Other fire taxes are outside this comparison.</p>
              <p>Section 2 conditions overlapping ambulance service on a Fire District resolution to cease its ambulance levy and the ESD operating ambulance service in that territory. A vote alone does not establish the effective tax-bill year. Fire-protection taxes are separate.</p>
              <p><a href={sources.districtAct} target="_blank" rel="noopener noreferrer">Read section 2 and the transition conditions ↗</a></p>
            </article>
          </div>
          <details className={styles.details}>
            <summary>What does the funding plan show?</summary>
            <div>
              <p>Our current funding is not sustainable for the service we plan to provide. Our <a href={budget.source} target="_blank" rel="noopener noreferrer">proposed annual budget</a> covers personnel, medical supplies, ambulances, equipment, debt payments, and savings for future replacements.</p>
              <p><strong>These annual projections include property-tax revenue at the proposed 0.30% rate.</strong></p>
              <dl className={styles.budget}>
                <div><dt>Property-tax revenue at 0.30%, with 98% collection</dt><dd>{money(budget.taxRevenue)}</dd></div>
                <div><dt>Total projected revenue, including ambulance billing</dt><dd>{money(budget.totalRevenue)}</dd></div>
                <div><dt>Service costs before replacement savings</dt><dd>{money(budget.serviceCosts)}</dd></div>
                <div><dt>Projected gap before replacement savings</dt><dd>{money(budget.operatingGap)}</dd></div>
                <div><dt>Annual vehicle and equipment savings target</dt><dd>{money(budget.replacementSavings)}</dd></div>
                <div><dt>Projected gap including replacement savings</dt><dd>{money(budget.fullGap)}</dd></div>
              </dl>
            </div>
          </details>
          <div id="service-continuity" className={styles.serviceFacts}>
            <h3>Our funding and ambulance service</h3>
            <p>We fund our service through property taxes and ambulance billing. Our financial records below show changes in savings, overdue bills, and results from our latest completed audit.</p>
            <div className={styles.factsGrid}>
              <article className={styles.card}>
                <h4>Our money-market savings</h4>
                <dl className={styles.budget}>
                  <div><dt>January 31, 2023</dt><dd>{money(financials.moneyMarketStart)}</dd></div>
                  <div><dt>August 31, 2026</dt><dd>{money(financials.moneyMarketEnd)}</dd></div>
                  <div><dt>Reduction in this account</dt><dd>{money(financials.moneyMarketDecrease)}</dd></div>
                </dl>
                <p>This account decreased by about 93%. We used funds for payroll transfers and a $25,000 truck down payment. These balances cover <strong>our money-market account only</strong>.</p>
                <p><a href={`${financials.moneyMarketSource}#page=1`} target="_blank" rel="noopener noreferrer">Read the bank statements; comparison on pages 1–2 ↗</a></p>
              </article>
              <article className={styles.card}>
                <h4>Our bills and audit</h4>
                <p>Our September 30, 2026 proposed budget lists <strong>{money(financials.pastDue)} in past-due bills</strong>. We prioritized payroll, leaving certain vendors unpaid.</p>
                <p>Our latest completed audit covers the year ending April 30, 2025. We reported {dollars(financials.auditRevenue)} in revenue and {dollars(financials.auditExpenses)} in expenses, with a <strong>{dollars(financials.auditNetAssetIncrease)} increase in net assets</strong>. Our cash and cash equivalents totaled {dollars(financials.auditCash)} on that date.</p>
                <p>Net assets include more than cash. Our FY 2025–2026 audit is awaiting completion.</p>
                <p><a href={`${budget.source}#page=7`} target="_blank" rel="noopener noreferrer">Past-due bills, page 7 ↗</a> · <a href={`${financials.auditSource}#page=6`} target="_blank" rel="noopener noreferrer">Audit, PDF pages 6–8 ↗</a></p>
              </article>
            </div>
            <details className={styles.details}>
              <summary>Our billing collections</summary>
              <div>
                <p>Our August 13, 2026 collection report lists $441,847 collected against a $295,230 target for January through partial August. This reports collections for that period, rather than our current bank balance.</p>
                <p><a href="/financials-information-hub">View our financial records →</a></p>
              </div>
            </details>
            <div className={styles.factsGrid}>
              <article className={styles.card}>
                <h4>Could we reduce service or close?</h4>
                <p>If we cannot secure sufficient funding through the proposed district or another arrangement, we could have to reduce operations or close.</p>
                <p>A “Yes” vote would authorize the district and its base levy. A “No” vote would leave the proposed district unformed. Any service reduction or closure would depend on funding and operating decisions; it would not happen automatically because of the vote.</p>
              </article>
              <article className={styles.card}>
                <h4>Would the same local service be guaranteed?</h4>
                <p>Section 22(a)(3) of the Fire Protection District Act requires fire districts to cause ambulance service to be provided when adequate and continuing service does not exist.</p>
                <p>That requirement does not specify our organization, a station in Millstadt, or unchanged arrival times. A replacement service&apos;s arrangements would determine its staffing, location, and coverage.</p>
                <p><a href={sources.fireDistrictAct} target="_blank" rel="noopener noreferrer">Read the Fire District&apos;s statutory responsibilities ↗</a></p>
              </article>
            </div>
            <details className={styles.details}>
              <summary>What about outside ambulances and arrival times?</summary>
              <div>
                <p>An ambulance traveling from farther away or handling another call could take longer to arrive. Actual arrival times depend on vehicle locations, staffing, dispatch, and other calls; we cannot give a specific estimate for a future replacement service.</p>
                <p>Illinois EMS rules require documented coverage, response-time commitments, and written mutual-aid and backup arrangements.</p>
                <p><a href={sources.serviceRequirements} target="_blank" rel="noopener noreferrer">77 Ill. Admin. Code 515.810, including paragraphs (e), (f) and (h) ↗</a></p>
              </div>
            </details>
            <details className={styles.details}>
              <summary>Illinois ambulance-service requirements</summary>
              <div>
                <p>Illinois&apos; HB5133 proposes an essential-service designation and broader municipal and county obligations. As of October 2, 2026, its listed status is referred to committee, not enacted.</p>
                <p>The existing Fire District service responsibilities and Illinois EMS coverage rules still apply.</p>
                <p><a href={sources.essentialServiceBill} target="_blank" rel="noopener noreferrer">HB5133 legislative status ↗</a> · <a href={sources.fireDistrictAct} target="_blank" rel="noopener noreferrer">Current Fire Protection District Act ↗</a></p>
              </div>
            </details>
          </div>
          <details className={styles.details}>
            <summary>What territory is described?</summary>
            <div><p>The ballot question names the Millstadt Fire Protection District; the portion of the Hecker Fire Protection District in Millstadt Township, excluding its Prairie du Long Township portion; and the portion of the Waterloo Community Fire Protection District in St. Clair County. The Smithton Fire Protection District is not named in that description.</p><p>A mailing address alone does not establish membership. Use the certified district boundaries and County Clerk records to confirm a parcel. <a href="/election-information#county-voter-resources">View official voter resources →</a></p></div>
          </details>
        </div>
      </section>

      <section id="flyer-review" className={styles.section} aria-labelledby="flyer-review-title">
        <div className="wrap">
          <h2 id="flyer-review-title" className={styles.title}>Tax estimate in the opposition flyer</h2>
          <p className={styles.intro}>People opposing the referendum are distributing this flyer with a handwritten $424 annual estimate. Below is a comparison with the county&apos;s property record and the planned 0.30% rate.</p>
          <div className={styles.reviewGrid}>
            <figure className={styles.figure}>
              <a href={flyer} target="_blank" rel="noopener noreferrer" aria-label="Open the original flyer photograph" className={styles.photoFrame}>
                <Image src={flyer} alt="Circulated Millstadt ambulance referendum flyer with a handwritten annual cost of $424 for 305 Traver Tine." width={1170} height={2532} sizes="(max-width: 800px) 100vw, 420px" className={styles.photo} />
              </a>
              <figcaption><a href={flyer} target="_blank" rel="noopener noreferrer">View the full photograph ↗</a></figcaption>
            </figure>
            <div>
              <p className={styles.kicker}>Tax year {parcel.taxYear} · payable {parcel.payableYear}</p>
              <h3 className={styles.address}>{parcel.address}</h3>
              <p className={styles.parcel}>Parcel {parcel.parcel}</p>
              <div className={styles.valueLine}><span>{dollars(parcel.eav)} EAV</span><span>− {dollars(parcel.exemptions)} exemptions</span><strong>= {dollars(parcel.taxableValue)} taxable value</strong></div>
              <p className={styles.note}>The county record lists three granted exemption amounts: $6,000 + $5,000 + $2,000 = {dollars(parcel.exemptions)}. These apply to this property for {parcel.taxYear}; they are not an amount everyone receives. The county separately lists {dollars(parcel.taxableValue)} as the net taxable value used below. <a href={`${parcel.source}#Exemptions5`} target="_blank" rel="noopener noreferrer">See the county&apos;s exemption amounts ↗</a></p>
              <div className={styles.finding}>
                <h4>What does the $424 estimate represent?</h4>
                <p>{dollars(parcel.taxableValue)} × 0.004 = <strong>{money(comparison.ceiling)}</strong>, which rounds to $424. The amount written on the flyer matches the <strong>full levy at 0.40%</strong>, using the value after exemptions. Its authors did not include their calculation, so this is a numerical match, not confirmation of their method.</p>
                <p>It is not the net increase under the 0.30% plan. At that rate, the estimated new levy is <strong>{money(comparison.after)}</strong>. Subtract the current 0.09% amount of <strong>{money(comparison.before)}</strong> to get the estimated increase.</p>
              </div>
              <div className={styles.increase}>
                <span>Estimated increase at the planned 0.30% rate</span>
                <strong>{money(comparison.increase)}<small> / year</small></strong>
                <p>{money(comparison.monthlyIncrease)} per month equivalent</p>
              </div>
              <p className={styles.note}>This holds the 2025 taxable value constant, assumes the existing 0.09% levy ends, and excludes any separate additional levies. It is a rate comparison, not a guaranteed future tax bill. <a href={parcel.source} target="_blank" rel="noopener noreferrer">Verify the county record ↗</a></p>
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption>Annual EMS tax for this property</caption>
              <thead><tr><th scope="col">Scenario</th><th scope="col">Annual EMS levy</th><th scope="col">Increase over 0.09%</th></tr></thead>
              <tbody>
                <tr><th scope="row">0.09% current ambulance portion</th><td>{money(comparison.before)}</td><td>—</td></tr>
                <tr className={styles.plannedRow}><th scope="row">0.30% planning rate</th><td>{money(comparison.after)}</td><td>{money(comparison.increase)}</td></tr>
                <tr><th scope="row">0.40% ballot base-levy limit</th><td>{money(comparison.ceiling)}</td><td>{money(comparison.ceilingIncrease)}</td></tr>
                <tr><th scope="row">0.50% illustration from the flyer*</th><td>{money(halfPercent.annual)}</td><td>{money(halfPercent.increase)}</td></tr>
              </tbody>
            </table>
          </div>
          <p className={styles.note}>*The 0.50% row illustrates the flyer&apos;s separate combined-rate scenario. It is not an adopted rate, a verified forecast, or a legal ceiling. Annual amounts are rounded to cents before subtraction.</p>
          <div className={styles.factsGrid}>
            <article className={styles.card}>
              <h3>Is an extra IMRF tax part of the 0.30% plan?</h3>
              <p><strong>No. Our plan does not add a separate IMRF levy on top of 0.30%.</strong> Our proposed budget includes IMRF, payroll taxes, workers&apos; compensation, and insurance, with no separate add-on property-tax revenue for those costs.</p>
              <p>Illinois law authorizes certain separate levies, subject to eligibility and district action. IMRF&apos;s guidance also allows transfers from other operating funds. Legal authority to levy an additional tax does not mean the agency plans to use it.</p>
              <p>Our plan uses 0.30% in total. The flyer&apos;s 0.50% scenario assumes additional taxes; the cited law does not impose an automatic 0.10% surcharge. The future board would determine actual levies within its legal authority, which includes certain separate levies beyond the ballot&apos;s 0.40% base limit.</p>
              <p className={styles.sources}><a href={budget.source} target="_blank" rel="noopener noreferrer">EMS budget</a> · <a href={sources.imrf} target="_blank" rel="noopener noreferrer">40 ILCS 5/7-171</a> · <a href={sources.imrfManual} target="_blank" rel="noopener noreferrer">IMRF funding guidance</a> · <a href={sources.socialSecurity} target="_blank" rel="noopener noreferrer">Social Security/Medicare authority</a> · <a href={sources.liability} target="_blank" rel="noopener noreferrer">Liability authority</a></p>
            </article>
            <article className={styles.card}>
              <h3>What about the Fire District&apos;s 0.25%?</h3>
              <p>The county&apos;s 2025 computation report lists <strong>0.0900%</strong> as the actual ambulance-fund rate and <strong>0.2500%</strong> as its maximum. That supports the flyer&apos;s reference to existing taxing capacity.</p>
              <p>Available taxing authority does not mean an increase has been approved, that a request will be granted, or that a particular service plan will be fully funded. Those are separate decisions requiring supporting records.</p>
              <p>Seeking competitive bids is also a separate policy choice. The flyer provides no awarded contract or comparable bid prices establishing a cost saving.</p>
              <p><a href={sources.countyRates} target="_blank" rel="noopener noreferrer">County tax computation report, page 57 ↗</a></p>
            </article>
          </div>
          <p className={styles.footer}>County values checked October 2, 2026. Final rates, transition dates, assessments, and exemptions determine actual bills.</p>
        </div>
      </section>
    </>
  );
}

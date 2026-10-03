"use client";

import { useState } from "react";
import { calculateEmsTax, EMS_TAX_AREAS, type TaxArea, type TaxInput } from "@/lib/esd-tax";
import styles from "./EmsTaxCalculator.module.css";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const money = (value: number | null | undefined) => value == null ? "—" : currency.format(value);
const COUNTY_RATES = "https://www.co.st-clair.il.us/webdocuments/departments/countyclerk/taxextensions/2025%20Tax%20Computation%20Reports.pdf#page=57";
const ACT = "https://www.ilga.gov/Legislation/ILCS/Articles?ActID=959&Chapter=SPECIAL+DISTRICTS&ChapterID=15&MajorTopic=GOVERNMENT";

export default function EmsTaxCalculator() {
  const [area, setArea] = useState<TaxArea | "">("");
  const selectedArea = EMS_TAX_AREAS.find(option => option.id === area);
  const offsetLabel = selectedArea ? `${(selectedArea.offsetUnits / 100).toFixed(2)}%` : "—";
  const differenceLabel = selectedArea ? ((30 - selectedArea.offsetUnits) / 100).toFixed(2) : "—";
  const [mode, setMode] = useState<TaxInput["mode"]>("home");
  const [showHelp, setShowHelp] = useState(false);
  const [homeValue, setHomeValue] = useState("300,000");
  const [exemptions, setExemptions] = useState("6,000");
  const [multiplier, setMultiplier] = useState("1.000000");
  const [eavValue, setEavValue] = useState("");
  const [eavExemptions, setEavExemptions] = useState("");
  const [taxableValue, setTaxableValue] = useState("");
  let result: ReturnType<typeof calculateEmsTax> | null = null;
  let error = "";
  try {
    if (area) result = calculateEmsTax(mode === "home"
      ? { area, mode, homeValue, exemptions, multiplier }
      : mode === "eav"
        ? { area, mode, eav: eavValue, exemptions: eavExemptions }
        : { area, mode, taxableValue });
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Check the amounts entered.";
  }

  return (
    <section id="ems-tax-calculator" className={styles.section} aria-labelledby="ems-tax-title">
      <div className="wrap">
        <header className={styles.header}>
          <div>
            <h2 id="ems-tax-title">EMS Tax Calculator</h2>
            <p className={styles.lead}>Choose your fire tax district, then enter your property value to estimate the change.</p>
          </div>
          <div className={styles.rateNote}>
            <p><strong>{offsetLabel}</strong> existing ambulance levy offset</p>
            <p><strong>0.30%</strong> planned total EMS rate</p>
            <small>Our plan adds no separate IMRF levy.</small>
          </div>
        </header>

        <div className={styles.calculator}>
          <div className={styles.inputs}>
            <label htmlFor="ems-tax-area">Fire tax district</label>
            <select id="ems-tax-area" className={styles.areaSelect} value={area} onChange={e => setArea(EMS_TAX_AREAS.find(option => option.id === e.target.value)?.id ?? "")} aria-describedby="ems-area-help">
              <option value="">Choose your fire tax district</option>
              {EMS_TAX_AREAS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
            <p id="ems-area-help" className={styles.help}>Use the fire district listed on your <a href="https://stclairil.devnetwedge.com/" target="_blank" rel="noopener noreferrer">county property record</a>. Your mailing address alone does not identify it. If you are unsure, confirm the district before choosing.</p>
            <div className={styles.areaDivider} />
            <div className={styles.inputHeading}>
              <h3>Property value</h3>
              <button type="button" className={styles.helpButton} aria-expanded={showHelp} aria-controls="ems-value-guide" onClick={() => setShowHelp(open => !open)}><span aria-hidden="true">?</span> How to use</button>
            </div>
            <div id="ems-value-guide" className={styles.valueGuide} hidden={!showHelp}>
              <h4>Which value do I enter?</h4>
              <dl>
                <div><dt>Home value</dt><dd>Use what your home and land together might sell for. We estimate one-third of that value, apply the equalization factor, then subtract the exemptions you enter. The filled-in amounts are examples.</dd></div>
                <div><dt>EAV</dt><dd>Use the county&apos;s equalized assessed value <strong>before exemptions</strong>. Enter the approved exemptions for the same tax year. We subtract them once. EAV has already been adjusted, so we do not divide it by three or apply another factor.</dd></div>
                <div><dt>My tax bill</dt><dd>Use the county&apos;s <strong>net taxable value after exemptions</strong>. We use that number directly. Do not enter the dollars you owe in taxes or subtract exemptions again.</dd></div>
              </dl>
              <p>For example: $300,000 home value ÷ 3 = $100,000 EAV. With a 1.0 equalization factor and $6,000 in exemptions, the taxable value is $94,000.</p>
              <p>If your record says “net EAV” or “taxable EAV,” check whether exemptions have already been deducted. If they have, choose My tax bill.</p>
              <a href="https://stclairil.devnetwedge.com/" target="_blank" rel="noopener noreferrer">Find your county property record ↗</a>
            </div>
            <p className={styles.help}>{mode === "home" ? "Example values are filled in. Replace them with your own." : mode === "eav" ? "Enter EAV before exemptions and the approved exemptions for the same tax year." : "Enter the net taxable value after exemptions from your property tax bill."}</p>
            <div className={styles.modeSwitch} role="group" aria-label="Choose how to enter your property value">
              <button type="button" aria-pressed={mode === "home"} onClick={() => setMode("home")}>Home value</button>
              <button type="button" aria-pressed={mode === "eav"} onClick={() => setMode("eav")}>EAV</button>
              <button type="button" aria-pressed={mode === "bill"} onClick={() => setMode("bill")}>My tax bill</button>
            </div>
            {mode === "home" ? (
              <>
                <label htmlFor="ems-home-value">Full home value <span>(home + land)</span></label>
                <div className={styles.moneyInput}><span aria-hidden="true">$</span><input id="ems-home-value" inputMode="decimal" maxLength={24} value={homeValue} onChange={e => setHomeValue(e.target.value)} aria-describedby="ems-home-help ems-input-error" /></div>
                <p id="ems-home-help" className={styles.help}>What your whole property might sell for. Use the assessor&apos;s full market value if you have it. This is not your mortgage balance.</p>
                <label htmlFor="ems-exemptions">Total exemptions <span>(from your bill)</span></label>
                <div className={styles.moneyInput}><span aria-hidden="true">$</span><input id="ems-exemptions" inputMode="decimal" maxLength={24} value={exemptions} onChange={e => setExemptions(e.target.value)} aria-describedby="ems-exemptions-help ems-input-error" /></div>
                <p id="ems-exemptions-help" className={styles.help}>The $6,000 shown is a homeowner example. Enter your approved total, including any other exemptions, or 0 for none. These reduce the value taxed.</p>
                <details className={styles.factor}>
                  <summary>Equalization factor · {multiplier || "enter a value"}</summary>
                  <label htmlFor="ems-factor">Equalization factor</label>
                  <input id="ems-factor" inputMode="decimal" maxLength={12} value={multiplier} onChange={e => setMultiplier(e.target.value)} aria-describedby="ems-factor-help ems-input-error" />
                  <p id="ems-factor-help" className={styles.help}>1.000000 means no adjustment. It is the starting assumption here, not a promise for a future year. If you have your final taxable value, use “My tax bill” instead.</p>
                </details>
              </>
            ) : mode === "eav" ? (
              <>
                <label htmlFor="ems-eav-value">EAV <span>(before exemptions)</span></label>
                <div className={styles.moneyInput}><span aria-hidden="true">$</span><input id="ems-eav-value" inputMode="decimal" maxLength={24} value={eavValue} onChange={e => setEavValue(e.target.value)} aria-describedby="ems-eav-help ems-input-error" /></div>
                <p id="ems-eav-help" className={styles.help}>The county&apos;s equalized assessed value of your property before exemptions. Enter it as printed; it has already been adjusted.</p>
                <label htmlFor="ems-eav-exemptions">Total approved exemptions <span>(same tax year)</span></label>
                <div className={styles.moneyInput}><span aria-hidden="true">$</span><input id="ems-eav-exemptions" inputMode="decimal" maxLength={24} value={eavExemptions} onChange={e => setEavExemptions(e.target.value)} aria-describedby="ems-eav-exemptions-help ems-input-error" /></div>
                <p id="ems-eav-exemptions-help" className={styles.help}>Add the granted exemption amounts from your county record. Enter 0 if none apply. We subtract this total from your EAV once.</p>
              </>
            ) : (
              <>
                <label htmlFor="ems-taxable-value">Taxable value after exemptions</label>
                <div className={styles.moneyInput}><span aria-hidden="true">$</span><input id="ems-taxable-value" inputMode="decimal" maxLength={24} value={taxableValue} onChange={e => setTaxableValue(e.target.value)} aria-describedby="ems-bill-help ems-input-error" /></div>
                <p id="ems-bill-help" className={styles.help}>Use the final assessed value used to calculate tax, after all exemptions. Do not enter your tax bill amount or full home value. Do not subtract exemptions again.</p>
                <p className={styles.help}>This is the more precise option for your chosen tax year, including a senior assessment freeze or special assessment. It does not predict next year&apos;s value.</p>
                <a className={styles.inputLink} href="https://www.co.st-clair.il.us/departments/assessor" target="_blank" rel="noopener noreferrer">Find county property records ↗</a>
              </>
            )}
            <div className={styles.fixedRate}>
              <div><span>2025 ambulance levy offset</span><strong>{offsetLabel}</strong></div>
              <p>{area === "millstadt" ? "Millstadt Fire District’s certified ambulance rate is 0.09%. We subtract that amount, assuming this levy is replaced." : area ? "The county’s 2025 report lists no separate ambulance levy for this fire district. We deduct no ambulance levy; other fire taxes are outside this comparison." : "Choose your fire tax district above. The applicable rate is fixed, so you do not need to enter it."}</p>
            </div>
            <p id="ems-input-error" className={styles.error} role="alert">{error}</p>
          </div>

          <div className={styles.results} aria-live="polite" aria-atomic="true">
            <div className={styles.resultHeading}><h3>Your estimated EMS tax</h3><span>Per year</span></div>
            <p className={styles.resultIntro}>{selectedArea ? <>For {selectedArea.label}, based on <strong>{money(result?.taxableValue)}</strong> of taxable value after exemptions.</> : "Choose your fire tax district to see your estimate."}</p>
            <div className={styles.comparison}>
              <div className={styles.taxCard}>
                <p>{area === "millstadt" ? "Before · ambulance levy" : "Existing levy offset"}</p><strong>{money(result?.before)}</strong>
                <span>{selectedArea ? `at ${offsetLabel}` : "Choose your district"}</span>
              </div>
              <div className={`${styles.taxCard} ${styles.afterCard}`}>
                <p>After · planned</p><strong>{money(result?.after)}</strong><span>at 0.30%</span>
              </div>
            </div>
            <div className={styles.increase}>
              <div><span>Estimated increase</span><strong>{money(result?.increase)}<small> / year</small></strong></div>
              <p>{money(result?.monthlyIncrease)}<span> / month equivalent</span></p>
            </div>
            <div className={styles.differenceMath}>
              <strong>How the increase is calculated</strong>
              {selectedArea && <p>0.30% planned − {offsetLabel} existing levy offset = <b>{differenceLabel} percentage points</b>.</p>}
              {result && <p>{money(result.after)} − {money(result.before)} = <b>{money(result.increase)} more per year</b>.</p>}
              <p>{area === "millstadt" ? "For Millstadt Fire District, this replaces the existing 0.09% ambulance levy with the planned 0.30% ESD levy." : area ? "With no separate ambulance levy to deduct for the selected district, the estimated increase equals the full planned 0.30% ESD levy." : "The existing ambulance levy offset depends on your fire tax district."}</p>
            </div>
            <p className={styles.resultHelp}>This compares the planned ESD levy with the identified ambulance levy for your selected district, holding taxable value constant. Millstadt’s offset assumes its existing ambulance levy ends when the ESD levy starts. Other taxes and changes in value are outside this estimate. <a href="#referendum-facts">Read the transition conditions and funding facts.</a></p>
            {result?.exemptionsExceedEav && <p className={styles.notice}>The exemptions entered exceed the {mode === "home" ? "estimated" : "entered"} EAV. Taxable value is set to $0. Check your approved exemptions on the tax bill.</p>}
          </div>
        </div>

        <div className={styles.explainer}>
          <div className={styles.explainerIntro}><h3>Home value, EAV and taxable value</h3></div>
          <div className={styles.steps}>
            <div><span className={styles.stepNumber}>1</span><h4>Full home value</h4><strong>{mode === "home" ? money(result?.homeValue) : "What it might sell for"}</strong><p>The price your home and land might sell for together. This calculator estimates from the amount you enter; it does not appraise your home.</p></div>
            <div><span className={styles.stepNumber}>2</span><h4>Equalized assessed value</h4><strong>{mode !== "bill" ? money(result?.eav) : "EAV, before exemptions"}</strong><p>“EAV” is the smaller value used to start the tax math. For a typical home, start with one-third of its full value. A tax adjustment called equalization can change that number.</p></div>
            <div><span className={styles.stepNumber}>3</span><h4>Taxable value</h4><strong>{money(result?.taxableValue)}</strong><p>Subtract approved exemptions from EAV. What is left is the value these tax rates apply to. An exemption lowers this value, not the tax bill dollar for dollar.</p></div>
          </div>
        </div>

        <div className={styles.detailsGrid}>
          <details className={styles.details}>
            <summary>Show the calculation</summary>
            <div>
              {mode === "home" ? <p>Full value ÷ 3 × equalization factor − exemptions = taxable value (minimum $0).</p> : mode === "eav" ? <p>EAV − approved exemptions = taxable value (minimum $0). EAV already includes equalization, so we do not divide by 3 or apply another factor.</p> : <p>Your tax-bill value is already after equalization and exemptions. It is used directly, without dividing by 3 or subtracting exemptions again.</p>}
              <p><b>Existing levy offset:</b> {selectedArea ? `taxable value × ${selectedArea.offsetUnits === 9 ? "0.0009" : "0"} = ${money(result?.before)}` : "Choose your fire tax district."}</p>
              <p><b>After:</b> taxable value × 0.003 = {money(result?.after)}</p>
              <p><b>Increase:</b> after − before = {money(result?.increase)}</p>
              {selectedArea && <p>The rate difference is <b>{differenceLabel} percentage points</b>: ${30 - selectedArea.offsetUnits} more per year for each $10,000 of taxable value.</p>}
              <p>Millstadt’s 0.09% ambulance rate means $0.09 per $100 of taxable value; the planned 0.30% means $0.30 per $100. Annual taxes are rounded separately to cents, then subtracted. Monthly figures divide the annual increase by 12; they are not a payment schedule. Intermediate values display rounded cents but retain full precision in the calculation.</p>
            </div>
          </details>
          <details className={styles.details}>
            <summary>Who this estimate is for</summary>
            <div>
              <p>Use this estimate only for property within the proposed Millstadt EMS ESD. A mailing address or service call does not establish tax-district membership.</p>
              <p>The ballot question describes the Millstadt Fire Protection District, the Hecker Fire Protection District portion in Millstadt Township (excluding its Prairie du Long Township portion), and the Waterloo Community Fire Protection District portion in St. Clair County.</p>
              <p>The 0.09% existing ambulance levy applies to Millstadt Fire District. For the included Hecker and Waterloo portions, the county&apos;s 2025 reports identify no separate ambulance levy, so no ambulance levy is deducted. The County Clerk can confirm your parcel&apos;s taxing-district membership.</p>
              <p>A home-value estimate is for an ordinary residential property. For a senior freeze, farmland, special assessments, or a fully exempt property, use the approved taxable value from the tax bill. A senior assessment freeze does not freeze the tax rate.</p>
            </div>
          </details>
          <details className={styles.details}>
            <summary>Sources &amp; assumptions</summary>
            <div>
              <p><a href={COUNTY_RATES} target="_blank" rel="noopener noreferrer">St. Clair County 2025 Tax Computation Report, page 57</a>: the FDMI / 064 AMBULANCE line lists an actual and certified rate of 0.0900%. <a href={COUNTY_RATES.replace("#page=57", "#page=53")} target="_blank" rel="noopener noreferrer">Hecker, page 53</a>, and <a href={COUNTY_RATES.replace("#page=57", "#page=72")} target="_blank" rel="noopener noreferrer">Waterloo, page 72</a>, list no separate ambulance fund; their modeled ambulance levy offset is 0%.</p>
              <p><a href="https://www.co.st-clair.il.us/Departments/Assessor/FAQ" target="_blank" rel="noopener noreferrer">St. Clair County Assessor FAQ</a>: market value, assessed value, equalization, and exemptions.</p>
              <p><a href="https://tax.illinois.gov/localgovernments/property/taxrelief.html" target="_blank" rel="noopener noreferrer">Illinois Department of Revenue exemption guide</a>: the general homestead exemption in St. Clair County is up to $6,000 for eligible property. Eligibility and approved amounts vary.</p>
              <p><a href={ACT} target="_blank" rel="noopener noreferrer">70 ILCS 2005, sections 2, 4, and 11</a>: district formation, the organizational referendum, the assessed-value tax base, and the existing ambulance levy transition.</p>
              <p>Our comparison uses the identified 2025 ambulance levy for the selected fire district and our planned 0.30% rate, assuming Millstadt&apos;s existing ambulance levy is replaced. The ballot question authorizes a base levy up to 0.40%. The adopted levy and the county&apos;s tax extension determine the billed rate.</p>
              <p>Sources reviewed October 2, 2026. This is an estimate, not a county tax bill or a guarantee of future taxes. Changes to assessments, exemptions, other taxes, levy amounts, and timing are outside this comparison.</p>
            </div>
          </details>
          <details className={styles.details}>
            <summary>Read the ballot information</summary>
            <div>
              <p>The question asks voters whether to organize Millstadt EMS ESD and authorize a property tax not exceeding 0.40%. The planned 0.30% rate used here is below that limit.</p>
              <p><a href="/election-information#county-voter-resources">View election information and official county voter resources →</a></p>
            </div>
          </details>
        </div>
        <p className={styles.footer}>Your actual tax bill depends on your parcel, approved exemptions, and the rate extended by the county.</p>
      </div>
    </section>
  );
}

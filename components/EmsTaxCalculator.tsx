"use client";

import { useState } from "react";
import { calculateEmsTax, EMS_TAX_AREAS, type TaxArea, type TaxInput } from "@/lib/esd-tax";
import styles from "./EmsTaxCalculator.module.css";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const money = (value: number) => currency.format(value);
const COUNTY_RATES = "https://www.co.st-clair.il.us/webdocuments/departments/countyclerk/taxextensions/2025%20Tax%20Computation%20Reports.pdf";

export default function EmsTaxCalculator() {
  const [area, setArea] = useState<TaxArea | "">("");
  const [mode, setMode] = useState<TaxInput["mode"]>("bill");
  const [showHelp, setShowHelp] = useState(false);
  const [homeValue, setHomeValue] = useState("");
  const [exemptions, setExemptions] = useState("");
  const [multiplier, setMultiplier] = useState("1.000000");
  const [eavValue, setEavValue] = useState("");
  const [eavExemptions, setEavExemptions] = useState("");
  const [taxableValue, setTaxableValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const selectedArea = EMS_TAX_AREAS.find(option => option.id === area);
  let result: ReturnType<typeof calculateEmsTax> | null = null;
  let error = "";
  if (submitted) {
    try {
      if (!area) throw new Error("Choose the fire district on your tax bill, or use Find your address above.");
      result = calculateEmsTax(mode === "home"
        ? { area, mode, homeValue, exemptions, multiplier }
        : mode === "eav"
          ? { area, mode, eav: eavValue, exemptions: eavExemptions }
          : { area, mode, taxableValue });
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "Check the amounts entered.";
    }
  }

  return <section id="ems-tax-calculator" className={styles.section} aria-labelledby="ems-tax-title">
    <div className={`wrap ${styles.content}`}>
      <h2 id="ems-tax-title">EMS Tax Calculator</h2>
      <div className={styles.lookup}>
        <p>Find your address to see your EMS tax now, your tax with the ESD, and the yearly increase.</p>
        <a className={styles.primary} href="/election-information/address-directory">Find your address <span aria-hidden="true">→</span></a>
        <p className={styles.help}>Your county property information is already filled in.</p>
      </div>

      <details className={styles.manual}>
        <summary>Or enter a property value</summary>
        <form className={styles.form} onSubmit={event => { event.preventDefault(); setSubmitted(true); }}>
          <label htmlFor="ems-tax-area">Fire district on your tax bill</label>
          <select id="ems-tax-area" value={area} onChange={event => { setArea(EMS_TAX_AREAS.find(option => option.id === event.target.value)?.id ?? ""); setSubmitted(false); }} aria-describedby="ems-area-help">
            <option value="">Choose your fire district</option>
            {EMS_TAX_AREAS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
          <p id="ems-area-help" className={styles.help}>Not sure? <a href="/election-information/address-directory">Find your address</a> and we will use the county record.</p>

          <div className={styles.valueHeading}>
            <h3>Which value do you have?</h3>
            <button className={styles.helpButton} type="button" aria-expanded={showHelp} aria-controls="ems-value-guide" onClick={() => setShowHelp(open => !open)}>How to use</button>
          </div>
          <div className={styles.modes} role="group" aria-label="Choose how to enter your property value">
            <button type="button" aria-pressed={mode === "bill"} onClick={() => { setMode("bill"); setSubmitted(false); }}>Tax bill value</button>
            <button type="button" aria-pressed={mode === "home"} onClick={() => { setMode("home"); setSubmitted(false); }}>Home value</button>
            <button type="button" aria-pressed={mode === "eav"} onClick={() => { setMode("eav"); setSubmitted(false); }}>EAV</button>
          </div>
          <div id="ems-value-guide" hidden={!showHelp} className={styles.guide}>
            {mode === "bill" ? <p>Find the <strong>net taxable value after exemptions</strong> on your tax bill or county record. Copy that number. Do not enter the amount you owe in taxes.</p>
              : mode === "home" ? <p>Enter what your home and land together might sell for. We start with one-third of that amount and subtract the tax breaks you enter. This gives a rough estimate.</p>
                : <p><strong>EAV</strong> means equalized assessed value. It is the smaller property value the county uses to start the tax math. Enter the EAV before tax breaks, then enter those tax breaks below.</p>}
            <p>A tax break is called an <strong>exemption</strong>. It lowers the part of your property value that gets taxed. Use your approved amounts; enter 0 if none apply.</p>
            <p>If your record says <strong>net EAV</strong> or <strong>taxable EAV</strong> and already subtracts exemptions, choose Tax bill value.</p>
            <a href="https://stclairil.devnetwedge.com/" target="_blank" rel="noopener noreferrer">Find your county property record</a>
          </div>

          {mode === "bill" ? <>
            <label htmlFor="ems-taxable-value">Taxable value after exemptions</label>
            <div className={styles.moneyInput}><span aria-hidden="true">$</span><input id="ems-taxable-value" inputMode="decimal" maxLength={24} value={taxableValue} onChange={event => setTaxableValue(event.target.value)} aria-describedby="ems-bill-help ems-input-error" /></div>
            <p id="ems-bill-help" className={styles.help}>Use the net taxable value on your bill. Tax breaks have already been subtracted.</p>
          </> : mode === "home" ? <>
            <label htmlFor="ems-home-value">Home value <span>(home + land)</span></label>
            <div className={styles.moneyInput}><span aria-hidden="true">$</span><input id="ems-home-value" inputMode="decimal" maxLength={24} value={homeValue} onChange={event => setHomeValue(event.target.value)} aria-describedby="ems-home-help ems-input-error" /></div>
            <p id="ems-home-help" className={styles.help}>What your whole property might sell for.</p>
            <label htmlFor="ems-exemptions">Tax breaks <span>(total exemptions)</span></label>
            <div className={styles.moneyInput}><span aria-hidden="true">$</span><input id="ems-exemptions" inputMode="decimal" maxLength={24} value={exemptions} onChange={event => setExemptions(event.target.value)} aria-describedby="ems-exemptions-help ems-input-error" /></div>
            <p id="ems-exemptions-help" className={styles.help}>Copy the total approved exemptions from your bill. Enter 0 for none.</p>
            <details className={styles.helpDetails}>
              <summary>County adjustment factor</summary>
              <label htmlFor="ems-factor">Equalization factor</label>
              <input id="ems-factor" className={styles.factorInput} inputMode="decimal" maxLength={12} value={multiplier} onChange={event => setMultiplier(event.target.value)} aria-describedby="ems-factor-help ems-input-error" />
              <p id="ems-factor-help">The estimate starts at 1.0, which means no adjustment. Enter the county factor for your tax year if different. For a senior freeze, farmland or another special assessment, use Tax bill value instead.</p>
            </details>
          </> : <>
            <label htmlFor="ems-eav-value">EAV before exemptions</label>
            <div className={styles.moneyInput}><span aria-hidden="true">$</span><input id="ems-eav-value" inputMode="decimal" maxLength={24} value={eavValue} onChange={event => setEavValue(event.target.value)} aria-describedby="ems-eav-help ems-input-error" /></div>
            <p id="ems-eav-help" className={styles.help}>Copy the county’s equalized assessed value before tax breaks.</p>
            <label htmlFor="ems-eav-exemptions">Tax breaks <span>(total exemptions)</span></label>
            <div className={styles.moneyInput}><span aria-hidden="true">$</span><input id="ems-eav-exemptions" inputMode="decimal" maxLength={24} value={eavExemptions} onChange={event => setEavExemptions(event.target.value)} aria-describedby="ems-eav-exemptions-help ems-input-error" /></div>
            <p id="ems-eav-exemptions-help" className={styles.help}>Use approved exemptions for the same year. Enter 0 for none.</p>
          </>}
          <button className={styles.calculate} type="submit">Show my estimate</button>
          <p id="ems-input-error" className={styles.error} role="alert">{error}</p>
        </form>

        {result && <div className={styles.results} aria-live="polite" aria-atomic="true">
          <h3>Your estimated yearly EMS tax</h3>
          <dl className={styles.amounts}>
            <div><dt>EMS tax now</dt><dd>{money(result.before)}</dd></div>
            <div><dt>With the ESD (0.30%)</dt><dd>{money(result.after)}</dd></div>
            <div className={styles.increase}><dt>Yearly increase</dt><dd>{money(result.increase)}</dd></div>
          </dl>
          <p className={styles.help}>About {money(result.monthlyIncrease)} more per month.</p>
          {area !== "millstadt" && <p className={styles.help}>The county lists no separate ambulance levy for this fire district, so the comparison starts at $0.</p>}
          {result.exemptionsExceedEav && <p className={styles.error}>The tax breaks entered are larger than the EAV. Check those amounts. Taxable value is shown as $0.</p>}
          <details className={styles.helpDetails}>
            <summary>How we figured this</summary>
            {mode === "home" && <p>{money(result.homeValue!)} home value ÷ 3 × {multiplier} county factor = {money(result.eav!)} EAV.</p>}
            {mode !== "bill" && <p>{money(result.eav!)} EAV − {money(result.exemptions!)} exemptions = {money(result.taxableValue)} taxable value, with a minimum of $0.</p>}
            {mode === "bill" && <p>Your {money(result.taxableValue)} net taxable value is used directly. Exemptions are not subtracted again.</p>}
            <p>Current comparison: {money(result.taxableValue)} × {selectedArea?.offsetUnits === 9 ? "0.0009" : "0"} = {money(result.before)}.</p>
            <p>Planned ESD tax: {money(result.taxableValue)} × 0.003 = {money(result.after)}.</p>
            <p>Yearly increase: {money(result.after)} − {money(result.before)} = {money(result.increase)}.</p>
            <p>Each yearly tax is rounded to cents before subtraction. The monthly amount is the yearly increase divided by 12, not a payment schedule.</p>
          </details>
        </div>}
      </details>

      <details className={styles.helpDetails}>
        <summary>About these estimates</summary>
        <p>We use the planned 0.30% ESD rate. Our plan adds no separate IMRF levy. For Millstadt Fire District, the comparison replaces the existing 0.09% ambulance levy.</p>
        <p>The county’s 2025 report lists Millstadt’s 0.09% ambulance levy on <a href={`${COUNTY_RATES}#page=57`} target="_blank" rel="noopener noreferrer">page 57</a>. The <a href={`${COUNTY_RATES}#page=53`} target="_blank" rel="noopener noreferrer">Hecker</a> and <a href={`${COUNTY_RATES}#page=72`} target="_blank" rel="noopener noreferrer">Waterloo</a> pages list no separate ambulance levy. The address lookup uses the district in your county record.</p>
        <p>Use these estimates for property inside the proposed ESD. A mailing address alone does not establish the tax district. A future bill can change with property values, exemptions and the adopted tax rate. Other taxes are outside this comparison.</p>
        <p><a href="https://www.co.st-clair.il.us/Departments/Assessor/FAQ" target="_blank" rel="noopener noreferrer">County property-value guide</a> · <a href="https://tax.illinois.gov/localgovernments/property/taxrelief.html" target="_blank" rel="noopener noreferrer">Illinois exemption guide</a> · <a href="#referendum-facts">Referendum facts and ballot language</a></p>
      </details>
    </div>
  </section>;
}

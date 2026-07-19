"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MODELED_LEVY_RATES,
  buildLevyScenario,
  calculateReferendum,
} from "@/lib/board/financialData/referendum/levyCalculations";

const money0 = (n: number | null | undefined) => n == null || Number.isNaN(n)
  ? "-"
  : n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const money2 = (n: number | null | undefined) => n == null || Number.isNaN(n)
  ? "-"
  : n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const number0 = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

function parseCurrencyInput(value: string): number {
  const parsed = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseRate(value: string): number {
  const parsed = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function initialRate(currentScenario: string | null): string {
  const match = currentScenario?.match(/([\d.]+)\s*%/);
  return match?.[1] ?? "0.30";
}

export default function LevyCalculator({
  eav,
  currentScenario,
  currentLevyRevenue,
  totalProjectedAnnualNeed,
  requiredRevenue,
  initialPropertyMarketValue,
  canSaveModelValue,
}: {
  eav: number;
  currentScenario: string | null;
  currentLevyRevenue: number;
  totalProjectedAnnualNeed: number;
  requiredRevenue: number;
  initialPropertyMarketValue: number;
  canSaveModelValue: boolean;
}) {
  const router = useRouter();
  const [savedEav, setSavedEav] = useState(eav);
  const [draftEav, setDraftEav] = useState(number0(eav));
  const [draftRate, setDraftRate] = useState(initialRate(currentScenario));
  const [draftPropertyValue, setDraftPropertyValue] = useState(number0(initialPropertyMarketValue));
  const [model, setModel] = useState({
    eav,
    selectedLevyRatePercent: parseRate(initialRate(currentScenario)),
    propertyMarketValue: initialPropertyMarketValue,
  });
  const [unsaved, setUnsaved] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const result = useMemo(() => calculateReferendum({
    eav: model.eav,
    selectedLevyRatePercent: model.selectedLevyRatePercent,
    propertyMarketValue: model.propertyMarketValue,
    totalProjectedAnnualNeed,
    currentLevyRevenue,
    requiredRevenue,
  }), [currentLevyRevenue, model, requiredRevenue, totalProjectedAnnualNeed]);

  const scenarios = useMemo(
    () => MODELED_LEVY_RATES.map((rate) => buildLevyScenario(model.eav, rate, requiredRevenue, totalProjectedAnnualNeed)),
    [model.eav, requiredRevenue, totalProjectedAnnualNeed],
  );

  function calculate() {
    const nextEav = parseCurrencyInput(draftEav);
    const nextRate = parseRate(draftRate);
    const nextPropertyValue = parseCurrencyInput(draftPropertyValue);
    setMessage(null);
    if (nextEav <= 0) {
      setMessage({ ok: false, text: "Enter a positive EAV." });
      return;
    }
    if (nextRate <= 0) {
      setMessage({ ok: false, text: "Enter a positive levy rate." });
      return;
    }
    if (nextPropertyValue <= 0) {
      setMessage({ ok: false, text: "Enter a positive property market value." });
      return;
    }
    setModel({
      eav: nextEav,
      selectedLevyRatePercent: nextRate,
      propertyMarketValue: nextPropertyValue,
    });
    setUnsaved(nextEav !== savedEav);
  }

  function reset() {
    setDraftEav(number0(savedEav));
    setDraftRate(initialRate(currentScenario));
    setDraftPropertyValue(number0(initialPropertyMarketValue));
    setModel({
      eav: savedEav,
      selectedLevyRatePercent: parseRate(initialRate(currentScenario)),
      propertyMarketValue: initialPropertyMarketValue,
    });
    setUnsaved(false);
    setReason("");
    setMessage(null);
  }

  async function saveModelValue() {
    const nextEav = model.eav;
    setMessage(null);
    if (!canSaveModelValue) {
      setMessage({ ok: false, text: "Financial-model permission required." });
      return;
    }
    if (nextEav <= 0) {
      setMessage({ ok: false, text: "Enter a positive EAV." });
      return;
    }
    if (!reason.trim()) {
      setMessage({ ok: false, text: "A reason is required." });
      return;
    }
    if (!window.confirm("Save this EAV as the model value?")) return;
    setSaving(true);
    try {
      const response = await fetch("/api/board/referendum/eav", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eav: nextEav, reason: reason.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage({ ok: false, text: data.error || "EAV was not saved." });
        return;
      }
      setSavedEav(nextEav);
      setDraftEav(number0(nextEav));
      setUnsaved(false);
      setReason("");
      setMessage({ ok: true, text: "Saved as model value. Workbook synchronization requires Microsoft Graph configuration." });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const marginLabel = result.fundingMarginOrGap >= 0 ? "Projected Funding Margin" : "Projected Funding Gap";

  return (
    <>
      <div className="board-grid k2" style={{ marginTop: 22 }}>
        <div className="board-card">
          <div className="board-field">
            <label htmlFor="eav">Equalized Assessed Value (EAV)</label>
            <input
              id="eav"
              className="board-input"
              inputMode="decimal"
              value={draftEav}
              onChange={(event) => {
                setDraftEav(event.target.value.replace(/[^0-9.,]/g, ""));
                setUnsaved(true);
              }}
            />
          </div>
          <div className="board-field">
            <label htmlFor="rate">Selected Levy Rate</label>
            <input
              id="rate"
              className="board-input"
              inputMode="decimal"
              value={draftRate}
              onChange={(event) => setDraftRate(event.target.value.replace(/[^0-9.]/g, ""))}
            />
          </div>
          <div className="board-field">
            <label htmlFor="property-value">Property Market Value</label>
            <input
              id="property-value"
              className="board-input"
              inputMode="decimal"
              value={draftPropertyValue}
              onChange={(event) => setDraftPropertyValue(event.target.value.replace(/[^0-9.,]/g, ""))}
            />
          </div>
          <div className="board-actions">
            <button className="board-submit" type="button" onClick={calculate}>Calculate</button>
            <button className="board-btn-secondary" type="button" onClick={reset}>Reset</button>
          </div>
          <p className="board-updated" style={{ marginTop: 12 }}>
            Model value: {money0(savedEav)}{unsaved ? " · Unsaved scenario" : ""}
          </p>
        </div>

        <div className="board-card">
          <div className="board-grid k2">
            <div className="board-stat"><div className="lbl">Projected Levy Revenue</div><div className="val">{money0(result.projectedLevyRevenue)}</div></div>
            <div className="board-stat"><div className="lbl">Current Ambulance-Fund Revenue</div><div className="val">{money0(result.currentLevyRevenue)}</div></div>
            <div className="board-stat"><div className="lbl">Revenue Increase</div><div className={`val ${result.revenueIncrease >= 0 ? "pos" : "neg"}`}>{money0(Math.abs(result.revenueIncrease))}</div></div>
            <div className="board-stat"><div className="lbl">Total Projected Annual Need</div><div className="val">{money0(result.totalProjectedAnnualNeed)}</div></div>
            <div className="board-stat"><div className="lbl">{marginLabel}</div><div className={`val ${result.fundingMarginOrGap >= 0 ? "pos" : "neg"}`}>{money0(Math.abs(result.fundingMarginOrGap))}</div></div>
            <div className="board-stat"><div className="lbl">Required Levy Rate</div><div className="val">{result.requiredLevyRatePercent.toFixed(3)}%</div></div>
            <div className="board-stat"><div className="lbl">Required Revenue</div><div className="val">{money0(result.requiredRevenue)}</div></div>
            <div className="board-stat"><div className="lbl">Estimated Annual Tax Impact</div><div className="val">{money2(result.estimatedAnnualTaxImpact)}</div></div>
          </div>
        </div>
      </div>

      <h2 className="board-h2">Planning Scenarios</h2>
      <div className="board-tw">
        <table>
          <thead>
            <tr>
              <th>Levy Rate</th>
              <th className="num">Projected Levy Revenue</th>
              <th className="num">Projected Annual Need</th>
              <th className="num">Funding Margin or Gap</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((scenario) => {
              const gap = scenario.fundingMarginOrGap;
              return (
                <tr key={scenario.ratePercent}>
                  <td style={{ fontWeight: 650 }}>{scenario.ratePercent.toFixed(2)}%</td>
                  <td className="num">{money0(scenario.projectedLevyRevenue)}</td>
                  <td className="num">{money0(scenario.totalProjectedAnnualNeed)}</td>
                  <td className="num" style={{ color: gap >= 0 ? "var(--b-good)" : "var(--b-crit)", fontWeight: 650 }}>
                    {gap >= 0 ? money0(gap) : `(${money0(Math.abs(gap))})`}
                  </td>
                  <td>{scenario.result}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {canSaveModelValue && (
        <div className="board-card board-model-save">
          <div className="board-field">
            <label htmlFor="save-reason">Reason</label>
            <input
              id="save-reason"
              className="board-input"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <button className="board-submit" type="button" disabled={saving} onClick={saveModelValue}>
            {saving ? "Saving..." : "Save as Model Value"}
          </button>
        </div>
      )}

      {message && (
        <div className={message.ok ? "board-note" : "board-err"} style={{ marginTop: 14 }} role="status">
          {message.text}
        </div>
      )}
    </>
  );
}

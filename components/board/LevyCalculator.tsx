"use client";

import { useMemo, useState } from "react";

const money0 = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const money2 = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const COMPARE = [0.20, 0.25, 0.30, 0.35, 0.40];       // planning rates (%), do not remove
const HOMES = [100000, 150000, 200000, 250000, 300000]; // market values for impact estimate

export default function LevyCalculator({ eav, eavCell, currentScenario }: {
  eav: number; eavCell: string | null; currentScenario: string | null;
}) {
  const [rateStr, setRateStr] = useState("0.30");
  const [collStr, setCollStr] = useState("100");

  const rate = Math.max(0, parseFloat(rateStr) || 0);       // percent, e.g. 0.30
  const coll = Math.min(100, Math.max(0, parseFloat(collStr) || 0)) / 100;

  const revenue = useMemo(() => eav * (rate / 100) * coll, [eav, rate, coll]);
  const current = useMemo(() => eav * (0.30 / 100) * coll, [eav, coll]); // scenario B = 0.30%
  const diff = revenue - current;

  return (
    <>
      <div className="board-grid k2" style={{ marginTop: 22 }}>
        {/* inputs */}
        <div className="board-card">
          <div className="board-eyebrow" style={{ marginBottom: 14 }}>Your rate</div>
          <div className="board-field">
            <label htmlFor="rate">Proposed levy rate (%)</label>
            <input id="rate" className="board-input" inputMode="decimal" value={rateStr}
              onChange={(e) => setRateStr(e.target.value.replace(/[^0-9.]/g, ""))} />
          </div>
          <div className="board-field" style={{ marginBottom: 0 }}>
            <label htmlFor="coll">Collection rate (%) <span style={{ color: "var(--b-faint)", fontWeight: 400 }}>— set ~98% to be conservative</span></label>
            <input id="coll" className="board-input" inputMode="decimal" value={collStr}
              onChange={(e) => setCollStr(e.target.value.replace(/[^0-9.]/g, ""))} />
          </div>
        </div>

        {/* result */}
        <div className="board-card board-stat" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div className="lbl">Estimated annual levy revenue</div>
          <div className="val" style={{ fontSize: "clamp(28px,4.4vw,40px)" }}>{money0(revenue)}</div>
          <div className="sub" style={{ marginTop: 8 }}>
            {money2(revenue / 12)} per month ·{" "}
            <span style={{ color: diff >= 0 ? "var(--b-good)" : "var(--b-crit)", fontWeight: 600 }}>
              {diff >= 0 ? "+" : "−"}{money0(Math.abs(diff))}
            </span>{" "}vs. the current 0.30% plan{currentScenario ? "" : ""}
          </div>
        </div>
      </div>

      {/* comparison */}
      <h2 className="board-h2">Rate comparison</h2>
      <div className="board-tw">
        <table>
          <thead><tr><th>Levy rate</th><th className="num">Annual revenue</th><th className="num">Per month</th><th className="num">vs. 0.30%</th></tr></thead>
          <tbody>
            {COMPARE.map((r) => {
              const rev = eav * (r / 100) * coll;
              const d = rev - current;
              const isCur = Math.abs(r - rate) < 0.0001;
              return (
                <tr key={r} style={isCur ? { background: "var(--b-accent-soft)" } : undefined}>
                  <td style={{ fontWeight: isCur ? 700 : 500 }}>{r.toFixed(2)}%{isCur ? " · your rate" : ""}</td>
                  <td className="num">{money0(rev)}</td>
                  <td className="num">{money0(rev / 12)}</td>
                  <td className="num" style={{ color: d > 0 ? "var(--b-good)" : d < 0 ? "var(--b-crit)" : "var(--b-muted)" }}>{d === 0 ? "—" : (d > 0 ? "+" : "−") + money0(Math.abs(d))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* homeowner impact */}
      <h2 className="board-h2">What it costs a homeowner</h2>
      <p className="board-sub" style={{ marginBottom: 12 }}>Estimated yearly ambulance tax at <strong>{rate.toFixed(2)}%</strong>, by home value. Illinois taxes about one-third of a home&rsquo;s market value, so these are estimates <em>before</em> any exemptions.</p>
      <div className="board-tw">
        <table>
          <thead><tr><th>Home market value</th><th className="num">Taxable value (≈⅓)</th><th className="num">Yearly ambulance tax</th><th className="num">Per month</th></tr></thead>
          <tbody>
            {HOMES.map((m) => {
              const taxable = m / 3;
              const tax = taxable * (rate / 100);
              return (
                <tr key={m}>
                  <td>{money0(m)}</td>
                  <td className="num">{money0(taxable)}</td>
                  <td className="num">{money2(tax)}</td>
                  <td className="num">{money2(tax / 12)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="board-updated" style={{ marginTop: 16 }}>
        Based on District EAV {money0(eav)} {eavCell ? `(${eavCell})` : ""} · <span className="board-chip review" style={{ marginLeft: 4 }}>EAV needs verification</span>
      </p>
    </>
  );
}

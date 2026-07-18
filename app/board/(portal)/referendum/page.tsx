import { getFinance, money, pct } from "@/lib/board/finance";

export const dynamic = "force-dynamic";

function fmtSynced(iso: string | null): string {
  if (!iso) return "not loaded";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default async function ReferendumOverview() {
  const { byKey, updatedAt } = await getFinance();
  const num = (k: string) => byKey[k]?.value ?? null;
  const txt = (k: string) => byKey[k]?.textValue ?? null;
  const loaded = Object.keys(byKey).length > 0;

  const revenue = num("rev_total");
  const expenses = num("exp_total");
  const margin = num("surplus");                 // rev − exp (negative = gap)
  const personnel = num("exp_personnel");
  const operations = num("exp_operations");
  const debtAnnual = num("debt_annual");
  const capital = num("exp_capital");
  const requiredRevenue = num("levy_required");  // dollar figure from the workbook
  const scenario = txt("levy_scenario");
  const selectedRate = scenario?.match(/([\d.]+)\s*%/)?.[1] ?? null;

  const fundsFully = margin != null && margin >= 0;
  const result = margin == null ? "—" : margin > 1000 ? "Projected Funding Surplus" : margin < -1000 ? "Projected Funding Gap" : "Projected Balanced Model";
  const resultCls = margin == null ? "tight" : fundsFully ? "ok" : "no";

  const costs = [
    { k: "exp_personnel", label: "Personnel", tone: "#C0793B" },
    { k: "exp_operations", label: "Operations", tone: "#3A4658" },
    { k: "exp_debt", label: "Debt payments", tone: "#8A6011" },
    { k: "exp_fleet", label: "Fleet & maintenance", tone: "#5C6675" },
    { k: "exp_capital", label: "Capital & equipment reserve", tone: "#8A93A1" },
  ].map((m) => ({ ...m, value: num(m.k) ?? 0 })).filter((m) => m.value > 0);
  const costTotal = costs.reduce((a, b) => a + b.value, 0) || 1;

  return (
    <>
      <p className="board-eyebrow">Referendum planning</p>
      <h1 className="board-h1">Proposed EMS District Financial Model</h1>
      <p className="board-sub">Projected annual costs and revenue needs for the proposed full-time EMS District.</p>

      {!loaded && <div className="board-card" style={{ marginTop: 22 }}><p style={{ margin: 0 }}>The financial figures have not been loaded from the workbook yet.</p></div>}

      {loaded && (
        <>
          <div className={`board-verdict ${resultCls}`} style={{ marginTop: 22 }}>
            <div>
              <div className="board-eyebrow" style={{ marginBottom: 2 }}>Does the selected levy fund the proposed model?</div>
              <div className="big">{result}</div>
            </div>
            <div style={{ color: "var(--b-ink-2)", fontSize: 14 }}>
              {selectedRate ? `${selectedRate}% levy · ` : ""}{money(revenue)} projected revenue vs. {money(expenses)} projected need
              <div style={{ marginTop: 4, fontWeight: 600, color: fundsFully ? "var(--b-good)" : "var(--b-crit)" }}>
                {fundsFully ? "Fully funds projected model" : "Does not fully fund projected model"}
              </div>
            </div>
          </div>

          <h2 className="board-h2">Projected Annual Financial Need</h2>
          <div className="board-grid k4">
            <div className="board-card board-stat"><div className="lbl">Selected levy rate</div><div className="val">{selectedRate ? `${selectedRate}%` : (scenario ?? "—")}</div><div className="sub">Modeled property-tax rate</div></div>
            <div className="board-card board-stat"><div className="lbl">Projected annual revenue</div><div className="val">{money(revenue)}</div><div className="sub">At the selected levy</div></div>
            <div className="board-card board-stat"><div className="lbl">Total projected annual cost</div><div className="val">{money(expenses)}</div><div className="sub">All modeled categories</div></div>
            <div className="board-card board-stat"><div className="lbl">Projected personnel cost</div><div className="val">{money(personnel)}</div><div className="sub">Proposed full-time model</div></div>
          </div>
          <div className="board-grid k4" style={{ marginTop: 14 }}>
            <div className="board-card board-stat"><div className="lbl">Projected operating cost</div><div className="val">{money(operations)}</div><div className="sub">Supplies, fuel, insurance, etc.</div></div>
            <div className="board-card board-stat"><div className="lbl">Projected annual debt payments</div><div className="val">{money(debtAnnual)}</div><div className="sub">Per amortization schedule</div></div>
            <div className="board-card board-stat"><div className="lbl">Projected capital &amp; equipment</div><div className="val">{money(capital)}</div><div className="sub">Reserve contribution</div></div>
            <div className="board-card board-stat">
              <div className="lbl">{fundsFully ? "Projected funding margin" : "Projected funding gap"}</div>
              <div className={`val ${fundsFully ? "pos" : "neg"}`}>{money(margin != null ? Math.abs(margin) : null)}</div>
              <div className="sub">Revenue required to fully fund: {money(requiredRevenue)}</div>
            </div>
          </div>

          <h2 className="board-h2">Projected Annual Costs</h2>
          <div className="board-tw">
            <table>
              <thead><tr><th>Projected cost category</th><th style={{ width: "34%" }}>Share</th><th className="num">Annual amount</th></tr></thead>
              <tbody>
                {costs.map((m) => (
                  <tr key={m.k}>
                    <td>{m.label}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="board-bar" style={{ flex: 1 }}><i style={{ width: `${Math.round((m.value / costTotal) * 100)}%`, background: m.tone }} /></div>
                        <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--b-muted)", fontSize: 12.5, minWidth: 38 }}>{pct(m.value / costTotal)}</span>
                      </div>
                    </td>
                    <td className="num">{money(m.value)}</td>
                  </tr>
                ))}
                <tr className="total"><td>Total projected annual cost</td><td></td><td className="num">{money(expenses)}</td></tr>
              </tbody>
            </table>
          </div>

          <p className="board-updated" style={{ marginTop: 18 }}>Source: Millstadt EMS District Budget FY2026-27 · financial projection for referendum planning · last synchronized {fmtSynced(updatedAt)}</p>
        </>
      )}
    </>
  );
}

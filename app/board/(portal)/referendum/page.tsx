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
  const payables = num("exp_payables");
  const requiredRevenue = num("levy_required");  // dollar figure from the workbook
  const scenario = txt("levy_scenario");
  const selectedRate = scenario?.match(/([\d.]+)\s*%/)?.[1] ?? null;

  const fundsFully = margin != null && margin >= 0;

  const costs = [
    { k: "exp_personnel", label: "Projected Personnel Cost", tone: "#8B642C" },
    { k: "exp_operations", label: "Projected Operating Cost", tone: "#52606D" },
    { k: "exp_debt", label: "Projected Annual Debt Payments", tone: "#5DA17A" },
    { k: "exp_payables", label: "Annual Payable Catch-Up", tone: "#9B6F67" },
    { k: "exp_fleet", label: "Fleet and Maintenance", tone: "#7F8C99" },
    { k: "exp_capital", label: "Projected Capital and Equipment Need", tone: "#C99743" },
  ].map((m) => ({ ...m, value: num(m.k) ?? 0 })).filter((m) => m.value > 0);
  const costTotal = costs.reduce((a, b) => a + b.value, 0) || 1;

  return (
    <>
      <p className="board-eyebrow">Budget planning</p>
      <h1 className="board-h1">EMS Budget Model</h1>

      {!loaded && <div className="board-card" style={{ marginTop: 22 }}><p style={{ margin: 0 }}>The financial figures have not been loaded from the workbook yet.</p></div>}

      {loaded && (
        <>
          <div className={`board-verdict ${fundsFully ? "ok" : "no"}`} style={{ marginTop: 22 }}>
            <div>
              <div className="board-eyebrow" style={{ marginBottom: 2 }}>{fundsFully ? "Projected Funding Margin" : "Projected Funding Gap"}</div>
              <div className="big">{money(margin != null ? Math.abs(margin) : null)}</div>
            </div>
            <div style={{ color: "var(--b-ink-2)", fontSize: 14 }}>
              {selectedRate ? `${selectedRate}% · ` : ""}{money(revenue)} projected revenue · {money(expenses)} total projected annual need
              <div style={{ marginTop: 4, fontWeight: 600, color: fundsFully ? "var(--b-good)" : "var(--b-crit)" }}>
                {fundsFully ? "Fully Funds Projected Model" : "Does Not Fully Fund Projected Model"}
              </div>
            </div>
          </div>

          <h2 className="board-h2">Projected Annual Financial Need</h2>
          <div className="board-grid k4">
            <div className="board-card board-stat"><div className="lbl">Selected Levy Rate</div><div className="val">{selectedRate ? `${selectedRate}%` : (scenario ?? "—")}</div></div>
            <div className="board-card board-stat"><div className="lbl">Projected Levy Revenue</div><div className="val">{money(revenue)}</div></div>
            <div className="board-card board-stat"><div className="lbl">Total Projected Annual Need</div><div className="val">{money(expenses)}</div></div>
            <div className="board-card board-stat"><div className="lbl">Projected Personnel Cost</div><div className="val">{money(personnel)}</div></div>
          </div>
          <div className="board-grid k4" style={{ marginTop: 14 }}>
            <div className="board-card board-stat"><div className="lbl">Projected Operating Cost</div><div className="val">{money(operations)}</div></div>
            <div className="board-card board-stat"><div className="lbl">Projected Annual Debt Payments</div><div className="val">{money(debtAnnual)}</div></div>
            <div className="board-card board-stat"><div className="lbl">Projected Capital and Equipment Need</div><div className="val">{money(capital)}</div></div>
            <div className="board-card board-stat">
              <div className="lbl">{fundsFully ? "Projected Funding Margin" : "Projected Funding Gap"}</div>
              <div className={`val ${fundsFully ? "pos" : "neg"}`}>{money(margin != null ? Math.abs(margin) : null)}</div>
              <div className="sub">Revenue Required to Fully Fund the Model: {money(requiredRevenue)}</div>
            </div>
          </div>
          {payables != null && payables > 0 && (
            <p className="board-updated" style={{ marginTop: 12 }}>Includes annual payable catch-up of {money(payables)}.</p>
          )}

          <h2 className="board-h2">Projected Annual Costs</h2>
          <div className="board-tw">
            <table>
              <thead><tr><th>Projected Cost Category</th><th style={{ width: "34%" }}>Share</th><th className="num">Annual Amount</th></tr></thead>
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
                <tr className="total"><td>Total Projected Annual Need</td><td></td><td className="num">{money(expenses)}</td></tr>
              </tbody>
            </table>
          </div>

          <p className="board-updated" style={{ marginTop: 18 }}>Last synchronized {fmtSynced(updatedAt)}</p>
        </>
      )}
    </>
  );
}

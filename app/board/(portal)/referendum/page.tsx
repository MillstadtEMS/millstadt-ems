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
    { k: "exp_personnel", label: "Salaries and Staffing", tone: "#8B642C" },
    { k: "exp_operations", label: "Operations", tone: "#52606D" },
    { k: "exp_debt", label: "Debt Service", tone: "#5DA17A" },
    { k: "exp_payables", label: "Annual EMSMC Catch-Up", tone: "#9B6F67" },
    { k: "exp_fleet", label: "Fleet and Maintenance", tone: "#7F8C99" },
    { k: "exp_capital", label: "Capital and Equipment", tone: "#C99743" },
  ].map((m) => ({ ...m, value: num(m.k) ?? 0 })).filter((m) => m.value > 0);
  const costTotal = costs.reduce((a, b) => a + b.value, 0) || 1;
  const summaryMetrics = [
    { label: "Levy rate", value: selectedRate ? `${selectedRate}%` : (scenario ?? "—"), sub: "Workbook scenario" },
    { label: "Levy revenue", value: money(revenue), sub: "Projected annual revenue" },
    { label: "Annual need", value: money(expenses), sub: "Projected annual cost" },
    { label: fundsFully ? "Margin" : "Gap", value: money(margin != null ? Math.abs(margin) : null), sub: fundsFully ? "Revenue above need" : "Amount not funded", tone: fundsFully ? "pos" : "neg" },
  ];

  return (
    <>
      <p className="board-eyebrow">Budget planning</p>
      <h1 className="board-h1">Budget</h1>

      {!loaded && <div className="board-card" style={{ marginTop: 22 }}><p style={{ margin: 0 }}>The financial figures have not been loaded from the workbook yet.</p></div>}

      {loaded && (
        <>
          <section className="budget-summary">
            <div className={`budget-funding-panel ${fundsFully ? "ok" : "gap"}`}>
              <div>
                <p className="board-eyebrow">Funding status</p>
                <h2>{fundsFully ? "Annual need is funded" : "Gap to close"}</h2>
                <strong>{money(margin != null ? Math.abs(margin) : null)}</strong>
              </div>
              <dl>
                <div><dt>Revenue</dt><dd>{money(revenue)}</dd></div>
                <div><dt>Need</dt><dd>{money(expenses)}</dd></div>
                <div><dt>Required revenue</dt><dd>{money(requiredRevenue)}</dd></div>
              </dl>
            </div>

            <div className="budget-metric-grid">
              {summaryMetrics.map((metric) => (
                <div key={metric.label} className="board-card board-stat budget-metric">
                  <div className="lbl">{metric.label}</div>
                  <div className={`val ${metric.tone ?? ""}`}>{metric.value}</div>
                  <div className="sub">{metric.sub}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="budget-workspace">
            <div className="budget-breakdown-card">
              <div className="board-section-header">
                <h2 className="board-h2">Annual Costs</h2>
                <span className="board-updated">Last updated {fmtSynced(updatedAt)}</span>
              </div>
              <div className="budget-cost-list">
                {costs.map((m) => (
                  <div key={m.k} className="budget-cost-row">
                    <div>
                      <strong>{m.label}</strong>
                      <span>{pct(m.value / costTotal)} of annual need</span>
                    </div>
                    <div className="budget-cost-bar" aria-hidden="true">
                      <i style={{ width: `${Math.round((m.value / costTotal) * 100)}%`, background: m.tone }} />
                    </div>
                    <b>{money(m.value)}</b>
                  </div>
                ))}
                <div className="budget-cost-row total">
                  <div><strong>Total Annual Need</strong></div>
                  <b>{money(expenses)}</b>
                </div>
              </div>
            </div>

            <div className="budget-side-card">
              <h2 className="board-h2">Planning Notes</h2>
              <div className="budget-note-list">
                <div><span>Personnel</span><strong>{money(personnel)}</strong></div>
                <div><span>Operations</span><strong>{money(operations)}</strong></div>
                <div><span>Debt service</span><strong>{money(debtAnnual)}</strong></div>
                <div><span>Capital/equipment</span><strong>{money(capital)}</strong></div>
                {payables != null && payables > 0 && <div><span>EMSMC catch-up</span><strong>{money(payables)}</strong></div>}
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}

import Link from "next/link";
import { currentBoardUser } from "@/lib/board/auth";
import { getFinance, money, pct } from "@/lib/board/finance";

export const dynamic = "force-dynamic";

function fmtUpdated(iso: string | null): string {
  if (!iso) return "not loaded yet";
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default async function BoardDashboard() {
  const user = await currentBoardUser();
  const { byKey, updatedAt } = await getFinance();
  const num = (k: string) => byKey[k]?.value ?? null;
  const txt = (k: string) => byKey[k]?.textValue ?? null;
  const loaded = Object.keys(byKey).length > 0;

  const revenue = num("rev_total");
  const expenses = num("exp_total");
  const surplus = num("surplus");
  const personnel = num("exp_personnel");
  const operations = num("exp_operations");
  const debtAnnual = num("debt_annual");
  const debtOutstanding = num("debt_outstanding");
  const levyRequired = num("levy_required");
  const levyScenario = txt("levy_scenario");

  // Affordability: balanced or better = OK; small deficit (<2% of expenses) = Tight; else = Not affordable.
  let verdict: { cls: string; label: string; note: string } = { cls: "tight", label: "Needs review", note: "Financials not loaded yet." };
  if (loaded && surplus != null && expenses) {
    const ratio = surplus / expenses;
    if (ratio >= 0) verdict = { cls: "ok", label: "Affordable", note: "Planned income covers planned spending, with money left over." };
    else if (ratio > -0.02) verdict = { cls: "tight", label: "Tight budget", note: "Very close to breaking even — a small shortfall the levy or billing can close." };
    else verdict = { cls: "no", label: "Not affordable as-is", note: "Planned spending is meaningfully above planned income." };
  }

  const mix = [
    { k: "exp_personnel", label: "Employees & benefits", tone: "#C0793B" },
    { k: "exp_operations", label: "Operations", tone: "#3A4658" },
    { k: "exp_debt", label: "Debt payments", tone: "#8A6011" },
    { k: "exp_fleet", label: "Fleet (fuel, maintenance)", tone: "#5C6675" },
    { k: "exp_capital", label: "Equipment reserve", tone: "#8A93A1" },
  ].map((m) => ({ ...m, value: num(m.k) ?? 0 })).filter((m) => m.value > 0);
  const mixTotal = mix.reduce((a, b) => a + b.value, 0) || 1;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p className="board-eyebrow">Fiscal Year May 1, 2026 – April 30, 2027</p>
          <h1 className="board-h1">Financial overview</h1>
          <p className="board-sub">Welcome, {user?.firstName}. Here is the money picture for the year in plain terms.</p>
        </div>
        <div className="board-viewtoggle" role="group" aria-label="View">
          <a className="on">Simple</a>
          <Link href="/board/budget">Detailed</Link>
        </div>
      </div>

      {!loaded && (
        <div className="board-card" style={{ marginTop: 22 }}>
          <p style={{ margin: 0 }}>The financial figures have not been loaded from the workbook yet. Once the workbook import runs, this page fills in automatically with live numbers.</p>
        </div>
      )}

      {loaded && (
        <>
          <div className={`board-verdict ${verdict.cls}`} style={{ marginTop: 22 }}>
            <div>
              <div className="board-eyebrow" style={{ marginBottom: 2 }}>Can we afford the plan?</div>
              <div className="big">{verdict.label}</div>
            </div>
            <div style={{ color: "var(--b-ink-2)", fontSize: 14, maxWidth: "52ch" }}>{verdict.note}</div>
          </div>

          <h2 className="board-h2">The year at a glance</h2>
          <div className="board-grid k4">
            <div className="board-card board-stat">
              <div className="lbl">Money expected</div>
              <div className="val">{money(revenue)}</div>
              <div className="sub">All income for the year</div>
            </div>
            <div className="board-card board-stat">
              <div className="lbl">Employees will cost</div>
              <div className="val">{money(personnel)}</div>
              <div className="sub">Wages + benefits + taxes</div>
            </div>
            <div className="board-card board-stat">
              <div className="lbl">Operations will cost</div>
              <div className="val">{money(operations)}</div>
              <div className="sub">Supplies, fuel, insurance, etc.</div>
            </div>
            <div className="board-card board-stat">
              <div className="lbl">Debt to pay this year</div>
              <div className="val">{money(debtAnnual)}</div>
              <div className="sub">{money(debtOutstanding)} owed in total</div>
            </div>
          </div>

          <div className="board-grid k3" style={{ marginTop: 14 }}>
            <div className="board-card board-stat">
              <div className="lbl">Money remaining <span className="board-chip">year-end</span></div>
              <div className={`val ${surplus != null && surplus < 0 ? "neg" : "pos"}`}>{money(surplus)}</div>
              <div className="sub">{money(revenue)} in − {money(expenses)} out</div>
            </div>
            <div className="board-card board-stat">
              <div className="lbl">Proposed levy</div>
              <div className="val">{levyScenario ?? "—"}</div>
              <div className="sub">Property-tax scenario in the plan</div>
            </div>
            <div className="board-card board-stat">
              <div className="lbl">Levy to fully balance</div>
              <div className="val">{money(levyRequired)}</div>
              <div className="sub">Revenue needed to reach $0 surplus</div>
            </div>
          </div>

          <h2 className="board-h2">Where the money goes</h2>
          <div className="board-tw">
            <table>
              <thead><tr><th>Category</th><th style={{ width: "34%" }}>Share of spending</th><th className="num">Annual cost</th></tr></thead>
              <tbody>
                {mix.map((m) => (
                  <tr key={m.k}>
                    <td>{m.label}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="board-bar" style={{ flex: 1 }}><i style={{ width: `${Math.round((m.value / mixTotal) * 100)}%`, background: m.tone }} /></div>
                        <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--b-muted)", fontSize: 12.5, minWidth: 38 }}>{pct(m.value / mixTotal)}</span>
                      </div>
                    </td>
                    <td className="num">{money(m.value)}</td>
                  </tr>
                ))}
                <tr className="total"><td>Total spending</td><td></td><td className="num">{money(expenses)}</td></tr>
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
            <span className="board-updated">Figures from the FY2026-27 workbook · last updated {fmtUpdated(updatedAt)}</span>
            <span className="board-chip review">Several inputs marked “needs review” in the workbook</span>
          </div>
        </>
      )}
    </>
  );
}

import { redirect } from "next/navigation";
import { getCashflow } from "@/lib/board/cashflow";
import { actualCashFlowEnabled } from "@/lib/board/financialData/featureFlags";
import { money } from "@/lib/board/finance";

export const dynamic = "force-dynamic";

// Monthly cash flow needs verified Sage actuals, which don't exist yet. The
// code is preserved and reactivates when ENABLE_ACTUAL_CASH_FLOW=true and the
// figures come from real accounting data — never from dividing annual totals.
export default async function CashFlowPage() {
  if (!actualCashFlowEnabled()) redirect("/board");

  const months = await getCashflow();
  const loaded = months.length > 0;
  const endings = months.map((m) => m.ending ?? 0);
  const low = loaded ? Math.min(...endings) : 0;
  const lowMonth = months.find((m) => (m.ending ?? 0) === low)?.month ?? "";
  const negativeMonths = months.filter((m) => (m.ending ?? 0) < 0).length;
  const maxAbs = Math.max(1, ...endings.map((e) => Math.abs(e)));

  return (
    <>
      <p className="board-eyebrow">Month-by-month</p>
      <h1 className="board-h1">Actual Cash Flow</h1>
      <p className="board-sub">Verified monthly actuals from an approved accounting source.</p>

      {!loaded && <div className="board-card" style={{ marginTop: 22 }}><p style={{ margin: 0 }}>Cash-flow figures have not been imported yet.</p></div>}

      {loaded && (
        <>
          <div className={`board-verdict ${low < 0 ? "no" : "ok"}`} style={{ marginTop: 22 }}>
            <div>
              <div className="board-eyebrow" style={{ marginBottom: 2 }}>Lowest point in the year</div>
              <div className="big">{money(low)}{lowMonth ? ` · ${lowMonth}` : ""}</div>
            </div>
            <div style={{ color: "var(--b-ink-2)", fontSize: 14, maxWidth: "56ch" }}>
              {low < 0
                ? <>Negative ending cash appears in {negativeMonths} month{negativeMonths === 1 ? "" : "s"}.</>
                : <>The balance stays positive all year.</>}
            </div>
          </div>

          <h2 className="board-h2">Ending cash by month</h2>
          <div className="board-tw">
            <table>
              <thead><tr><th>Month</th><th className="num">Start</th><th className="num">Net change</th><th style={{ width: "34%" }}>Ending balance</th><th className="num">Ending</th></tr></thead>
              <tbody>
                {months.map((m) => {
                  const end = m.ending ?? 0;
                  const w = Math.round((Math.abs(end) / maxAbs) * 100);
                  const neg = end < 0;
                  return (
                    <tr key={m.idx}>
                      <td style={{ fontWeight: 600 }}>{m.month}</td>
                      <td className="num">{money(m.beginning)}</td>
                      <td className="num" style={{ color: (m.net ?? 0) < 0 ? "var(--b-crit)" : "var(--b-good)" }}>{(m.net ?? 0) >= 0 ? "+" : "−"}{money(Math.abs(m.net ?? 0))}</td>
                      <td>
                        <div style={{ display: "flex", justifyContent: neg ? "flex-end" : "flex-start", background: "var(--b-hair-2)", borderRadius: 4, height: 8, position: "relative" }}>
                          <div style={{ width: `${w}%`, height: "100%", borderRadius: 4, background: neg ? "var(--b-crit)" : "var(--b-good)", opacity: .85 }} />
                        </div>
                      </td>
                      <td className="num" style={{ color: neg ? "var(--b-crit)" : "var(--b-ink)", fontWeight: neg ? 700 : 500 }}>{money(end)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="board-updated" style={{ marginTop: 14 }}>Red = balance below zero.</p>
        </>
      )}
    </>
  );
}

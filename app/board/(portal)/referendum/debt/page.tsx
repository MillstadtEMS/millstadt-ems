import { getDebt } from "@/lib/board/detail";
import { money, pct } from "@/lib/board/finance";

export const dynamic = "force-dynamic";

export default async function DebtPage() {
  const rows = await getDebt();
  const loaded = rows.length > 0;
  const loans = rows.filter((r) => r.kind === "amortizing");
  const payables = rows.filter((r) => r.kind === "payable");
  const totalLiab = rows.reduce((a, r) => a + (r.balance ?? 0), 0);
  const annual = loans.reduce((a, r) => a + (r.annual ?? 0), 0);
  const monthly = loans.reduce((a, r) => a + (r.monthly ?? 0), 0);

  return (
    <>
      <p className="board-eyebrow">Obligations</p>
      <h1 className="board-h1">Debt Schedule</h1>
      <p className="board-sub">Projected annual debt payments and obligations from the workbook.</p>

      {!loaded && <div className="board-card" style={{ marginTop: 22 }}><p style={{ margin: 0 }}>Debt detail has not been imported yet — upload the workbook on the Admin page to load it.</p></div>}

      {loaded && (
        <>
          <div className="board-grid k3" style={{ marginTop: 22 }}>
            <div className="board-card board-stat"><div className="lbl">Total liabilities</div><div className="val">{money(totalLiab)}</div><div className="sub">Loans + payables</div></div>
            <div className="board-card board-stat"><div className="lbl">Annual debt service</div><div className="val">{money(annual)}</div><div className="sub">Year 1, per amortization</div></div>
            <div className="board-card board-stat"><div className="lbl">Monthly payments</div><div className="val">{money(monthly)}</div><div className="sub">Recurring loan payments</div></div>
          </div>

          <h2 className="board-h2">Amortizing loans</h2>
          <div className="board-tw">
            <table>
              <thead>
                <tr><th>Creditor</th><th>Purpose</th><th className="num">Balance</th><th className="num">Rate</th><th className="num">Monthly</th><th className="num">Annual</th><th>Est. payoff</th></tr>
              </thead>
              <tbody>
                {loans.map((r) => (
                  <tr key={r.creditor}>
                    <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{r.creditor}</td>
                    <td style={{ color: "var(--b-muted)" }}>{r.purpose ?? "—"}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{money(r.balance)}</td>
                    <td className="num">{r.rate != null ? pct(r.rate) : <span className="board-chip review">Needs review</span>}</td>
                    <td className="num">{r.monthly != null ? money(r.monthly) : "—"}</td>
                    <td className="num">{money(r.annual)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{r.payoff ?? "—"}</td>
                  </tr>
                ))}
                <tr className="total"><td>Amortizing total</td><td></td><td className="num">{money(loans.reduce((a, r) => a + (r.balance ?? 0), 0))}</td><td></td><td className="num">{money(monthly)}</td><td className="num">{money(annual)}</td><td></td></tr>
              </tbody>
            </table>
          </div>

          {payables.length > 0 && (
            <>
              <h2 className="board-h2">Non-interest payables</h2>
              <div className="board-tw">
                <table>
                  <thead><tr><th>Creditor</th><th>Purpose</th><th className="num">Balance</th></tr></thead>
                  <tbody>
                    {payables.map((r) => (
                      <tr key={r.creditor}>
                        <td style={{ fontWeight: 600 }}>{r.creditor}</td>
                        <td style={{ color: "var(--b-muted)" }}>{r.purpose ?? "—"}</td>
                        <td className="num" style={{ fontWeight: 600 }}>{money(r.balance)}</td>
                      </tr>
                    ))}
                    <tr className="total"><td>Total liabilities (all)</td><td></td><td className="num">{money(totalLiab)}</td></tr>
                  </tbody>
                </table>
              </div>
            </>
          )}

          <p className="board-updated" style={{ marginTop: 16 }}>Source: Debt Schedule worksheet.</p>
        </>
      )}
    </>
  );
}

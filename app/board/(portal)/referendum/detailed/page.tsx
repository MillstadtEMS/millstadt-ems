import Link from "next/link";
import { getBudgetSections } from "@/lib/board/budget";
import { getFinance, money } from "@/lib/board/finance";

export const dynamic = "force-dynamic";

export default async function DetailedModelPage() {
  const [sections, { byKey }] = await Promise.all([getBudgetSections(), getFinance()]);
  const revenue = byKey["rev_total"]?.value ?? null;
  const expenses = byKey["exp_total"]?.value ?? null;
  const loaded = sections.length > 0;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p className="board-eyebrow">Detailed model</p>
          <h1 className="board-h1">Detailed Projected Model</h1>
          <p className="board-sub">Every projected line item for the proposed EMS District, straight from the workbook.</p>
        </div>
        <div className="board-viewtoggle" role="group" aria-label="View">
          <Link href="/board/referendum">Simple</Link>
          <a className="on">Detailed</a>
        </div>
      </div>

      {!loaded && <div className="board-card" style={{ marginTop: 22 }}><p style={{ margin: 0 }}>Projected line items have not been imported yet.</p></div>}

      {loaded && (
        <>
          <div className="board-grid k2" style={{ marginTop: 22 }}>
            <div className="board-card board-stat"><div className="lbl">Projected annual revenue</div><div className="val">{money(revenue)}</div></div>
            <div className="board-card board-stat"><div className="lbl">Total projected annual cost</div><div className="val">{money(expenses)}</div></div>
          </div>

          {sections.map((s) => (
            <section key={s.name}>
              <h2 className="board-h2">{s.name}</h2>
              <div className="board-tw">
                <table>
                  <thead><tr><th>Projected cost category</th><th className="num">Annual amount</th></tr></thead>
                  <tbody>
                    {s.lines.map((l, i) => (
                      <tr key={i}>
                        <td>{l.category}</td>
                        <td className="num">{money(l.amount)}</td>
                      </tr>
                    ))}
                    <tr className="total"><td>Subtotal — {s.name}</td><td className="num">{money(s.total)}</td></tr>
                  </tbody>
                </table>
              </div>
            </section>
          ))}

          <p className="board-updated" style={{ marginTop: 18 }}>Source: Referendum workbook, FY 2026–27 · financial projection for referendum planning.</p>
        </>
      )}
    </>
  );
}

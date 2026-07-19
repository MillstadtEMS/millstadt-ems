import { getTruckMaintenance } from "@/lib/board/detail";
import { money } from "@/lib/board/finance";

export const dynamic = "force-dynamic";

export default async function TrucksPage() {
  const units = await getTruckMaintenance();
  const loaded = units.length > 0;
  const total = units.reduce((a, u) => a + (u.fyTotal ?? 0), 0);
  const top = units.reduce<{ unit: string; amt: number } | null>((best, u) => {
    const amt = u.fyTotal ?? 0;
    return !best || amt > best.amt ? { unit: u.unit, amt } : best;
  }, null);
  const monthLabels = units[0]?.months.map((m) => m.label) ?? [];
  const annualOnly = monthLabels.length === 1 && monthLabels[0] === "Annual";

  return (
    <>
      <p className="board-eyebrow">Fleet</p>
      <h1 className="board-h1">Projected Fleet Costs</h1>
      <p className="board-sub">Fleet-related annual costs from the referendum workbook.</p>

      {!loaded && <div className="board-card" style={{ marginTop: 22 }}><p style={{ margin: 0 }}>Fleet maintenance detail has not been imported yet — upload the workbook on the Admin page to load it.</p></div>}

      {loaded && (
        <>
          <div className="board-grid k3" style={{ marginTop: 22 }}>
            <div className="board-card board-stat"><div className="lbl">Total Fleet Cost</div><div className="val">{money(total)}</div><div className="sub">All line items</div></div>
            <div className="board-card board-stat"><div className="lbl">Largest Line Item</div><div className="val">{top ? top.unit : "—"}</div><div className="sub">{top ? `${money(top.amt)}` : ""}</div></div>
            <div className="board-card board-stat"><div className="lbl">Items tracked</div><div className="val">{units.length}</div><div className="sub">Annual fleet line items</div></div>
          </div>

          <h2 className="board-h2">Fleet line items</h2>
          <div className="board-tw">
            <table>
              <thead>
                <tr>
                  <th>Line item</th>
                  {annualOnly ? <th className="num">Annual amount</th> : monthLabels.map((m) => <th key={m} className="num">{m}</th>)}
                  {!annualOnly && <th className="num">FY total</th>}
                </tr>
              </thead>
              <tbody>
                {units.map((u) => (
                  <tr key={u.unit}>
                    <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{u.unit}</td>
                    {annualOnly ? (
                      <td className="num" style={{ fontWeight: 700, color: "var(--b-accent)" }}>{money(u.fyTotal)}</td>
                    ) : (
                      <>
                        {u.months.map((m, i) => <td key={i} className="num">{m.amount ? money(m.amount) : "—"}</td>)}
                        <td className="num" style={{ fontWeight: 700, color: "var(--b-accent)" }}>{money(u.fyTotal)}</td>
                      </>
                    )}
                  </tr>
                ))}
                <tr className="total">
                  <td>All line items</td>
                  {annualOnly ? (
                    <td className="num">{money(total)}</td>
                  ) : (
                    <>
                      {monthLabels.map((m, i) => {
                        const col = units.reduce((a, u) => a + (u.months[i]?.amount ?? 0), 0);
                        return <td key={m} className="num">{col ? money(col) : "—"}</td>;
                      })}
                      <td className="num">{money(total)}</td>
                    </>
                  )}
                </tr>
              </tbody>
            </table>
          </div>

          <p className="board-updated" style={{ marginTop: 16 }}>Projected annual fleet costs.</p>
        </>
      )}
    </>
  );
}

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

  return (
    <>
      <p className="board-eyebrow">Fleet</p>
      <h1 className="board-h1">Truck Maintenance</h1>
      <p className="board-sub">Itemized repair actuals per ambulance for FY&nbsp;25&ndash;26, from the district&rsquo;s maintenance records. These real numbers replace the old flat $3,333/unit estimate as the fleet-maintenance budget basis.</p>

      {!loaded && <div className="board-card" style={{ marginTop: 22 }}><p style={{ margin: 0 }}>Fleet maintenance detail has not been imported yet — upload the workbook on the Admin page to load it.</p></div>}

      {loaded && (
        <>
          <div className="board-grid k3" style={{ marginTop: 22 }}>
            <div className="board-card board-stat"><div className="lbl">Total maintenance</div><div className="val">{money(total)}</div><div className="sub">All units, FY 25&ndash;26 actuals</div></div>
            <div className="board-card board-stat"><div className="lbl">Costliest unit</div><div className="val">{top ? top.unit : "—"}</div><div className="sub">{top ? `${money(top.amt)} this year` : ""}</div></div>
            <div className="board-card board-stat"><div className="lbl">Units tracked</div><div className="val">{units.length}</div><div className="sub">Front-line ambulances</div></div>
          </div>

          <h2 className="board-h2">Repairs by month</h2>
          <div className="board-tw">
            <table>
              <thead>
                <tr>
                  <th>Unit</th>
                  {monthLabels.map((m) => <th key={m} className="num">{m}</th>)}
                  <th className="num">FY total</th>
                </tr>
              </thead>
              <tbody>
                {units.map((u) => (
                  <tr key={u.unit}>
                    <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{u.unit}</td>
                    {u.months.map((m, i) => <td key={i} className="num">{m.amount ? money(m.amount) : "—"}</td>)}
                    <td className="num" style={{ fontWeight: 700, color: "var(--b-accent)" }}>{money(u.fyTotal)}</td>
                  </tr>
                ))}
                <tr className="total">
                  <td>All units</td>
                  {monthLabels.map((m, i) => {
                    const col = units.reduce((a, u) => a + (u.months[i]?.amount ?? 0), 0);
                    return <td key={m} className="num">{col ? money(col) : "—"}</td>;
                  })}
                  <td className="num">{money(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="board-updated" style={{ marginTop: 16 }}>Source: Truck Maintenance worksheet (district itemized records). April not itemized in the source; per-unit YTD totals are the controlling figures.</p>
        </>
      )}
    </>
  );
}

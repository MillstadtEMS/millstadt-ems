import { getPersonnel } from "@/lib/board/personnel";
import { getFinance, money } from "@/lib/board/finance";

export const dynamic = "force-dynamic";

export default async function PersonnelPage() {
  const [{ groups, costs }, { byKey }] = await Promise.all([getPersonnel(), getFinance()]);
  const total = byKey["exp_personnel"]?.value ?? null;
  const loaded = groups.length > 0;
  const staff = groups.reduce((a, g) => a + (g.count ?? 0), 0);

  return (
    <>
      <p className="board-eyebrow">People &amp; payroll</p>
      <h1 className="board-h1">Personnel</h1>
      <p className="board-sub">What our people cost — wages plus the employer&rsquo;s share of taxes, benefits, and processing. Broken out by group so you can see the total cost per employee, not just the hourly rate.</p>

      {!loaded && <div className="board-card" style={{ marginTop: 22 }}><p style={{ margin: 0 }}>Personnel detail has not been imported yet — upload the workbook on the Admin page to load it.</p></div>}

      {loaded && (
        <>
          <div className="board-grid k3" style={{ marginTop: 22 }}>
            <div className="board-card board-stat"><div className="lbl">Total personnel cost</div><div className="val">{money(total)}</div><div className="sub">Wages + benefits + employer taxes</div></div>
            <div className="board-card board-stat"><div className="lbl">People</div><div className="val">{staff}</div><div className="sub">Full-time + part-time (roster)</div></div>
            <div className="board-card board-stat"><div className="lbl">Groups</div><div className="val">{groups.length}</div><div className="sub">Chiefs · FT &amp; PT medics/EMTs</div></div>
          </div>

          <h2 className="board-h2">Cost per employee, by group</h2>
          <div className="board-tw">
            <table>
              <thead><tr><th>Group</th><th className="num"># </th><th className="num">Rate</th><th className="num">Gross pay</th><th className="num">Employer taxes</th><th className="num">Benefits</th><th className="num">Total cost</th><th className="num">Per employee</th></tr></thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.name}>
                    <td style={{ fontWeight: 600 }}>{g.name}</td>
                    <td className="num">{g.count ?? "—"}</td>
                    <td className="num">{g.rate != null ? (g.rate > 1000 ? money(g.rate) : `$${g.rate}/hr`) : "—"}</td>
                    <td className="num">{money(g.gross)}</td>
                    <td className="num">{money(g.taxes)}</td>
                    <td className="num">{money(g.benefits)}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{money(g.total)}</td>
                    <td className="num" style={{ color: "var(--b-accent)", fontWeight: 700 }}>{money(g.perEmployee)}</td>
                  </tr>
                ))}
                <tr className="total"><td>All personnel</td><td className="num">{staff}</td><td></td><td></td><td></td><td></td><td className="num">{money(total)}</td><td></td></tr>
              </tbody>
            </table>
          </div>

          {costs.length > 0 && (
            <>
              <h2 className="board-h2">Where the employer money goes</h2>
              <p className="board-sub" style={{ marginBottom: 12 }}>Beyond wages, these are the employer taxes, benefits, and processing costs.</p>
              <div className="board-tw" style={{ maxWidth: 560 }}>
                <table>
                  <thead><tr><th>Cost</th><th className="num">Annual amount</th></tr></thead>
                  <tbody>
                    {costs.map((c) => (<tr key={c.label}><td>{c.label}</td><td className="num">{money(c.amount)}</td></tr>))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <p className="board-updated" style={{ marginTop: 16 }}>Source: Personnel worksheet. PTO is covered by part-time staff (kept separate from full-time).</p>
        </>
      )}
    </>
  );
}

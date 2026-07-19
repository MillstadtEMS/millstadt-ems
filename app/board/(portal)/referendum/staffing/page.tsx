import { getPersonnel } from "@/lib/board/personnel";
import { getFinance, money } from "@/lib/board/finance";
import { isSalaryRoleLabel, SALARY_ROLLUP_LABEL } from "@/lib/board/salaryRollup";

export const dynamic = "force-dynamic";

export default async function PersonnelPage() {
  const [{ groups, costs }, { byKey }] = await Promise.all([getPersonnel(), getFinance()]);
  const total = byKey["exp_personnel"]?.value ?? null;
  const loaded = groups.length > 0;
  const staff = groups.reduce((a, g) => a + (g.count ?? 0), 0);
  const salaryGroups = groups.filter((group) => isSalaryRoleLabel(group.name));
  const otherGroups = groups.filter((group) => !isSalaryRoleLabel(group.name));
  const salaryStaff = salaryGroups.reduce((sum, group) => sum + (group.count ?? 0), 0);
  const salaryAmount = salaryGroups.reduce((sum, group) => sum + (group.gross ?? group.total ?? 0), 0);
  const displayGroups = salaryGroups.length > 0
    ? [
        {
          name: SALARY_ROLLUP_LABEL,
          count: salaryStaff || null,
          rate: null,
          gross: salaryAmount,
          taxes: null,
          benefits: null,
          uniform: null,
          training: null,
          total: salaryAmount,
          perEmployee: salaryStaff > 0 ? salaryAmount / salaryStaff : null,
        },
        ...otherGroups,
      ]
    : groups;
  const displayedSubtotal = displayGroups.reduce((sum, group) => sum + (group.total ?? group.gross ?? 0), 0);
  const hasEmployerCosts = costs.some((cost) => (cost.amount ?? 0) > 0);
  const costSummary = hasEmployerCosts ? "Salaries plus listed employer costs" : "Salaries";

  return (
    <>
      <p className="board-eyebrow">Proposed staffing</p>
      <h1 className="board-h1">Proposed Full-Time Staffing Model</h1>
      <p className="board-sub">Proposed Future Staffing</p>
      <div className="board-chip review" style={{ display: "inline-flex", marginTop: 12 }}>Proposed future staffing — not current staffing</div>

      {!loaded && <div className="board-card" style={{ marginTop: 22 }}><p style={{ margin: 0 }}>Personnel detail has not been imported yet — upload the workbook on the Admin page to load it.</p></div>}

      {loaded && (
        <>
          <div className="board-grid k3" style={{ marginTop: 22 }}>
            <div className="board-card board-stat"><div className="lbl">Projected Personnel Cost</div><div className="val">{money(total)}</div><div className="sub">{costSummary}</div></div>
            <div className="board-card board-stat"><div className="lbl">Employees</div><div className="val">{staff}</div><div className="sub">Proposed staffing model</div></div>
            <div className="board-card board-stat"><div className="lbl">Salaries</div><div className="val">{money(salaryGroups.length > 0 ? salaryAmount : displayedSubtotal)}</div><div className="sub">Chief, paramedic and EMT roles combined</div></div>
          </div>

          <h2 className="board-h2">Salaries</h2>
          <div className="board-tw">
            <table>
              <thead><tr><th>Category</th><th className="num">Employees</th><th className="num">Annual amount</th></tr></thead>
              <tbody>
                {displayGroups.map((g) => (
                  <tr key={g.name}>
                    <td style={{ fontWeight: 600 }}>{g.name}</td>
                    <td className="num">{g.count ?? "—"}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{money(g.total ?? g.gross)}</td>
                  </tr>
                ))}
                {displayGroups.length > 1 && (
                  <tr className="total"><td>Staffing subtotal</td><td className="num">{staff}</td><td className="num">{money(displayedSubtotal)}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {costs.length > 0 && (
            <>
              <h2 className="board-h2">Employer Cost Detail</h2>
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
          <p className="board-updated" style={{ marginTop: 16 }}>Projected staffing model.</p>
        </>
      )}
    </>
  );
}

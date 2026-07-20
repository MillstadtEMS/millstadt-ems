import { getForecast } from "@/lib/board/detail";
import { money } from "@/lib/board/finance";
import { requireBoardBudgetSection } from "@/lib/board/budget-access";

export const dynamic = "force-dynamic";

const SCENARIOS: { key: string; label: string }[] = [
  { key: "Expected", label: "Expected Growth" },
  { key: "Low", label: "Low Growth" },
  { key: "High", label: "High Growth" },
];

function firstPositiveYear(surplus: (number | null)[]): number | null {
  for (let i = 0; i < surplus.length; i++) if ((surplus[i] ?? -1) > 0) return i + 1;
  return null;
}

export default async function ForecastPage() {
  await requireBoardBudgetSection("forecast");
  const byScenario = await getForecast();
  const loaded = Object.keys(byScenario).length > 0;
  const expected = byScenario["Expected"] ?? [];
  const expSurplus = expected.find((r) => /surplus|deficit/i.test(r.category))?.y ?? [];
  const turnsPositive = firstPositiveYear(expSurplus);

  return (
    <>
      <p className="board-eyebrow">Looking ahead</p>
      <h1 className="board-h1">Forecast</h1>
      <p className="board-sub">Five-year projection from the workbook.</p>

      {!loaded && <div className="board-card" style={{ marginTop: 22 }}><p style={{ margin: 0 }}>Forecast detail has not been imported yet — upload the workbook on the Admin page to load it.</p></div>}

      {loaded && (
        <>
          {turnsPositive && (
            <div className="board-verdict ok" style={{ marginTop: 22 }}>
              <div className="big">Expected Scenario: Positive Surplus in Year {turnsPositive}</div>
            </div>
          )}

          {SCENARIOS.map(({ key, label }) => {
            const rows = byScenario[key];
            if (!rows || rows.length === 0) return null;
            return (
              <section key={key} style={{ marginTop: 30 }}>
                <h2 className="board-h2" style={{ marginBottom: 4 }}>{label}</h2>
                <div className="board-tw">
                  <table>
                    <thead>
                      <tr><th>Category</th><th className="num">Year 1</th><th className="num">Year 2</th><th className="num">Year 3</th><th className="num">Year 4</th><th className="num">Year 5</th></tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => {
                        const isSurplus = /surplus|deficit/i.test(r.category);
                        return (
                          <tr key={r.category} className={r.isTotal ? "total" : undefined}>
                            <td style={{ fontWeight: r.isTotal ? 700 : 500 }}>{r.category}</td>
                            {r.y.map((v, i) => (
                              <td key={i} className="num" style={isSurplus ? { fontWeight: 700, color: (v ?? 0) >= 0 ? "var(--b-good)" : "var(--b-crit)" } : undefined}>
                                {isSurplus && (v ?? 0) < 0 ? `(${money(Math.abs(v ?? 0))})` : money(v)}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}

          <p className="board-updated" style={{ marginTop: 20 }}>Five-year projection.</p>
        </>
      )}
    </>
  );
}

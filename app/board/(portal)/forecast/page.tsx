import { getForecast } from "@/lib/board/detail";
import { money } from "@/lib/board/finance";

export const dynamic = "force-dynamic";

const SCENARIOS: { key: string; label: string; note: string }[] = [
  { key: "Expected", label: "Expected Growth", note: "Our planning baseline." },
  { key: "Low", label: "Low Growth", note: "Conservative — revenue lags, costs still climb." },
  { key: "High", label: "High Growth", note: "Optimistic — stronger revenue growth." },
];

function firstPositiveYear(surplus: (number | null)[]): number | null {
  for (let i = 0; i < surplus.length; i++) if ((surplus[i] ?? -1) > 0) return i + 1;
  return null;
}

export default async function ForecastPage() {
  const byScenario = await getForecast();
  const loaded = Object.keys(byScenario).length > 0;
  const expected = byScenario["Expected"] ?? [];
  const expSurplus = expected.find((r) => /surplus|deficit/i.test(r.category))?.y ?? [];
  const turnsPositive = firstPositiveYear(expSurplus);

  return (
    <>
      <p className="board-eyebrow">Looking ahead</p>
      <h1 className="board-h1">Five-Year Forecast</h1>
      <p className="board-sub">Three growth scenarios projected over five years. Year&nbsp;1 is the FY&nbsp;2026&ndash;27 budget; later years apply scenario growth rates, with debt service following the actual amortization schedule.</p>

      {!loaded && <div className="board-card" style={{ marginTop: 22 }}><p style={{ margin: 0 }}>Forecast detail has not been imported yet — upload the workbook on the Admin page to load it.</p></div>}

      {loaded && (
        <>
          {turnsPositive && (
            <div className="board-verdict ok" style={{ marginTop: 22 }}>
              <div className="big">Balances by Year {turnsPositive}</div>
              <p style={{ margin: "6px 0 0", color: "var(--b-muted)" }}>Under the Expected scenario, the budget returns to a surplus in Year {turnsPositive} and stays positive after that. The first-year deficit is a bridge, not a trend.</p>
            </div>
          )}

          {SCENARIOS.map(({ key, label, note }) => {
            const rows = byScenario[key];
            if (!rows || rows.length === 0) return null;
            return (
              <section key={key} style={{ marginTop: 30 }}>
                <h2 className="board-h2" style={{ marginBottom: 4 }}>{label}</h2>
                <p className="board-sub" style={{ marginBottom: 12 }}>{note}</p>
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

          <p className="board-updated" style={{ marginTop: 20 }}>Source: Five-Year Forecast worksheet. Growth rates live on the Assumptions tab; medical-supply lines are trended higher than general inflation.</p>
        </>
      )}
    </>
  );
}

import { getFinance } from "@/lib/board/finance";
import LevyCalculator from "@/components/board/LevyCalculator";

export const dynamic = "force-dynamic";

export default async function LevyPage() {
  const { byKey } = await getFinance();
  const eav = byKey["district_eav"]?.value ?? null;
  const eavCell = byKey["district_eav"]?.sourceCell ?? null;
  const currentScenario = byKey["levy_scenario"]?.textValue ?? null;

  return (
    <>
      <p className="board-eyebrow">Property tax planning tool</p>
      <h1 className="board-h1">Levy calculator</h1>
      <p className="board-sub">Type a tax rate the way people say it (for example <strong>0.30</strong> for a 0.30% levy) and see what it would raise — and roughly what it costs a homeowner. This is a planning tool; it does not change the budget.</p>
      {eav == null ? (
        <div className="board-card" style={{ marginTop: 22 }}><p style={{ margin: 0 }}>The district EAV has not been loaded yet, so the calculator can not run. Once the workbook import runs it fills in automatically.</p></div>
      ) : (
        <LevyCalculator eav={eav} eavCell={eavCell} currentScenario={currentScenario} />
      )}
    </>
  );
}

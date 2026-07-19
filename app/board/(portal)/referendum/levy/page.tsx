import { getFinance } from "@/lib/board/finance";
import { currentBoardUser, isAdmin } from "@/lib/board/auth";
import LevyCalculator from "@/components/board/LevyCalculator";

export const dynamic = "force-dynamic";

export default async function LevyPage() {
  const [user, { byKey }] = await Promise.all([currentBoardUser(), getFinance()]);
  const eav = byKey["district_eav"]?.value ?? null;
  const eavCell = byKey["district_eav"]?.sourceCell ?? null;
  const currentScenario = byKey["levy_scenario"]?.textValue ?? null;
  const currentLevyRevenue = byKey["current_ambulance_revenue"]?.value ?? byKey["rev_total"]?.value ?? 0;
  const totalProjectedAnnualNeed = byKey["exp_total"]?.value ?? 0;
  const requiredRevenue = byKey["levy_required"]?.value ?? totalProjectedAnnualNeed;
  const propertyMarketValue = byKey["property_market_value"]?.value ?? 200000;

  return (
    <>
      <p className="board-eyebrow">Property tax planning</p>
      <h1 className="board-h1">Levy Calculator</h1>
      <p className="board-sub">Projected EMS District revenue based on EAV and levy rate.</p>
      {eav == null ? (
        <div className="board-card" style={{ marginTop: 22 }}><p style={{ margin: 0 }}>Equalized Assessed Value (EAV) has not been loaded from the workbook.</p></div>
      ) : (
        <LevyCalculator
          eav={eav}
          eavCell={eavCell}
          currentScenario={currentScenario}
          currentLevyRevenue={currentLevyRevenue}
          totalProjectedAnnualNeed={totalProjectedAnnualNeed}
          requiredRevenue={requiredRevenue}
          initialPropertyMarketValue={propertyMarketValue}
          canSaveModelValue={isAdmin(user)}
        />
      )}
    </>
  );
}

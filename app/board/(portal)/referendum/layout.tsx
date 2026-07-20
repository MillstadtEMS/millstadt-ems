import { redirect } from "next/navigation";
import ReferendumNav from "@/components/board/ReferendumNav";
import { getCurrentBudgetAccess } from "@/lib/board/budget-access";

export const dynamic = "force-dynamic";

export default async function ReferendumLayout({ children }: { children: React.ReactNode }) {
  const access = await getCurrentBudgetAccess();
  if (!access) redirect("/board");
  if (access.visibleSections.length === 0) redirect("/board");

  return (
    <>
      <ReferendumNav visibleSections={access.visibleSections} />
      <div className="board-notice" role="note">
        Projected financial model for the proposed EMS District. These figures do not represent current staffing or current accounting results.
      </div>
      {children}
    </>
  );
}

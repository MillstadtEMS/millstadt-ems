import { redirect } from "next/navigation";
import ReferendumNav from "@/components/board/ReferendumNav";
import { currentBoardUser } from "@/lib/board/auth";
import { canViewFinancialModel } from "@/lib/board/governance";

export const dynamic = "force-dynamic";

export default async function ReferendumLayout({ children }: { children: React.ReactNode }) {
  const user = await currentBoardUser();
  if (!user || !canViewFinancialModel(user)) redirect("/board");

  return (
    <>
      <ReferendumNav />
      <div className="board-notice" role="note">
        Projected financial model for the proposed EMS District. These figures do not represent current staffing or current accounting results.
      </div>
      {children}
    </>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { currentBoardUser } from "@/lib/board/auth";
import {
  canViewFinancialModel,
  firstVisibleBudgetSectionPath,
  getFireBoardAccessStatus,
  visibleBudgetSectionsForUser,
} from "@/lib/board/governance";
import { BoardActionLink, BoardCard, BoardPageHeader, BoardSectionHeader, BoardStatusChip } from "@/components/board/BoardPrimitives";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const user = await currentBoardUser();
  if (!user) return null;
  const fireAccess = await getFireBoardAccessStatus();
  const visibleBudgetSections = visibleBudgetSectionsForUser(user, fireAccess.level, fireAccess.budgetSections);
  const showReferendum = canViewFinancialModel(user, fireAccess.level, fireAccess.budgetSections);
  const budgetHref = firstVisibleBudgetSectionPath(visibleBudgetSections) ?? "/board/referendum";
  if (!showReferendum) redirect("/board");

  return (
    <>
      <BoardPageHeader eyebrow="Governance" title="Documents" />
      <BoardCard className="board-referendum-panel">
        <BoardStatusChip tone="accent">Available</BoardStatusChip>
        <BoardSectionHeader title="Budget model" />
        <BoardActionLink href={budgetHref} label="EMS Budget Model" meta="Board budget planning" />
        <Link href={budgetHref} className="board-btn-primary">Open budget</Link>
      </BoardCard>
    </>
  );
}

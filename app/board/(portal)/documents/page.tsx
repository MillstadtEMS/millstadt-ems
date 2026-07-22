import Link from "next/link";
import { redirect } from "next/navigation";
import { currentBoardUser } from "@/lib/board/auth";
import {
  canViewBudgetWorkbook,
  getFireBoardAccessStatus,
} from "@/lib/board/governance";
import { BoardActionLink, BoardCard, BoardPageHeader, BoardSectionHeader, BoardStatusChip } from "@/components/board/BoardPrimitives";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const user = await currentBoardUser();
  if (!user) return null;
  const fireAccess = await getFireBoardAccessStatus();
  const showReferendum = canViewBudgetWorkbook(user, fireAccess.level, fireAccess.budgetSections);
  const budgetHref = "/board/referendum";
  if (!showReferendum) redirect("/board");

  return (
    <>
      <BoardPageHeader eyebrow="Governance" title="Documents" />
      <BoardCard className="board-referendum-panel">
        <BoardStatusChip tone="accent">Available</BoardStatusChip>
        <BoardSectionHeader title="Budget workbook" />
        <BoardActionLink href={budgetHref} label="Referendum Budget Workbook" meta="Shared read-only worksheet" />
        <Link href={budgetHref} className="board-btn-primary">Open budget</Link>
      </BoardCard>
    </>
  );
}

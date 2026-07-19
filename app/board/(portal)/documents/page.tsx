import Link from "next/link";
import { redirect } from "next/navigation";
import { currentBoardUser } from "@/lib/board/auth";
import { canViewFinancialModel } from "@/lib/board/governance";
import { BoardActionLink, BoardCard, BoardPageHeader, BoardSectionHeader, BoardStatusChip } from "@/components/board/BoardPrimitives";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const user = await currentBoardUser();
  if (!user) return null;
  const showReferendum = canViewFinancialModel(user);
  if (!showReferendum) redirect("/board");

  return (
    <>
      <BoardPageHeader eyebrow="Governance" title="Documents" />
      <BoardCard className="board-referendum-panel">
        <BoardStatusChip tone="accent">Available</BoardStatusChip>
        <BoardSectionHeader title="Budget model" />
        <BoardActionLink href="/board/referendum" label="EMS Budget Model" meta="Board budget planning" />
        <Link href="/board/referendum" className="board-btn-primary">Open budget</Link>
      </BoardCard>
    </>
  );
}

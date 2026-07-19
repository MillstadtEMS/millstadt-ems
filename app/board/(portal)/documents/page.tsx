import Link from "next/link";
import { currentBoardUser } from "@/lib/board/auth";
import { canViewFinancialModel } from "@/lib/board/governance";
import { BoardActionLink, BoardCard, BoardEmptyState, BoardPageHeader, BoardSectionHeader, BoardStatusChip } from "@/components/board/BoardPrimitives";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const user = await currentBoardUser();
  if (!user) return null;
  const showReferendum = canViewFinancialModel(user);

  return (
    <>
      <BoardPageHeader eyebrow="Governance" title="Documents" />
      {showReferendum ? (
        <BoardCard className="board-referendum-panel">
          <BoardStatusChip tone="accent">Available</BoardStatusChip>
          <BoardSectionHeader title="Referendum model" />
          <BoardActionLink href="/board/referendum" label="Proposed EMS District Financial Model" meta="Board financial model surface" />
          <Link href="/board/referendum" className="board-btn-primary">Open referendum model</Link>
        </BoardCard>
      ) : (
        <BoardEmptyState title="No documents available." />
      )}
    </>
  );
}

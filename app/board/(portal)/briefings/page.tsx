import Link from "next/link";
import { currentBoardUser } from "@/lib/board/auth";
import { getNextMeeting, userBoards } from "@/lib/board/governance";
import { BoardActionLink, BoardCard, BoardEmptyState, BoardPageHeader, BoardSectionHeader, BoardStatusChip } from "@/components/board/BoardPrimitives";

export const dynamic = "force-dynamic";

export default async function BriefingsPage() {
  const user = await currentBoardUser();
  if (!user) return null;
  const meeting = userBoards(user).length > 0 ? await getNextMeeting(user) : null;

  return (
    <>
      <BoardPageHeader eyebrow="Governance" title="Board briefings" />
      {meeting ? (
        <BoardCard className="board-referendum-panel">
          <BoardStatusChip tone="accent">Next meeting</BoardStatusChip>
          <BoardSectionHeader title={meeting.title ?? "Meeting briefing workspace"} />
          <BoardActionLink href={`/board/meetings/${meeting.id}#briefing`} label="Open meeting briefing" meta={`${meeting.date} · ${meeting.startTime ?? "Time pending"}`} />
          <Link href={`/board/meetings/${meeting.id}#briefing`} className="board-btn-secondary">Review questions</Link>
        </BoardCard>
      ) : (
        <BoardEmptyState title="No board briefings available." />
      )}
    </>
  );
}

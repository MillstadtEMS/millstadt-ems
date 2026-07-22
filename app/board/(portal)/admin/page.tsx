import { redirect } from "next/navigation";
import { currentBoardUser, isAdmin } from "@/lib/board/auth";
import { BoardActionLink, BoardCard, BoardPageHeader, BoardSectionHeader } from "@/components/board/BoardPrimitives";

export const dynamic = "force-dynamic";

export default async function BoardAdmin() {
  const user = await currentBoardUser();
  if (!user || !isAdmin(user)) redirect("/board");

  return (
    <>
      <BoardPageHeader eyebrow="Administrator" title="Administration" />

      <BoardCard style={{ marginTop: 18 }}>
        <BoardSectionHeader title="Admin tools" />
        <div className="board-action-queue">
          <BoardActionLink href="/board/referendum" label="Shared budget workbook" meta="Read-only board view and workbook replacement" />
          <BoardActionLink href="/board/admin/visibility" label="Fire Board access" meta="Control what Fire Board users can see" />
          <BoardActionLink href="/board/admin/appearance" label="Appearance and dashboard layout" meta="Presentation controls" />
        </div>
      </BoardCard>
    </>
  );
}

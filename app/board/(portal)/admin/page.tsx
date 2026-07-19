import { redirect } from "next/navigation";
import { currentBoardUser, isAdmin } from "@/lib/board/auth";
import { getFinance } from "@/lib/board/finance";
import WorkbookUpload from "@/components/board/WorkbookUpload";
import { BoardActionLink, BoardCard, BoardPageHeader, BoardSectionHeader } from "@/components/board/BoardPrimitives";

export const dynamic = "force-dynamic";

export default async function BoardAdmin() {
  const user = await currentBoardUser();
  if (!user || !isAdmin(user)) redirect("/board");
  const { updatedAt } = await getFinance();

  return (
    <>
      <BoardPageHeader eyebrow="Administrator" title="Administration" />

      <div style={{ marginTop: 24 }}>
        <WorkbookUpload />
      </div>

      <BoardCard style={{ marginTop: 18 }}>
        <BoardSectionHeader title="Admin tools" />
        <div className="board-action-queue">
          <BoardActionLink href="/board/admin/model-review" label="Model review" meta="Workbook and sync status" />
          <BoardActionLink href="/board/admin/appearance" label="Appearance and dashboard layout" meta="Presentation controls" />
        </div>
      </BoardCard>

      <p className="board-updated" style={{ marginTop: 18 }}>
        Financials last refreshed: {updatedAt ? new Date(updatedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "not loaded"}
      </p>
    </>
  );
}

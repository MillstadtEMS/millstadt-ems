import { redirect } from "next/navigation";
import ReadonlyWorkbook from "@/components/board/ReadonlyWorkbook";
import { BoardPageHeader, BoardStatusChip } from "@/components/board/BoardPrimitives";
import { getCurrentBudgetAccess } from "@/lib/board/budget-access";
import {
  audienceForBoardUser,
  canManageBoardWorkbook,
  filterWorkbookForAudience,
  getBoardWorkbookVisibilitySettings,
  getCurrentBoardWorkbookView,
} from "@/lib/board/workbook";

export const dynamic = "force-dynamic";

export default async function ReferendumWorkbookPage() {
  const access = await getCurrentBudgetAccess();
  if (!access || !access.canViewWorkbook) redirect("/board");

  const workbook = await getCurrentBoardWorkbookView();
  const allSheetNames = workbook.sheets.map((sheet) => sheet.name);
  const visibilitySettings = await getBoardWorkbookVisibilitySettings(allSheetNames);
  const canUpload = canManageBoardWorkbook(access.user);
  const visibleWorkbook = canUpload
    ? workbook
    : filterWorkbookForAudience(workbook, audienceForBoardUser(access.user), visibilitySettings);

  return (
    <>
      <BoardPageHeader
        eyebrow="Budget workbook"
        title="Referendum Budget"
        description="Read-only board copy of the current referendum budget worksheet."
        actions={<BoardStatusChip tone={canUpload ? "good" : "neutral"}>{canUpload ? "Uploader" : "View only"}</BoardStatusChip>}
      />
      <ReadonlyWorkbook
        workbook={visibleWorkbook}
        canUpload={canUpload}
        allSheetNames={allSheetNames}
        visibilitySettings={canUpload ? visibilitySettings : null}
      />
    </>
  );
}

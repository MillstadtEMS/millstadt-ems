import { redirect } from "next/navigation";
import { currentBoardUser, isAdmin } from "@/lib/board/auth";
import { getFinance } from "@/lib/board/finance";
import WorkbookUpload from "@/components/board/WorkbookUpload";

export const dynamic = "force-dynamic";

export default async function BoardAdmin() {
  const user = await currentBoardUser();
  if (!user || !isAdmin(user)) redirect("/board");
  const { updatedAt } = await getFinance();

  return (
    <>
      <p className="board-eyebrow">Administrator</p>
      <h1 className="board-h1">Administration</h1>
      <p className="board-sub">Manage the workbook connection and portal settings. Live two-way OneDrive sync (Microsoft Graph) is next now that the Azure account exists; until then, this upload is how workbook changes reach the site.</p>

      <div style={{ marginTop: 24 }}>
        <WorkbookUpload />
      </div>

      <p className="board-updated" style={{ marginTop: 18 }}>
        Financials last refreshed: {updatedAt ? new Date(updatedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "not loaded"}
      </p>
    </>
  );
}

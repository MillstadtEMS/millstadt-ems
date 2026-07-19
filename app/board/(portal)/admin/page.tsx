import { redirect } from "next/navigation";
import Link from "next/link";
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
      <p className="board-sub">Workbook import, model status, and portal settings.</p>

      <div style={{ marginTop: 24 }}>
        <WorkbookUpload />
      </div>

      <div className="board-grid k2" style={{ marginTop: 18 }}>
        <Link href="/board/admin/model-review" className="board-card board-link-card">
          <div className="board-stat">
            <div className="lbl">Model Status</div>
            <div className="val">Open</div>
          </div>
        </Link>
      </div>

      <p className="board-updated" style={{ marginTop: 18 }}>
        Financials last refreshed: {updatedAt ? new Date(updatedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "not loaded"}
      </p>
    </>
  );
}

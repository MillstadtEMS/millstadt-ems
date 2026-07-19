import { redirect } from "next/navigation";
import { currentBoardUser, isAdmin } from "@/lib/board/auth";
import BoardPlaceholderPage from "@/components/board/BoardPlaceholderPage";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const user = await currentBoardUser();
  if (!user || !isAdmin(user)) redirect("/board");
  return <BoardPlaceholderPage eyebrow="Administrator" title="Audit" emptyTitle="No audit records are available in this view." />;
}

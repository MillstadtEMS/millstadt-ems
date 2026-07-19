import { redirect } from "next/navigation";
import { currentBoardUser, isAdmin } from "@/lib/board/auth";
import DashboardLayoutEditor from "@/components/board/DashboardLayoutEditor";
import { BoardPageHeader } from "@/components/board/BoardPrimitives";

export const dynamic = "force-dynamic";

export default async function AppearancePage() {
  const user = await currentBoardUser();
  if (!user || !isAdmin(user)) redirect("/board");

  return (
    <>
      <BoardPageHeader eyebrow="Administrator" title="Appearance and dashboard layout" />
      <DashboardLayoutEditor />
    </>
  );
}

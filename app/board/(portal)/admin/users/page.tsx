import { redirect } from "next/navigation";
import { currentBoardUser, isAdmin } from "@/lib/board/auth";
import BoardPlaceholderPage from "@/components/board/BoardPlaceholderPage";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await currentBoardUser();
  if (!user || !isAdmin(user)) redirect("/board");
  return <BoardPlaceholderPage eyebrow="Administrator" title="Users" emptyTitle="No user-management table is available in this view." />;
}

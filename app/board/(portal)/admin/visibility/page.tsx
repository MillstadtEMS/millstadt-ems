import { redirect } from "next/navigation";
import { currentBoardUser, isAdmin } from "@/lib/board/auth";
import BoardPlaceholderPage from "@/components/board/BoardPlaceholderPage";

export const dynamic = "force-dynamic";

export default async function VisibilityPage() {
  const user = await currentBoardUser();
  if (!user || !isAdmin(user)) redirect("/board");
  return <BoardPlaceholderPage eyebrow="Administrator" title="Visibility" emptyTitle="No visibility overrides are configured." />;
}

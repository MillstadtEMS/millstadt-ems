import { redirect } from "next/navigation";
import { currentBoardUser, isAdmin } from "@/lib/board/auth";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const user = await currentBoardUser();
  if (!user || !isAdmin(user)) redirect("/board");
  redirect("/board/admin");
}

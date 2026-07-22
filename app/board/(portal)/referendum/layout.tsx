import { redirect } from "next/navigation";
import { getCurrentBudgetAccess } from "@/lib/board/budget-access";

export const dynamic = "force-dynamic";

export default async function ReferendumLayout({ children }: { children: React.ReactNode }) {
  const access = await getCurrentBudgetAccess();
  if (!access) redirect("/board");
  if (!access.canViewWorkbook) redirect("/board");

  return <>{children}</>;
}

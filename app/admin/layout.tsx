import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import LoungeShell from "@/components/lounge/LoungeShell";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · MAS Admin" },
  robots: "noindex,nofollow",
};

export const dynamic = "force-dynamic";

// One shell. /admin/* now uses the same LoungeShell as the rest of the
// Employee Lounge — so admins click between Filing Cabinet, Ticker
// Editor, Incident Reports, etc. without jumping into a different
// chrome.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await currentEmployee();
  if (!session) redirect("/lounge/login");
  if (!session.isAdmin) redirect("/lounge");

  const emp = await getEmployee(session.id);

  const me = {
    firstName: session.firstName,
    lastName: session.lastName,
    certification: emp?.certification ?? null,
    photoUrl: emp?.photoUrl ?? null,
    isAdmin: session.isAdmin,
  };

  return <LoungeShell me={me}>{children}</LoungeShell>;
}

import { redirect } from "next/navigation";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import LoungeShell from "@/components/lounge/LoungeShell";
import LeadIIRunner from "@/components/lounge/LeadIIRunner";

export const dynamic = "force-dynamic";

export default async function LeadIIPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await currentEmployee();
  if (!session) redirect("/lounge/login");
  const row = await getEmployee(session.id);
  const me = {
    firstName: session.firstName,
    lastName: session.lastName,
    certification: row?.certification ?? null,
    photoUrl: row?.photoUrl ?? null,
    isAdmin: session.isAdmin,
  };
  const params = await searchParams;
  const raw = typeof params.level === "string" ? params.level : "beginner";
  const level = (["beginner", "intermediate", "expert"].includes(raw) ? raw : "beginner") as "beginner" | "intermediate" | "expert";

  return (
    <LoungeShell me={me}>
      <LeadIIRunner playerName={session.firstName} level={level} />
    </LoungeShell>
  );
}

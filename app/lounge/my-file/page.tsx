import { redirect } from "next/navigation";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import LoungeShell from "@/components/lounge/LoungeShell";
import MyFileClient from "@/components/lounge/MyFileClient";

export const dynamic = "force-dynamic";

export default async function MyFilePage() {
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

  return (
    <LoungeShell me={me}>
      <header style={{ marginBottom: 18 }}>
        <div style={{ color: "#f0b429", fontSize: "0.7rem", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
          My Employee File
        </div>
        <h1 style={{ margin: "4px 0 6px", fontSize: "1.85rem", fontWeight: 900, letterSpacing: "-0.015em" }}>
          Documents shared with you
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "0.92rem", lineHeight: 1.55 }}>
          Only records that leadership has explicitly shared with you appear here. Anything that
          requires acknowledgment is highlighted at the top.
        </p>
      </header>
      <MyFileClient />
    </LoungeShell>
  );
}

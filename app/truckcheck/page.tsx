import { redirect } from "next/navigation";
import { isTruckCheckAuthed } from "@/lib/truckcheck/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import LoungeShell from "@/components/lounge/LoungeShell";
import TruckCheckForm from "./TruckCheckForm";

export const dynamic = "force-dynamic";

export default async function TruckCheckPage() {
  if (!(await isTruckCheckAuthed())) {
    redirect("/truckcheck/login");
  }

  const now = new Date();
  const stamp = now.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  // When the visitor also has a valid lounge session (true whenever
  // they came in via the SSO bridge — which is the normal flow for
  // crew), wrap this page in LoungeShell so the sidebar + mobile
  // bottom-tab bar stay visible. Visitors who came in via the legacy
  // shared truckcheck password (no lounge session) get the bare page
  // they used to.
  const session = await currentEmployee();
  const row = session ? await getEmployee(session.id) : null;
  const me = session
    ? {
        firstName: session.firstName,
        lastName: session.lastName,
        certification: row?.certification ?? null,
        photoUrl: row?.photoUrl ?? null,
        isAdmin: session.isAdmin,
      }
    : null;

  const body = (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 80px", paddingTop: "calc(24px + env(safe-area-inset-top))", paddingBottom: "calc(80px + env(safe-area-inset-bottom))" }}>
      <header style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ color: "#f0b429", fontSize: 11, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Millstadt EMS
          </div>
          <h1 style={{ color: "white", fontSize: 28, fontWeight: 900, margin: "4px 0 6px", letterSpacing: "-0.02em" }}>Truck Check</h1>
          <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>{stamp}</div>
        </div>
        <form action="/api/truckcheck/logout" method="post">
          <button type="submit" style={{ background: "transparent", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.15)", padding: "8px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
            Sign out
          </button>
        </form>
      </header>

      <TruckCheckForm />
    </main>
  );

  return me ? <LoungeShell me={me}>{body}</LoungeShell> : body;
}

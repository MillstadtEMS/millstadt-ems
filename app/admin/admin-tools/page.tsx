import { redirect } from "next/navigation";
import Link from "next/link";
import { currentEmployee } from "@/lib/lounge/auth";

export const dynamic = "force-dynamic";

const TOOLS = [
  { href: "/admin",                      label: "Site Admin",            description: "Announcements, bulletin, calls, applicants, budget, testimonials, media." },
  { href: "/admin/calls",                label: "Live Ticker Editor",    description: "Edit the public call ticker, reactivate a manual ticker item, or force a Gmail poll." },
  { href: "/admin/truckcheck-dashboard", label: "Truck Check Insights",  description: "Recent checks, pencil-whip flags, trends per unit, fast-submitter watchlist." },
  { href: "/admin/personnel-dashboard",  label: "Personnel Dashboard",   description: "Open follow-ups, pending acknowledgments, accommodation reviews." },
];

// LoungeShell is provided by app/admin/layout.tsx — this page only renders
// its own content.
export default async function AdminToolsPage() {
  const session = await currentEmployee();
  if (!session) redirect("/lounge/login");
  if (!session.isAdmin) redirect("/lounge");

  return (
    <>
      <header style={{ marginBottom: 22 }}>
        <div style={{ color: "#f0b429", fontSize: "0.7rem", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
          Admin
        </div>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.85rem", fontWeight: 900, letterSpacing: "-0.015em" }}>Admin Tools</h1>
        <p style={{ color: "#94a3b8", fontSize: "0.92rem", marginTop: 4 }}>
          Insights + operational dashboards.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        {TOOLS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            style={{
              display: "block",
              background: "#071428",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 16,
              padding: "20px 22px",
              textDecoration: "none",
              color: "white",
            }}
          >
            <div style={{ color: "#f0b429", fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>
              Open
            </div>
            <div style={{ fontWeight: 900, fontSize: 17, marginTop: 6 }}>{t.label}</div>
            <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>{t.description}</p>
          </Link>
        ))}
      </div>
    </>
  );
}

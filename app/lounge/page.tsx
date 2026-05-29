import { redirect } from "next/navigation";
import Link from "next/link";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import { expiringCertsForEmployee, type EmployeeCert } from "@/lib/lounge/certs";
import LoungeShell from "@/components/lounge/LoungeShell";
import Wall from "@/components/lounge/Wall";
import WelcomeOverlay from "@/components/lounge/WelcomeOverlay";
import CoffeePrankOverlay from "@/components/lounge/CoffeePrankOverlay";

// Temporary joke: these two usernames get the coffee-prank flipbook
// instead of the normal welcome overlay. Remove when KJ says.
const PRANK_USERNAMES = new Set(["kwetzel", "jgoetz"]);

export const dynamic = "force-dynamic";

export default async function LoungeHome() {
  const session = await currentEmployee();
  if (!session) redirect("/lounge/login");

  const emp = (await getEmployee(session.id)) ?? null;
  const expiring = await expiringCertsForEmployee(session.id);

  const me = {
    firstName: session.firstName,
    lastName: session.lastName,
    certification: emp?.certification ?? null,
    photoUrl: emp?.photoUrl ?? null,
    isAdmin: session.isAdmin,
  };

  return (
    <LoungeShell me={me}>
      <header style={{ marginBottom: 18 }}>
        <div style={{ color: "#f0b429", fontSize: "0.7rem", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
          {todayString()}
        </div>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.95rem", fontWeight: 900, letterSpacing: "-0.015em" }}>
          Welcome back, {session.firstName}.
        </h1>
      </header>

      {expiring.length > 0 && <CertAlertsBanner certs={expiring} />}

      <Wall
        me={{
          id: session.id,
          firstName: session.firstName,
          lastName: session.lastName,
          photoUrl: emp?.photoUrl ?? null,
          isAdmin: session.isAdmin,
        }}
      />

      {PRANK_USERNAMES.has(session.username)
        ? <CoffeePrankOverlay name={session.firstName} />
        : <WelcomeOverlay name={session.firstName} />}
    </LoungeShell>
  );
}

function todayString() {
  const d = new Date();
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function CertAlertsBanner({ certs }: { certs: EmployeeCert[] }) {
  const expired = certs.filter((c) => c.status === "expired");
  const final7 = certs.filter((c) => c.status === "final_7");
  const soon = certs.filter(
    (c) => c.status === "30" || c.status === "60" || c.status === "90" || c.status === "120",
  );

  const hasBlocking = expired.length > 0;
  const accentColor = hasBlocking ? "#ef4444" : final7.length > 0 ? "#f97316" : "#f0b429";
  const bg = hasBlocking ? "rgba(239,68,68,0.10)" : final7.length > 0 ? "rgba(249,115,22,0.10)" : "rgba(240,180,41,0.08)";
  const border = hasBlocking ? "rgba(239,68,68,0.40)" : final7.length > 0 ? "rgba(249,115,22,0.40)" : "rgba(240,180,41,0.30)";

  return (
    <section
      style={{
        marginBottom: 18,
        background: bg,
        border: `1px solid ${border}`,
        borderLeft: `4px solid ${accentColor}`,
        borderRadius: 14,
        padding: "16px 20px",
      }}
    >
      <div style={{ color: accentColor, fontSize: "0.7rem", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 8 }}>
        {hasBlocking ? "Action Required" : "Heads Up"}
      </div>
      <h2 style={{ margin: 0, fontSize: "1.02rem", fontWeight: 900, color: "white" }}>
        {hasBlocking
          ? `You have ${expired.length} expired certification${expired.length === 1 ? "" : "s"} — contact management before your next shift.`
          : `${certs.length} of your certifications need attention.`}
      </h2>
      <ul style={{ marginTop: 10, marginBottom: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: 6 }}>
        {[...expired, ...final7, ...soon].slice(0, 6).map((c) => (
          <li
            key={c.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              padding: "6px 0",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              color: "#e2e8f0",
              fontSize: "0.86rem",
            }}
          >
            <span style={{ fontWeight: 700 }}>{c.certTypeName}</span>
            <span style={{ color: accentColor, fontWeight: 800 }}>
              {c.status === "expired"
                ? `Expired ${Math.abs(c.daysLeft ?? 0)}d ago`
                : c.status === "final_7"
                  ? c.daysLeft === 0
                    ? "Expires today"
                    : `Expires in ${c.daysLeft}d`
                  : `In ${c.daysLeft}d`}
            </span>
          </li>
        ))}
      </ul>
      <Link
        href="/lounge/certs"
        style={{
          display: "inline-block",
          marginTop: 14,
          background: accentColor,
          color: "#040d1a",
          padding: "9px 14px",
          borderRadius: 10,
          fontSize: "0.76rem",
          fontWeight: 900,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          textDecoration: "none",
        }}
      >
        Open My Certifications →
      </Link>
    </section>
  );
}

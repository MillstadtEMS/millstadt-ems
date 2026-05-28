import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import { expiringCertsForEmployee, type EmployeeCert } from "@/lib/lounge/certs";
import WelcomeOverlay from "@/components/lounge/WelcomeOverlay";
import CoffeePrankOverlay from "@/components/lounge/CoffeePrankOverlay";

// Temporary joke: these two usernames get the coffee-prank flipbook
// instead of the normal welcome overlay. Remove when KJ says.
const PRANK_USERNAMES = new Set(["kwetzel", "jgoetz"]);

export const dynamic = "force-dynamic";

export default async function LoungeHome() {
  const session = await currentEmployee();
  if (!session) redirect("/lounge/login");
  // TEMPORARY (QA): force-change-password redirect disabled so KJ can
  // log in as any employee to verify their experience. Re-enable by
  // uncommenting the line below.
  // if (session.mustChangePassword) redirect("/lounge/change-password");

  const emp = (await getEmployee(session.id)) ?? null;
  const expiring = await expiringCertsForEmployee(session.id);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(900px 500px at 50% -10%, rgba(240,180,41,0.06), transparent 60%), #040d1a",
        color: "white",
        padding: "28px 22px 80px",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        {/* ── Top bar: title block on left, identity card on right ── */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            paddingBottom: 22,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div>
            <div
              style={{
                color: "#f0b429",
                fontSize: "0.7rem",
                fontWeight: 900,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Employee Lounge
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: "1.95rem",
                fontWeight: 900,
                letterSpacing: "-0.015em",
              }}
            >
              Welcome back, {session.firstName}.
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "0.92rem", marginTop: 6 }}>
              {todayString()}
            </p>
          </div>

          <IdentityCard
            firstName={session.firstName}
            lastName={session.lastName}
            isAdmin={session.isAdmin}
            certification={emp?.certification ?? null}
            photoUrl={emp?.photoUrl ?? null}
          />
        </header>

        {/* ── Cert alerts banner (only when something needs attention) ── */}
        {expiring.length > 0 && <CertAlertsBanner certs={expiring} />}

        {/* ── Tiles ── */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 14,
            marginTop: 26,
          }}
        >
          <Tile
            href="/truckcheck"
            eyebrow="Daily"
            title="Truck Check"
            description="Walk a unit. Auto-stamps you as the submitter and logs start, finish, and every box."
            accent="#22d3ee"
          />
          <Tile
            href="/inventory"
            eyebrow="Stock"
            title="Inventory"
            description="Backstock + State counts. Edits are logged to your account."
            accent="#a3e635"
          />
          <Tile
            href="/lounge/feed"
            eyebrow="The Wall"
            title="Shift-to-Shift Feed"
            description="Share what the next crew needs to know. Post, react, comment, pin important notices."
            accent="#a78bfa"
          />
          <Tile
            href="/lounge/certs"
            eyebrow="Compliance"
            title="My Certifications"
            description="Upload your DL, EMT/Paramedic license, BLS/ACLS, NIMS courses, and more. Auto-reminds you before each expires."
            accent="#22d3ee"
          />
          {session.isAdmin && (
            <Tile
              href="/admin/employees"
              eyebrow="Admin"
              title="Employee Records"
              description="Add or edit employees, upload certs & licenses, write-ups, encrypted SSN."
              accent="#f0b429"
            />
          )}
          {session.isAdmin && (
            <Tile
              href="/admin/classes"
              eyebrow="Admin"
              title="Classes & Requirements"
              description="Define roles (EMT, Paramedic, Board Member) and the certifications each must hold."
              accent="#f0b429"
            />
          )}
          {session.isAdmin && (
            <Tile
              href="/admin/cert-types"
              eyebrow="Admin"
              title="Cert Type Tracker"
              description="Built-in + custom certification types and their alert schedules."
              accent="#f0b429"
            />
          )}
          {session.isAdmin && (
            <Tile
              href="/admin"
              eyebrow="Admin"
              title="Site Admin"
              description="Announcements, bulletin, calls, applicants, budget docs, testimonials, media."
              accent="#f0b429"
            />
          )}
        </section>

        {/* ── In-progress placeholder for the other modules ── */}
        <section
          style={{
            background: "#071428",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 18,
            padding: "22px 24px",
            marginTop: 22,
          }}
        >
          <div
            style={{
              color: "#f0b429",
              fontSize: "0.7rem",
              fontWeight: 900,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Coming Next
          </div>
          <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 900 }}>
            The wall feed, messaging, open shifts, acknowledgments, policies, and incident
            reports.
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "0.92rem", lineHeight: 1.65, marginTop: 8 }}>
            Being ported from the iOS app one module at a time. Auth and personnel records are
            live now.
          </p>
        </section>

        {/* Sign-out bar */}
        <div style={{ marginTop: 28, display: "flex", justifyContent: "flex-end" }}>
          <form action="/api/lounge/logout" method="post">
            <button
              type="submit"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "#94a3b8",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 10,
                padding: "10px 16px",
                fontSize: "0.78rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* Plays once after fresh login, then never again until next login.
          Kallista + Jennifer Goetz get the coffee-prank flipbook (joke). */}
      {PRANK_USERNAMES.has(session.username)
        ? <CoffeePrankOverlay name={session.firstName} />
        : <WelcomeOverlay name={session.firstName} />}
    </div>
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

function IdentityCard({
  firstName,
  lastName,
  isAdmin,
  certification,
  photoUrl,
}: {
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  certification: string | null;
  photoUrl: string | null;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: "10px 14px 10px 10px",
      }}
    >
      <div
        style={{
          position: "relative",
          width: 44,
          height: 44,
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          background: "rgba(240,180,41,0.12)",
          border: "1px solid rgba(240,180,41,0.30)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#f0b429",
          fontWeight: 900,
          fontSize: "0.95rem",
        }}
      >
        {photoUrl ? (
          <Image src={photoUrl} alt="" fill sizes="44px" style={{ objectFit: "cover" }} />
        ) : (
          (firstName[0] + lastName[0]).toUpperCase()
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.92rem", fontWeight: 800 }}>
            {firstName} {lastName}
          </span>
          {isAdmin && (
            <span
              style={{
                fontSize: "0.55rem",
                fontWeight: 900,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                padding: "2px 7px",
                borderRadius: 999,
                background: "rgba(240,180,41,0.18)",
                color: "#f0b429",
                border: "1px solid rgba(240,180,41,0.35)",
              }}
            >
              Admin
            </span>
          )}
        </div>
        <span style={{ color: "#94a3b8", fontSize: "0.72rem", marginTop: 3 }}>
          {certification ?? "Crew"}
        </span>
      </div>
    </div>
  );
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
        marginTop: 22,
        background: bg,
        border: `1px solid ${border}`,
        borderLeft: `4px solid ${accentColor}`,
        borderRadius: 14,
        padding: "18px 22px",
      }}
    >
      <div
        style={{
          color: accentColor,
          fontSize: "0.7rem",
          fontWeight: 900,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {hasBlocking ? "Action Required" : "Heads Up"}
      </div>
      <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 900, color: "white" }}>
        {hasBlocking
          ? `You have ${expired.length} expired certification${expired.length === 1 ? "" : "s"} — contact management before your next shift.`
          : `${certs.length} of your certifications need attention.`}
      </h2>
      <ul style={{ marginTop: 12, marginBottom: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: 6 }}>
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
              fontSize: "0.88rem",
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
          padding: "10px 16px",
          borderRadius: 10,
          fontSize: "0.78rem",
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

function Tile({
  href,
  eyebrow,
  title,
  description,
  accent,
}: {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        background: "#071428",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 18,
        padding: "22px 22px 24px",
        textDecoration: "none",
        color: "white",
        transition: "border-color 0.15s, transform 0.15s",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* accent stripe */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: accent,
          opacity: 0.85,
        }}
      />
      <div
        style={{
          color: accent,
          fontSize: "0.65rem",
          fontWeight: 900,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </div>
      <div style={{ fontSize: "1.25rem", fontWeight: 900, marginTop: 6, letterSpacing: "-0.005em" }}>
        {title}
      </div>
      <p style={{ color: "#94a3b8", fontSize: "0.88rem", marginTop: 8, lineHeight: 1.55 }}>
        {description}
      </p>
      <div
        style={{
          marginTop: 14,
          color: accent,
          fontSize: "0.7rem",
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        Open →
      </div>
    </Link>
  );
}

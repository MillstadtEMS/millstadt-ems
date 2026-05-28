/**
 * /admin/employees — list view, lounge-admin gated.
 *
 * Renders server-side so the gate runs before HTML is sent. Non-admins
 * get redirected to the lounge login.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { currentEmployee } from "@/lib/lounge/auth";
import { listEmployees } from "@/lib/lounge/employees";

export const dynamic = "force-dynamic";

export default async function EmployeesAdminListPage() {
  const me = await currentEmployee();
  if (!me) redirect("/lounge/login");
  if (!me.isAdmin) redirect("/lounge");

  const employees = await listEmployees({ includeInactive: true });
  const active = employees.filter((e) => e.isActive);
  const inactive = employees.filter((e) => !e.isActive);

  return (
    <div style={{ padding: "32px 28px 80px", color: "white", background: "#040d1a", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Header me={me} totalActive={active.length} />

        <section
          style={{
            display: "grid",
            gap: 12,
            marginTop: 28,
          }}
        >
          {active.map((emp) => <EmployeeRow key={emp.id} emp={emp} />)}
        </section>

        {inactive.length > 0 && (
          <>
            <div
              style={{
                marginTop: 38,
                marginBottom: 12,
                color: "#64748b",
                fontSize: "0.7rem",
                fontWeight: 900,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              Inactive ({inactive.length})
            </div>
            <section style={{ display: "grid", gap: 8, opacity: 0.55 }}>
              {inactive.map((emp) => <EmployeeRow key={emp.id} emp={emp} />)}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Header({
  me,
  totalActive,
}: {
  me: { firstName: string };
  totalActive: number;
}) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        paddingBottom: 18,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div>
        <Link
          href="/lounge"
          style={{
            color: "#94a3b8",
            fontSize: "0.7rem",
            fontWeight: 800,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          ← Back to Lounge
        </Link>
        <div
          style={{
            color: "#f0b429",
            fontSize: "0.7rem",
            fontWeight: 900,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            marginTop: 12,
            marginBottom: 4,
          }}
        >
          Personnel
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: "1.95rem",
            fontWeight: 900,
            letterSpacing: "-0.01em",
          }}
        >
          Employees
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginTop: 6 }}>
          {totalActive} active · Signed in as {me.firstName}
        </p>
      </div>
      <Link
        href="/admin/employees/new"
        style={{
          background: "#f0b429",
          color: "#040d1a",
          padding: "12px 18px",
          borderRadius: 10,
          fontWeight: 900,
          fontSize: "0.78rem",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          textDecoration: "none",
        }}
      >
        + Add Employee
      </Link>
    </header>
  );
}

function EmployeeRow({
  emp,
}: {
  emp: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    certification: string | null;
    position: string | null;
    isAdmin: boolean;
    isActive: boolean;
    photoUrl: string | null;
  };
}) {
  return (
    <Link
      href={`/admin/employees/${emp.id}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 18px",
        background: "#071428",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14,
        textDecoration: "none",
        color: "white",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <Avatar url={emp.photoUrl} initial={emp.firstName[0] + emp.lastName[0]} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: "1rem", fontWeight: 800, color: "white" }}>
            {emp.firstName} {emp.lastName}
          </span>
          {emp.isAdmin && (
            <span
              style={{
                fontSize: "0.6rem",
                fontWeight: 900,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                padding: "3px 8px",
                borderRadius: 999,
                background: "rgba(240,180,41,0.18)",
                color: "#f0b429",
                border: "1px solid rgba(240,180,41,0.35)",
              }}
            >
              Admin
            </span>
          )}
          {!emp.isActive && (
            <span
              style={{
                fontSize: "0.6rem",
                fontWeight: 900,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                padding: "3px 8px",
                borderRadius: 999,
                background: "rgba(148,163,184,0.18)",
                color: "#94a3b8",
              }}
            >
              Inactive
            </span>
          )}
        </div>
        <div style={{ color: "#94a3b8", fontSize: "0.82rem", marginTop: 3 }}>
          {emp.certification || emp.position || "—"} · @{emp.username}
        </div>
      </div>
      <span style={{ color: "#475569", fontSize: "1.4rem", lineHeight: 1 }}>›</span>
    </Link>
  );
}

function Avatar({ url, initial }: { url: string | null; initial: string }) {
  if (url) {
    return (
      <div
        style={{
          position: "relative",
          width: 48,
          height: 48,
          borderRadius: "50%",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}
      >
        <Image src={url} alt="" fill sizes="48px" style={{ objectFit: "cover" }} />
      </div>
    );
  }
  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        background: "rgba(240,180,41,0.12)",
        border: "1px solid rgba(240,180,41,0.22)",
        color: "#f0b429",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
        fontSize: "0.95rem",
        flexShrink: 0,
      }}
    >
      {initial.toUpperCase()}
    </div>
  );
}

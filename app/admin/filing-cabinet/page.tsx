"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Emp {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  certification: string | null;
  position: string | null;
  isAdmin: boolean;
  isActive: boolean;
  profileCompletedAt: string | null;
  phoneVerifiedAt: string | null;
}

export default function FilingCabinetPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ isAdmin: boolean } | null>(null);
  const [emps, setEmps] = useState<Emp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openDrawer, setOpenDrawer] = useState<"active" | "inactive" | "admin">("active");

  useEffect(() => {
    fetch("/api/lounge/me").then(async (r) => {
      if (!r.ok) { router.push("/lounge/login"); return; }
      const d = await r.json();
      if (!d.employee?.isAdmin) { router.push("/lounge"); return; }
      setMe(d.employee);
    });
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/employees?inactive=1");
    if (r.ok) {
      const d = await r.json();
      setEmps(Array.isArray(d.employees) ? d.employees : Array.isArray(d) ? d : []);
    }
    setLoading(false);
  }, []);
  useEffect(() => { if (me) load(); }, [me, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return emps;
    return emps.filter((e) =>
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
      e.username.toLowerCase().includes(q) ||
      (e.certification ?? "").toLowerCase().includes(q),
    );
  }, [emps, search]);

  const active = filtered.filter((e) => e.isActive && !e.isAdmin);
  const adminEmps = filtered.filter((e) => e.isActive && e.isAdmin);
  const inactive = filtered.filter((e) => !e.isActive);

  if (!me) return <p style={{ color: "#94a3b8", padding: 22 }}>Loading…</p>;

  return (
    <div>
      <header style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#f0b429", fontSize: 11, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
          <span>🗄️</span> Filing Cabinet
        </div>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.85rem", fontWeight: 900, letterSpacing: "-0.015em" }}>Employee files</h1>
        <p style={{ color: "#94a3b8", fontSize: "0.92rem", marginTop: 4 }}>
          Every employee&apos;s About Me, certifications, attachments, and write-ups in one place.
        </p>
      </header>

      <div style={{ marginBottom: 14 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, username, or certification…"
          style={{ width: "100%", padding: "12px 14px", background: "#071428", border: "1px solid rgba(255,255,255,0.10)", color: "white", borderRadius: 12, fontSize: 14, outline: "none", fontFamily: "inherit" }}
        />
      </div>

      <Drawer label={`Active employees (${active.length})`} accent="#f0b429" open={openDrawer === "active"} onToggle={() => setOpenDrawer(openDrawer === "active" ? "inactive" : "active")}>
        {loading ? <p style={{ color: "#94a3b8" }}>Loading…</p> : <EmpGrid emps={active} />}
      </Drawer>

      <Drawer label={`Admins (${adminEmps.length})`} accent="#a78bfa" open={openDrawer === "admin"} onToggle={() => setOpenDrawer(openDrawer === "admin" ? "active" : "admin")}>
        <EmpGrid emps={adminEmps} />
      </Drawer>

      <Drawer label={`Inactive (${inactive.length})`} accent="#64748b" open={openDrawer === "inactive"} onToggle={() => setOpenDrawer(openDrawer === "inactive" ? "active" : "inactive")}>
        <EmpGrid emps={inactive} />
      </Drawer>

      <div style={{ marginTop: 22 }}>
        <Link
          href="/admin/employees/new"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f0b429", color: "#040d1a", padding: "10px 18px", borderRadius: 12, fontWeight: 900, fontSize: 13, letterSpacing: "0.10em", textTransform: "uppercase", textDecoration: "none" }}
        >
          + Add Employee
        </Link>
      </div>
    </div>
  );
}

function Drawer({ label, accent, open, onToggle, children }: { label: string; accent: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <section style={{ background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, marginBottom: 10, overflow: "hidden" }}>
      <button
        type="button"
        onClick={onToggle}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "transparent", border: 0, color: "white", cursor: "pointer", fontFamily: "inherit" }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: accent }} />
          <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
        </span>
        <span style={{ color: "#94a3b8", fontSize: 14 }}>{open ? "▼" : "▶"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 18px 18px" }}>
          {children}
        </div>
      )}
    </section>
  );
}

function EmpGrid({ emps }: { emps: Emp[] }) {
  if (emps.length === 0) return <p style={{ color: "#94a3b8", margin: 0 }}>No one here.</p>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
      {emps.map((e) => (
        <Link
          key={e.id}
          href={`/admin/filing-cabinet/${e.id}`}
          style={{ background: "#040d1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 14px", color: "white", textDecoration: "none", display: "block" }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
            <strong style={{ fontSize: 14 }}>{e.firstName} {e.lastName}</strong>
            {e.profileCompletedAt && (
              <span title="Profile completed" style={{ color: "#86efac", fontSize: 11 }}>●</span>
            )}
          </div>
          <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>
            @{e.username}{e.certification ? ` · ${e.certification}` : ""}
          </div>
        </Link>
      ))}
    </div>
  );
}

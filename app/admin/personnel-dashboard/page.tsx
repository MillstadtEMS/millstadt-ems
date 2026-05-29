"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface PRecord {
  id: string;
  employeeId: string;
  category: string;
  recordType: string;
  title: string;
  status: string;
  severity: string;
  followUpDueDate: string | null;
  followUpRequired: boolean;
  acknowledgmentRequired: boolean;
  acknowledgedAt: string | null;
  accommodationType: string | null;
  accommodationEnd: string | null;
  accommodationReview: string | null;
  createdAt: string;
}

interface Rollups {
  openFollowUps: PRecord[];
  pendingAcks: PRecord[];
  activeAccommodations: PRecord[];
  accommodationsDueReview: PRecord[];
  unresolvedDiscipline: PRecord[];
}

interface EmployeeLite { id: string; firstName: string; lastName: string }

export default function PersonnelDashboardPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<null | boolean>(null);
  const [data, setData] = useState<Rollups | null>(null);
  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState<Record<string, EmployeeLite>>({});

  useEffect(() => {
    fetch("/api/lounge/me")
      .then(async (r) => {
        if (!r.ok) { router.push("/lounge/login"); return; }
        const d = await r.json();
        if (!d.employee?.isAdmin) { router.push("/lounge"); return; }
        setAuthed(true);
      })
      .catch(() => router.push("/lounge/login"));
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    const [rolls, ros] = await Promise.all([
      fetch("/api/admin/personnel-dashboard").then((r) => r.ok ? r.json() : null),
      fetch("/api/lounge/roster").then((r) => r.ok ? r.json() : null),
    ]);
    if (rolls) setData(rolls);
    if (ros?.employees) {
      const map: Record<string, EmployeeLite> = {};
      for (const e of ros.employees as EmployeeLite[]) map[e.id] = e;
      setRoster(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (authed) load(); }, [authed, load]);

  const empName = useMemo(
    () => (id: string) => {
      const e = roster[id];
      return e ? `${e.firstName} ${e.lastName}` : id;
    },
    [roster],
  );

  if (authed === null) return <div style={{ padding: 24, color: "#94a3b8" }}>Loading…</div>;

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(900px 500px at 50% -10%, rgba(220,38,38,0.06), transparent 60%), #040d1a", color: "white", padding: "26px 22px 80px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ color: "#fca5a5", fontSize: 11, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
              Admin · HR
            </div>
            <h1 style={{ margin: "4px 0 0", fontSize: "1.9rem", fontWeight: 900, letterSpacing: "-0.015em" }}>
              Personnel Records Dashboard
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "0.92rem", marginTop: 4 }}>
              Open follow-ups, acknowledgments due, active and review-due accommodations, unresolved discipline.
            </p>
          </div>
          <Link href="/lounge" style={{ color: "#94a3b8", fontSize: 13, textDecoration: "none" }}>← Back to Lounge</Link>
        </header>

        {loading || !data ? (
          <p style={{ color: "#94a3b8" }}>Loading…</p>
        ) : (
          <>
            <Counters data={data} />
            <Group title={`Open follow-ups (${data.openFollowUps.length})`} accent="#fdba74"
              empty="Nothing pending follow-up.">
              {data.openFollowUps.map((r) => (
                <Row key={r.id} r={r} empName={empName} right={r.followUpDueDate ? `Due ${r.followUpDueDate}` : "No due date"} />
              ))}
            </Group>
            <Group title={`Acknowledgments pending (${data.pendingAcks.length})`} accent="#fca5a5"
              empty="No outstanding acknowledgments.">
              {data.pendingAcks.map((r) => (
                <Row key={r.id} r={r} empName={empName} right={`Created ${new Date(r.createdAt).toLocaleDateString()}`} />
              ))}
            </Group>
            <Group title={`Accommodations due for review (${data.accommodationsDueReview.length})`} accent="#7dd3fc"
              empty="No accommodation reviews coming up.">
              {data.accommodationsDueReview.map((r) => (
                <Row key={r.id} r={r} empName={empName}
                  right={r.accommodationReview ? `Review ${r.accommodationReview}` : ""} />
              ))}
            </Group>
            <Group title={`Active accommodations (${data.activeAccommodations.length})`} accent="#7dd3fc"
              empty="No active accommodations on file.">
              {data.activeAccommodations.map((r) => (
                <Row key={r.id} r={r} empName={empName}
                  right={r.accommodationEnd ? `Ends ${r.accommodationEnd}` : "No end date"} />
              ))}
            </Group>
            <Group title={`Unresolved discipline (${data.unresolvedDiscipline.length})`} accent="#fca5a5"
              empty="No open conduct cases.">
              {data.unresolvedDiscipline.map((r) => (
                <Row key={r.id} r={r} empName={empName} right={r.severity} />
              ))}
            </Group>
          </>
        )}
      </div>
    </div>
  );
}

function Counters({ data }: { data: Rollups }) {
  const cells = [
    { label: "Open follow-ups", value: data.openFollowUps.length, color: "#fdba74" },
    { label: "Pending acks", value: data.pendingAcks.length, color: "#fca5a5" },
    { label: "Active accommodations", value: data.activeAccommodations.length, color: "#7dd3fc" },
    { label: "Accommodations due review", value: data.accommodationsDueReview.length, color: "#7dd3fc" },
    { label: "Unresolved discipline", value: data.unresolvedDiscipline.length, color: "#fca5a5" },
  ];
  return (
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 22 }}>
      {cells.map((c) => (
        <div key={c.label} style={{ background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ color: c.color, fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            {c.label}
          </div>
          <div style={{ color: "white", fontSize: 28, fontWeight: 900, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
            {c.value}
          </div>
        </div>
      ))}
    </section>
  );
}

function Group({ title, accent, empty, children }: { title: string; accent: string; empty: string; children: React.ReactNode }) {
  const list = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <section style={{ marginBottom: 18 }}>
      <h2 style={{ color: accent, margin: "0 0 10px", fontSize: 13, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        {title}
      </h2>
      <div style={{ background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "12px 14px" }}>
        {list.length === 0 ? <p style={{ color: "#94a3b8", margin: 0 }}>{empty}</p> : list}
      </div>
    </section>
  );
}

function Row({ r, empName, right }: { r: PRecord; empName: (id: string) => string; right: string }) {
  return (
    <Link
      href={`/admin/employees/${r.employeeId}`}
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        padding: "10px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        textDecoration: "none",
        color: "white",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "white" }}>{empName(r.employeeId)}</div>
        <div style={{ color: "#94a3b8", fontSize: 12 }}>{r.title} · {r.recordType}</div>
      </div>
      <div style={{ color: "#cbd5e1", fontSize: 12, alignSelf: "center", whiteSpace: "nowrap" }}>
        {right}
      </div>
    </Link>
  );
}

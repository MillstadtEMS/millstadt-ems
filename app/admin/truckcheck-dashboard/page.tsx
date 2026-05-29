"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CheckRow {
  id: string;
  unit: string;
  submitted_at: string;
  duration_seconds: number | null;
  overall_status: string | null;
  pencil_whip_flag: string | null;
  pencil_whip_reasons: { code: string; message: string; severity: string }[];
  attendant_name: string | null;
  attendant2_name: string | null;
  notes: string | null;
  pdf_url: string | null;
  abnormal_count: number;
  fail_count: number;
  photo_count: number;
}
interface TrendRow { unit: string; trend_group: string; occurrences: number; last_at: string; avg_value: number | null }
interface FastSubmitter { id: string; name: string; fast_count: number }

export default function TruckCheckDashboard() {
  const router = useRouter();
  const [authed, setAuthed] = useState<null | boolean>(null);
  const [days, setDays] = useState(30);
  const [unit, setUnit] = useState<string>("");
  const [flag, setFlag] = useState<string>("");
  const [checks, setChecks] = useState<CheckRow[]>([]);
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [fastSubmitters, setFastSubmitters] = useState<FastSubmitter[]>([]);
  const [loading, setLoading] = useState(true);

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
    const p = new URLSearchParams();
    p.set("days", String(days));
    if (unit) p.set("unit", unit);
    if (flag) p.set("flag", flag);
    const r = await fetch(`/api/admin/truckcheck-dashboard?${p}`);
    if (r.ok) {
      const d = await r.json();
      setChecks(d.checks);
      setTrends(d.trends);
      setFastSubmitters(d.fastSubmitters);
    }
    setLoading(false);
  }, [days, unit, flag]);

  useEffect(() => { if (authed) load(); }, [authed, load]);

  if (authed === null) return <div style={{ padding: 24, color: "#94a3b8" }}>Loading…</div>;

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(900px 500px at 50% -10%, rgba(240,180,41,0.06), transparent 60%), #040d1a", color: "white", padding: "26px 22px 80px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ color: "#f0b429", fontSize: 11, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
              Admin
            </div>
            <h1 style={{ margin: "4px 0 0", fontSize: "1.9rem", fontWeight: 900, letterSpacing: "-0.015em" }}>
              Truck Check Dashboard
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "0.92rem", marginTop: 4 }}>
              Recent submissions, anti-pencil-whip flags, and recurring trends.
            </p>
          </div>
          <Link href="/lounge" style={{ color: "#94a3b8", fontSize: 13, textDecoration: "none" }}>← Back to Lounge</Link>
        </header>

        <Filters
          days={days} setDays={setDays}
          unit={unit} setUnit={setUnit}
          flag={flag} setFlag={setFlag}
        />

        {fastSubmitters.length > 0 && (
          <Section title={`Employees with multiple fast submissions (<90s) — last ${days}d`}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
              {fastSubmitters.map((e) => (
                <li key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.30)", borderRadius: 10 }}>
                  <span style={{ color: "white", fontWeight: 700 }}>{e.name}</span>
                  <span style={{ color: "#fca5a5", fontWeight: 800 }}>{e.fast_count} fast checks</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title={`Recent checks (${checks.length})`}>
          {loading ? <p style={{ color: "#94a3b8" }}>Loading…</p>
            : checks.length === 0 ? <p style={{ color: "#94a3b8" }}>No checks in this window.</p>
            : (
              <div style={{ display: "grid", gap: 10 }}>
                {checks.map((c) => <CheckCard key={c.id} c={c} />)}
              </div>
            )}
        </Section>

        <Section title={`Trends — last ${days}d`}>
          {trends.length === 0 ? <p style={{ color: "#94a3b8" }}>No recurring activity in this window.</p>
            : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <Th>Unit</Th><Th>Trend</Th><Th>Occurrences</Th><Th>Average value</Th><Th>Last seen</Th>
                  </tr>
                </thead>
                <tbody>
                  {trends.map((t, i) => (
                    <tr key={i} style={{ background: i % 2 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                      <Td>{t.unit}</Td>
                      <Td>{t.trend_group}</Td>
                      <Td>{t.occurrences}</Td>
                      <Td>{t.avg_value ?? "—"}</Td>
                      <Td>{new Date(t.last_at).toLocaleString()}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </Section>
      </div>
    </div>
  );
}

function Filters({
  days, setDays, unit, setUnit, flag, setFlag,
}: {
  days: number; setDays: (n: number) => void;
  unit: string; setUnit: (s: string) => void;
  flag: string; setFlag: (s: string) => void;
}) {
  return (
    <section style={{ background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 18px", marginBottom: 18, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
      <FilterField label="Window">
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={sel}>
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
          <option value={60}>60 days</option>
          <option value={90}>90 days</option>
        </select>
      </FilterField>
      <FilterField label="Unit">
        <select value={unit} onChange={(e) => setUnit(e.target.value)} style={sel}>
          <option value="">All</option>
          <option value="3935">3935</option>
          <option value="3926">3926</option>
          <option value="3925">3925</option>
        </select>
      </FilterField>
      <FilterField label="Flag">
        <select value={flag} onChange={(e) => setFlag(e.target.value)} style={sel}>
          <option value="">All</option>
          <option value="normal">Normal</option>
          <option value="review">Needs Review</option>
          <option value="possible_whip">Possible Pencil Whip</option>
        </select>
      </FilterField>
    </section>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</span>
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <h2 style={{ color: "white", fontWeight: 900, fontSize: 16, marginTop: 0, marginBottom: 12 }}>{title}</h2>
      {children}
    </section>
  );
}

function CheckCard({ c }: { c: CheckRow }) {
  const badge =
    c.pencil_whip_flag === "possible_whip" ? { bg: "rgba(239,68,68,0.16)", fg: "#fca5a5", label: "Possible Pencil Whip" } :
    c.pencil_whip_flag === "review" ? { bg: "rgba(249,115,22,0.16)", fg: "#fdba74", label: "Needs Review" } :
    { bg: "rgba(34,197,94,0.12)", fg: "#86efac", label: "Normal" };
  const dur = c.duration_seconds ?? 0;
  const m = Math.floor(dur / 60).toString().padStart(2, "0");
  const s = (dur % 60).toString().padStart(2, "0");
  return (
    <article style={{ background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 18px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
          <span style={{ color: "#f0b429", fontWeight: 900, fontSize: 14, letterSpacing: "0.10em" }}>Unit {c.unit}</span>
          <span style={{ color: "white", fontWeight: 700 }}>{c.attendant_name ?? "—"}</span>
          {c.attendant2_name && <span style={{ color: "#94a3b8", fontSize: 13 }}>+ {c.attendant2_name}</span>}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ background: badge.bg, color: badge.fg, padding: "4px 10px", borderRadius: 999, fontSize: 10, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>
            {badge.label}
          </span>
          {c.pdf_url && (
            <a href={c.pdf_url} target="_blank" rel="noreferrer" style={{ color: "#38bdf8", fontSize: 12, fontWeight: 800, textDecoration: "none" }}>PDF ↗</a>
          )}
        </div>
      </header>
      <div style={{ display: "flex", gap: 14, marginTop: 10, color: "#cbd5e1", fontSize: 13, flexWrap: "wrap" }}>
        <span>{new Date(c.submitted_at).toLocaleString()}</span>
        <span>· Duration <strong style={{ color: "white", fontVariantNumeric: "tabular-nums" }}>{m}:{s}</strong></span>
        <span>· Status <strong style={{ color: c.overall_status === "failed" ? "#fca5a5" : c.overall_status === "issues" ? "#fdba74" : "#86efac" }}>{c.overall_status}</strong></span>
        <span>· {c.fail_count} failed / {c.abnormal_count} abnormal · {c.photo_count} photos</span>
      </div>
      {c.pencil_whip_reasons && c.pencil_whip_reasons.length > 0 && (
        <ul style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18, color: "#cbd5e1", fontSize: 13 }}>
          {c.pencil_whip_reasons.map((r, i) => (
            <li key={i} style={{ color: r.severity === "high" ? "#fca5a5" : "#fdba74", marginBottom: 2 }}>{r.message}</li>
          ))}
        </ul>
      )}
      {c.notes && <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 10, marginBottom: 0, whiteSpace: "pre-wrap" }}>{c.notes}</p>}
    </article>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: "left", color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ color: "#cbd5e1", fontSize: 13, padding: "10px" }}>{children}</td>;
}

const sel: React.CSSProperties = {
  background: "#040d1a",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  color: "white",
  padding: "8px 12px",
  fontSize: 13,
  fontFamily: "inherit",
};

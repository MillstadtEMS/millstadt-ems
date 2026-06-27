"use client";

/**
 * Public year-to-date call statistics. Aggregate counts/percentages only
 * — no patient detail, no age bands. Reads /api/cad/stats which mirrors
 * the internal report grouping so the numbers always agree.
 */

import { useEffect, useState } from "react";

interface GroupCat { name: string; count: number; pct: number }
interface ClassGroup { count: number; pct: number; categories: GroupCat[] }
interface FireStat { count: number; pct: number }
interface Stats {
  year: number;
  total: number;
  groups: { trauma: ClassGroup; medical: ClassGroup; uncategorized: ClassGroup };
  fire: { count: number; pct: number; still: FireStat; first: FireStat; other: FireStat };
  cardiac: { count: number; pct: number; medical: number; trauma: number };
}

export default function StatisticsPage() {
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cad/stats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "8px 18px 64px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <span style={{ height: 1, width: 34, background: "rgba(240,180,41,0.7)" }} />
        <span style={{ color: "#f0b429", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {data?.year ?? new Date().getFullYear()} Year to Date
        </span>
      </div>
      <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 2.6rem)", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 6px", color: "white" }}>
        Call Statistics
      </h1>
      <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.55, maxWidth: 640, margin: "0 0 22px" }}>
        Millstadt EMS call volume by classification. Figures are based on dispatch information and update live as the call log is maintained.
      </p>

      {loading ? (
        <p style={{ color: "#64748b" }}>Loading…</p>
      ) : !data || data.total === 0 ? (
        <p style={{ color: "#64748b" }}>No calls recorded yet for this year.</p>
      ) : (
        <>
          <div style={tileRow}>
            <Tile label="Total calls" value={data.total.toLocaleString()} tone="#f0b429" />
            <Tile label="Trauma" value={`${data.groups.trauma.pct.toFixed(1)}%`} sub={`${data.groups.trauma.count} calls`} tone="#fca5a5" />
            <Tile label="Medical" value={`${data.groups.medical.pct.toFixed(1)}%`} sub={`${data.groups.medical.count} calls`} tone="#86efac" />
            <Tile label="Fire Response" value={`${data.fire.pct.toFixed(1)}%`} sub={`${data.fire.count} calls`} tone="#fdba74" />
          </div>

          <div style={grid}>
            <GroupCard title="Trauma" group={data.groups.trauma} accent="#fca5a5" total={data.total} />
            <GroupCard title="Medical" group={data.groups.medical} accent="#86efac" total={data.total} />
            <GroupCard title="Uncategorized" group={data.groups.uncategorized} accent="#94a3b8" total={data.total} />

            <Card>
              <CardHead title="Fire Response" pct={data.fire.pct} accent="#fdba74" />
              <Row label="Still Alarm" count={data.fire.still.count} pct={data.fire.still.pct} accent="#fdba74" />
              <Row label="1st Alarm" count={data.fire.first.count} pct={data.fire.first.pct} accent="#fdba74" />
              {data.fire.other.count > 0 && <Row label="Other" count={data.fire.other.count} pct={data.fire.other.pct} accent="#fdba74" />}
            </Card>

            <Card>
              <CardHead title="Cardiac Arrest" pct={data.cardiac.pct} accent="#f0b429" />
              <Row label="Medical" count={data.cardiac.medical} pct={data.cardiac.count ? (data.cardiac.medical / data.cardiac.count) * 100 : 0} accent="#86efac" />
              <Row label="Traumatic" count={data.cardiac.trauma} pct={data.cardiac.count ? (data.cardiac.trauma / data.cardiac.count) * 100 : 0} accent="#fca5a5" />
              <p style={{ color: "#64748b", fontSize: 11.5, margin: "8px 0 0" }}>{data.cardiac.count} total cardiac arrests this year.</p>
            </Card>
          </div>

          <p style={{ color: "#475569", fontSize: 11.5, lineHeight: 1.5, marginTop: 18 }}>
            Percentages are each category&apos;s share of total calls. Dispatch data may contain occasional corrections.
          </p>
        </>
      )}
    </main>
  );
}

function GroupCard({ title, group, accent, total }: { title: string; group: ClassGroup; accent: string; total: number }) {
  return (
    <Card>
      <CardHead title={title} pct={group.pct} accent={accent} />
      <div style={{ color: "#64748b", fontSize: 11.5, margin: "-4px 0 8px" }}>{group.count} of {total} calls</div>
      {group.categories.length === 0 ? <span style={{ color: "#475569", fontSize: 12 }}>None.</span> :
        group.categories.map((c) => <Row key={c.name} label={c.name} count={c.count} pct={c.pct} accent={accent} />)}
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <section style={card}>{children}</section>;
}
function CardHead({ title, pct, accent }: { title: string; pct: number; accent: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
      <h2 style={{ color: accent, fontSize: 14, fontWeight: 700, margin: 0, letterSpacing: "0.01em" }}>{title}</h2>
      <span style={{ color: "white", fontSize: 20, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{pct.toFixed(1)}%</span>
    </div>
  );
}
function Row({ label, count, pct, accent }: { label: string; count: number; pct: number; accent: string }) {
  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3, gap: 8 }}>
        <span style={{ color: "#cbd5e1", fontWeight: 600 }}>{label}</span>
        <span style={{ color: "#94a3b8", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{count}<span style={{ color: "#475569" }}> · {pct.toFixed(1)}%</span></span>
      </div>
      <div style={{ height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>
        <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: accent, borderRadius: 4, opacity: 0.85 }} />
      </div>
    </div>
  );
}
function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: string }) {
  return (
    <div style={{ ...card, padding: "13px 15px" }}>
      <div style={{ color: tone, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: "white", fontSize: 25, fontWeight: 800, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ color: "#94a3b8", fontSize: 11.5, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#071428", border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 14, padding: 16,
};
const tileRow: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16,
};
const grid: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 14,
};

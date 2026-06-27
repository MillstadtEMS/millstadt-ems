"use client";

/**
 * Homepage call-statistics section. Self-contained (its own fetch), so it
 * never touches the fragile hero. Shows the full grouped + itemized
 * breakdown (Trauma / Medical / Uncategorized with categories, Fire
 * Response with Still/1st, Cardiac Arrest with Medical/Traumatic) — the
 * same hierarchy as /statistics. Aggregate percentages only, no ages.
 */

import Link from "next/link";
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

export default function PublicStatsSummary() {
  const [data, setData] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/cad/stats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data || data.total === 0) return null;

  return (
    <section className="bg-[#040d1a]" style={{ paddingTop: 28, paddingBottom: 28 }}>
      <div className="wrap">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <span style={{ height: 1, width: 30, background: "rgba(240,180,41,0.7)" }} />
          <span style={{ color: "#f0b429", fontSize: 11, fontWeight: 600, letterSpacing: "0.13em", textTransform: "uppercase" }}>
            {data.year} Year to Date · {data.total.toLocaleString()} calls
          </span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginBottom: 16 }}>
          <h2 style={{ color: "white", fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>Call Statistics</h2>
          <Link href="/statistics" style={{ color: "#f0b429", fontSize: 13, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
            Full statistics →
          </Link>
        </div>

        <div style={grid}>
          <GroupCard title="Trauma" group={data.groups.trauma} accent="#fca5a5" total={data.total} />
          <GroupCard title="Medical" group={data.groups.medical} accent="#86efac" total={data.total} />
          <GroupCard title="Uncategorized" group={data.groups.uncategorized} accent="#94a3b8" total={data.total} />

          <Card>
            <Head title="Fire Response" pct={data.fire.pct} accent="#fdba74" />
            <Sub count={data.fire.count} total={data.total} />
            <Row label="Still Alarm" count={data.fire.still.count} pct={data.fire.still.pct} accent="#fdba74" />
            <Row label="1st Alarm" count={data.fire.first.count} pct={data.fire.first.pct} accent="#fdba74" />
            {data.fire.other.count > 0 && <Row label="Other" count={data.fire.other.count} pct={data.fire.other.pct} accent="#fdba74" />}
          </Card>

          <Card>
            <Head title="Cardiac Arrest" pct={data.cardiac.pct} accent="#f0b429" />
            <Sub count={data.cardiac.count} total={data.total} />
            <Row label="Medical" count={data.cardiac.medical} pct={data.cardiac.count ? (data.cardiac.medical / data.cardiac.count) * 100 : 0} accent="#86efac" />
            <Row label="Traumatic" count={data.cardiac.trauma} pct={data.cardiac.count ? (data.cardiac.trauma / data.cardiac.count) * 100 : 0} accent="#fca5a5" />
          </Card>
        </div>
      </div>
    </section>
  );
}

function GroupCard({ title, group, accent, total }: { title: string; group: ClassGroup; accent: string; total: number }) {
  return (
    <Card>
      <Head title={title} pct={group.pct} accent={accent} />
      <Sub count={group.count} total={total} />
      {group.categories.length === 0 ? <span style={{ color: "#475569", fontSize: 12 }}>None.</span> :
        group.categories.map((c) => <Row key={c.name} label={c.name} count={c.count} pct={c.pct} accent={accent} />)}
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={card}>{children}</div>;
}
function Head({ title, pct, accent }: { title: string; pct: number; accent: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <h3 style={{ color: accent, fontSize: 14, fontWeight: 700, margin: 0, letterSpacing: "0.01em" }}>{title}</h3>
      <span style={{ color: "white", fontSize: 20, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{pct.toFixed(1)}%</span>
    </div>
  );
}
function Sub({ count, total }: { count: number; total: number }) {
  return <div style={{ color: "#64748b", fontSize: 11.5, margin: "2px 0 10px" }}>{count} of {total} calls</div>;
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

const card: React.CSSProperties = {
  background: "#071428", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16,
};
const grid: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 14,
};

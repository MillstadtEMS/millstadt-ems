"use client";

/**
 * Public year-to-date call statistics. Aggregate counts/percentages, with
 * each category expandable on hover/tap to list its individual ticker
 * calls (the same calls already public on the live ticker). Live —
 * re-polls every 45s. No patient detail beyond the dispatch line, no age
 * bands. Reads /api/cad/stats which mirrors the internal report grouping.
 */

import { useEffect, useState } from "react";
import PeakActivity, { type MonthPeak } from "@/components/PeakActivity";
import { PLATFORM_ORIGIN_DISCLAIMER } from "@/lib/cad/disclaimers";

interface GroupCat { name: string; count: number; pct: number }
interface ClassGroup { count: number; pct: number; categories: GroupCat[] }
interface FireStat { count: number; pct: number }
interface PubCall { date: string; time: string; nature: string; category: string; classification: string; fireType: string | null }
interface Stats {
  year: number;
  total: number;
  groups: { trauma: ClassGroup; medical: ClassGroup; uncategorized: ClassGroup };
  fire: { count: number; pct: number; still: FireStat; first: FireStat; other: FireStat };
  cardiac: { count: number; pct: number; medical: number; trauma: number };
  months: MonthPeak[];
  calls: PubCall[];
}

export default function StatisticsPage() {
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/cad/stats", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (alive) setData(d); })
        .catch(() => {})
        .finally(() => { if (alive) setLoading(false); });
    load();
    const id = setInterval(load, 45_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const calls = data?.calls ?? [];

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 18px 64px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <span style={{ height: 1, width: 34, background: "rgba(240,180,41,0.7)" }} />
        <span style={{ color: "#f0b429", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {data?.year ?? new Date().getFullYear()} Year to Date · Live
        </span>
      </div>
      <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 2.6rem)", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 6px", color: "white" }}>
        Call Statistics
      </h1>
      <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.55, maxWidth: 680, margin: "0 0 22px" }}>
        Millstadt EMS call volume by classification. Hover or tap any category to see its calls. Figures update live as the call log is maintained.
      </p>

      {loading && !data ? (
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
            <GroupCard title="Trauma" group={data.groups.trauma} accent="#fca5a5" total={data.total} calls={calls} classification="trauma" />
            <GroupCard title="Medical" group={data.groups.medical} accent="#86efac" total={data.total} calls={calls} classification="medical" />
            <GroupCard title="Uncategorized" group={data.groups.uncategorized} accent="#94a3b8" total={data.total} calls={calls} classification="uncategorized" />

            <CollapsibleCard title="Fire Response" pct={data.fire.pct} accent="#fdba74" sub={`${data.fire.count} of ${data.total}`}>
              <Row label="Still Alarm" count={data.fire.still.count} pct={data.fire.still.pct} accent="#fdba74" calls={calls.filter((c) => c.fireType === "still")} />
              <Row label="1st Alarm" count={data.fire.first.count} pct={data.fire.first.pct} accent="#fdba74" calls={calls.filter((c) => c.fireType === "first")} />
              {data.fire.other.count > 0 && <Row label="Other" count={data.fire.other.count} pct={data.fire.other.pct} accent="#fdba74" calls={calls.filter((c) => c.fireType === "other")} />}
            </CollapsibleCard>

            <CollapsibleCard title="Cardiac Arrest" pct={data.cardiac.pct} accent="#f0b429" sub={`${data.cardiac.count} total`}>
              <Row label="Medical" count={data.cardiac.medical} pct={data.cardiac.count ? (data.cardiac.medical / data.cardiac.count) * 100 : 0} accent="#86efac" calls={calls.filter((c) => c.category === "Cardiac Arrest" && c.classification === "medical")} />
              <Row label="Traumatic" count={data.cardiac.trauma} pct={data.cardiac.count ? (data.cardiac.trauma / data.cardiac.count) * 100 : 0} accent="#fca5a5" calls={calls.filter((c) => c.category === "Cardiac Arrest" && c.classification === "trauma")} />
              <p style={{ color: "#64748b", fontSize: 11.5, margin: "8px 0 0" }}>{data.cardiac.count} total cardiac arrests this year.</p>
            </CollapsibleCard>
          </div>

          <div style={{ marginTop: 22, marginBottom: 8 }}>
            <h2 style={{ color: "white", fontSize: "clamp(1.1rem, 3vw, 1.35rem)", fontWeight: 700, letterSpacing: "-0.01em", margin: "0 0 10px" }}>When calls happen</h2>
            <PeakActivity months={data.months} accent="#f0b429" />
          </div>

          <section style={{ marginTop: 20, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ color: "#94a3b8", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 7 }}>Disclaimer</div>
            <p style={{ color: "#94a3b8", fontSize: 12.5, lineHeight: 1.65, margin: 0 }}>
              {PLATFORM_ORIGIN_DISCLAIMER}
            </p>
          </section>
        </>
      )}
    </main>
  );
}

/** A stat card whose body collapses behind its header, so the page stays
 * compact. Tap the header to expand; children (category rows) then show, and
 * each row still reveals its individual calls on hover/tap. */
function CollapsibleCard({ title, pct, accent, sub, children }: { title: string; pct: number; accent: string; sub?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    // Collapsed cards keep their place in the 3-column grid; an OPEN card spans
    // the full grid width AND orders to the top of the grid (order:-1) so the
    // one you expanded isn't stuck below the collapsed cards above it.
    <section style={{ ...card, gridColumn: open ? "1 / -1" : undefined, order: open ? -1 : 0 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{ all: "unset", cursor: "pointer", display: "block", width: "100%", boxSizing: "border-box" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <span style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
            <span aria-hidden style={{ color: "#64748b", fontSize: 11, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s", display: "inline-block" }}>▶</span>
            <span style={{ color: accent, fontSize: 14, fontWeight: 700, letterSpacing: "0.01em" }}>{title}</span>
            {sub && <span style={{ color: "#64748b", fontSize: 11.5, whiteSpace: "nowrap" }}>{sub}</span>}
          </span>
          <span style={{ color: "white", fontSize: 20, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{pct.toFixed(1)}%</span>
        </div>
      </button>
      {open && <div style={{ marginTop: 10 }}>{children}</div>}
    </section>
  );
}

function GroupCard({ title, group, accent, total, calls, classification }: { title: string; group: ClassGroup; accent: string; total: number; calls: PubCall[]; classification: string }) {
  return (
    <CollapsibleCard title={title} pct={group.pct} accent={accent} sub={`${group.count} of ${total}`}>
      {group.categories.length === 0
        ? <span style={{ color: "#475569", fontSize: 12 }}>None.</span>
        : group.categories.map((c) => <Row key={c.name} label={c.name} count={c.count} pct={c.pct} accent={accent} calls={calls.filter((x) => x.category === c.name && x.classification === classification)} />)}
    </CollapsibleCard>
  );
}

function Row({ label, count, pct, accent, calls }: { label: string; count: number; pct: number; accent: string; calls: PubCall[] }) {
  const [show, setShow] = useState(false);
  const hasCalls = calls.length > 0;
  return (
    <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} style={{ marginBottom: 7 }}>
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        style={{ all: "unset", cursor: hasCalls ? "pointer" : "default", display: "block", width: "100%", boxSizing: "border-box" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3, gap: 8 }}>
          <span style={{ color: "#cbd5e1", fontWeight: 600 }}>{label}</span>
          <span style={{ color: "#94a3b8", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{count}<span style={{ color: "#475569" }}> · {pct.toFixed(1)}%</span></span>
        </div>
        <div style={{ height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>
          <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: accent, borderRadius: 4, opacity: 0.85 }} />
        </div>
      </button>
      {show && hasCalls && (
        <div style={{ marginTop: 6, display: "grid", gap: 4, padding: "8px 10px", background: "rgba(2,9,18,0.55)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9, maxHeight: 230, overflowY: "auto" }}>
          {calls.map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 10, fontSize: 11.5, alignItems: "baseline" }}>
              <span style={{ color: "#94a3b8", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{c.date} {c.time}</span>
              <span style={{ color: "#e2e8f0", flex: 1, minWidth: 0, lineHeight: 1.45, overflowWrap: "anywhere" }}>{c.nature}</span>
            </div>
          ))}
        </div>
      )}
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
  background: "#071428", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16,
};
const tileRow: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16,
};
const grid: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 14, alignItems: "start",
};

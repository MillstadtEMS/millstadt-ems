"use client";

/**
 * Admin · Call Ticker Reports
 *
 * Drives every aggregate off the structured columns on cad_calls.
 * Filters mirror the spec: date range OR year OR year+month, plus
 * unit / agency / category / mutual-aid status / HEMS status.
 *
 * Everything that displays a percentage uses the canonical formula
 * `count ÷ total ÷ × 100` against the filtered range total — never
 * against the absolute year total — so the percentages always add up.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CallBusyCharts from "@/components/CallBusyCharts";

const MILLSTADT_UNITS = ["M3925", "M3926", "M3935"] as const;
const MUTUAL_AID_AGENCIES = [
  "Columbia EMS","Monroe County EMS","Dupo EMS","Medstar EMS",
  "Abbott EMS","Mascoutah EMS","New Baden EMS","O'Fallon EMS",
] as const;

const UNIT_TONE: Record<string, string> = { M3925: "#f0b429", M3926: "#7dd3fc", M3935: "#c4b5fd" };

interface ReportTotals {
  calls: number; mutualAidReceived: number; mutualAidGiven: number;
  hemsRequested: number; hemsHandoff: number; hemsDisregarded: number;
  multiUnit: number;
}
interface CatRow   { name:   string; count: number; pct: number }
interface UnitRow  { unit:   string; count: number; pct: number }
interface AgRow    { agency: string; count: number; pct: number }
interface DayRow   { day:    string; count: number }
interface GroupCat { name: string; count: number; pct: number }
interface ClassGroup { count: number; pct: number; categories: GroupCat[] }
interface FireStat { count: number; pct: number }
interface DrillCall {
  id: string; date: string; time: string; nature: string;
  category: string; classification: string; isFire: boolean; fireType: string | null;
}
interface ReportData {
  range: { from: string | null; to: string | null; year: number | null; month: number | null };
  filters: Record<string, string | null>;
  totals: ReportTotals;
  byCategory: CatRow[];
  byUnit:     UnitRow[];
  byMAAgency: AgRow[];
  maGivenByUnit: UnitRow[];
  maGivenByAgency: AgRow[];
  dailyCounts: DayRow[];
  groups: { trauma: ClassGroup; medical: ClassGroup; uncategorized: ClassGroup };
  fire: { count: number; pct: number; still: FireStat; first: FireStat; other: FireStat };
  cardiac: { count: number; pct: number; trauma: number; medical: number; adult: number; pediatric: number };
  byHour: number[];
  byDow: number[];
  calls: DrillCall[];
  categories?: string[];
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type Mode = "ytd" | "thisMonth" | "thisQuarter" | "last30" | "ym" | "year" | "range";

/** Compute the concrete YYYY-MM-DD pair for the simple presets. */
function presetRange(mode: "ytd" | "thisMonth" | "thisQuarter" | "last30"): { from: string; to: string } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (mode === "ytd") {
    return { from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(now) };
  }
  if (mode === "thisMonth") {
    return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) };
  }
  if (mode === "thisQuarter") {
    const q = Math.floor(now.getMonth() / 3);
    return { from: iso(new Date(now.getFullYear(), q * 3, 1)), to: iso(now) };
  }
  // last30
  const start = new Date(now);
  start.setDate(start.getDate() - 29);
  return { from: iso(start), to: iso(now) };
}

export default function CallReportsPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ isAdmin: boolean } | null>(null);
  useEffect(() => {
    fetch("/api/lounge/me").then(async (r) => {
      if (!r.ok) { router.push("/lounge/login"); return; }
      const d = await r.json();
      if (!d.employee?.isAdmin) { router.push("/lounge"); return; }
      setMe(d.employee);
    });
  }, [router]);

  const now = new Date();
  const [mode, setMode] = useState<Mode>("ytd");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [from, setFrom] = useState<string>(now.toISOString().slice(0, 10));
  const [to, setTo]     = useState<string>(now.toISOString().slice(0, 10));

  const [unit, setUnit] = useState("");
  const [agency, setAgency] = useState("");
  const [category, setCategory] = useState("");
  const [maStatus, setMaStatus] = useState("");
  const [hemsStatus, setHemsStatus] = useState("");

  const [data, setData] = useState<ReportData | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  // Clickable drill-down: which calls to list in the modal.
  const [drill, setDrill] = useState<{ title: string; calls: DrillCall[] } | null>(null);
  function openDrill(title: string, pred: (c: DrillCall) => boolean) {
    if (!data) return;
    setDrill({ title, calls: data.calls.filter(pred) });
  }

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    const p = new URLSearchParams();
    if (mode === "year") p.set("year", String(year));
    else if (mode === "ym") { p.set("year", String(year)); p.set("month", String(month)); }
    else if (mode === "range") { p.set("from", from); p.set("to", to); }
    else {
      // ytd / thisMonth / thisQuarter / last30 — pure date-range presets
      const r = presetRange(mode);
      p.set("from", r.from);
      p.set("to", r.to);
    }
    if (unit)       p.set("unit", unit);
    if (agency)     p.set("agency", agency);
    if (category)   p.set("category", category);
    if (maStatus)   p.set("maStatus", maStatus);
    if (hemsStatus) p.set("hemsStatus", hemsStatus);
    const r = await fetch(`/api/admin/calls/reports?${p.toString()}`, { cache: "no-store" });
    if (r.ok) setData(await r.json());
    setLoading(false);
  }, [mode, year, month, from, to, unit, agency, category, maStatus, hemsStatus]);

  useEffect(() => { if (me) load(); }, [me, load]);
  // Keep the report live as calls are added/edited.
  useEffect(() => {
    if (!me) return;
    const id = setInterval(() => load({ quiet: true }), 60_000);
    return () => clearInterval(id);
  }, [me, load]);
  useEffect(() => {
    fetch("/api/admin/calls/categories").then((r) => r.ok ? r.json() : { categories: [] }).then((d) => setCategories(d.categories ?? []));
  }, []);

  const headline = useMemo(() => {
    if (mode === "year") return `${year}`;
    if (mode === "ym")   return `${MONTH_NAMES[month - 1]} ${year}`;
    if (mode === "range") return `${from} → ${to}`;
    if (mode === "ytd") { const r = presetRange("ytd"); return `YTD · ${r.from} → ${r.to}`; }
    if (mode === "thisMonth")   { const r = presetRange("thisMonth");   return `This month · ${r.from} → ${r.to}`; }
    if (mode === "thisQuarter") { const r = presetRange("thisQuarter"); return `This quarter · ${r.from} → ${r.to}`; }
    const r = presetRange("last30"); return `Last 30 days · ${r.from} → ${r.to}`;
  }, [mode, year, month, from, to]);

  const handoffRate = data && data.totals.hemsRequested > 0
    ? (data.totals.hemsHandoff / data.totals.hemsRequested) * 100
    : null;

  if (!me) return <p style={{ color: "#94a3b8", padding: 22 }}>Loading…</p>;

  return (
    <div>
      <header style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
        <div>
          <div style={{ color: "#7dd3fc", fontSize: 11, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Admin · Calls
          </div>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.85rem", fontWeight: 900, letterSpacing: "-0.015em" }}>
            Call Ticker Reports
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 12.5, marginTop: 4, lineHeight: 1.5, maxWidth: 760 }}>
            Live aggregations over the structured ticker data. Percentages are <code style={code}>count ÷ total × 100</code> against the filtered window total, never the absolute year — so every column adds up cleanly.
          </p>
        </div>
        <Link href="/admin/calls" style={ghostBtn}>← Ticker editor</Link>
      </header>

      {/* ── Range + filters ───────────────────────────────────────────── */}
      <section style={card}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {([
            ["ytd",         "YTD"],
            ["thisMonth",   "This month"],
            ["thisQuarter", "This quarter"],
            ["last30",      "Last 30 days"],
            ["ym",          "Year + month"],
            ["year",        "Year"],
            ["range",       "Custom range"],
          ] as [Mode, string][]).map(([m, label]) => (
            <button key={m} type="button" onClick={() => setMode(m)} style={mode === m ? chipOn : chipOff}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          {(mode === "year" || mode === "ym") && (
            <Field label="Year">
              <select value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} style={inputStyle}>
                {[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </Field>
          )}
          {mode === "ym" && (
            <Field label="Month">
              <select value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10))} style={inputStyle}>
                {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </Field>
          )}
          {mode === "range" && (
            <>
              <Field label="From"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inputStyle} /></Field>
              <Field label="To">  <input type="date" value={to}   onChange={(e) => setTo(e.target.value)}   style={inputStyle} /></Field>
            </>
          )}
          <Field label="Unit">
            <select value={unit} onChange={(e) => setUnit(e.target.value)} style={inputStyle}>
              <option value="">Any</option>
              {MILLSTADT_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="Mutual-aid agency">
            <select value={agency} onChange={(e) => setAgency(e.target.value)} style={inputStyle}>
              <option value="">Any</option>
              {MUTUAL_AID_AGENCIES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
              <option value="">Any</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Mutual aid">
            <select value={maStatus} onChange={(e) => setMaStatus(e.target.value)} style={inputStyle}>
              <option value="">Any</option>
              <option value="received">Received</option>
              <option value="given">Given</option>
              <option value="none">Neither</option>
            </select>
          </Field>
          <Field label="HEMS">
            <select value={hemsStatus} onChange={(e) => setHemsStatus(e.target.value)} style={inputStyle}>
              <option value="">Any</option>
              <option value="requested">Requested</option>
              <option value="handoff">Handoff</option>
              <option value="disregarded">Disregarded</option>
            </select>
          </Field>
        </div>
      </section>

      {/* ── Headline tiles ────────────────────────────────────────────── */}
      {loading || !data ? (
        <p style={{ color: "#94a3b8" }}>Crunching…</p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
            <Tile label={headline} value={data.totals.calls.toLocaleString()} sub="Total calls" tone="gold" />
            <Tile label="Mutual aid received" value={data.totals.mutualAidReceived.toString()} sub="Outside in" tone="sky" />
            <Tile label="Mutual aid given"    value={data.totals.mutualAidGiven.toString()}    sub="Millstadt out" tone="emerald" />
            <Tile label="HEMS requested"      value={data.totals.hemsRequested.toString()}    sub="On-scene helicopter calls" tone="rose" />
            <Tile label="Handoff rate"        value={handoffRate === null ? "—" : `${handoffRate.toFixed(0)}%`} sub="Handoff ÷ requested" tone="emerald" />
            <Tile label="Multi-unit responses" value={data.totals.multiUnit.toString()} sub="2+ units on the call" tone="sky" />
          </div>

          {/* ── Classification breakdown — Trauma / Medical / Uncategorized ── */}
          <p style={{ color: "#64748b", fontSize: 11.5, margin: "0 0 8px" }}>Tap any row to list the matching calls.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, marginBottom: 14 }}>
            <GroupCard title="Trauma" group={data.groups.trauma} accent="#fca5a5"
              onGroup={() => openDrill("Trauma calls", (c) => c.classification === "trauma")}
              onCat={(name) => openDrill(name, (c) => c.category === name && c.classification === "trauma")} />
            <GroupCard title="Medical" group={data.groups.medical} accent="#34d399"
              onGroup={() => openDrill("Medical calls", (c) => c.classification === "medical")}
              onCat={(name) => openDrill(name, (c) => c.category === name && c.classification === "medical")} />
            <GroupCard title="Uncategorized" group={data.groups.uncategorized} accent="#94a3b8"
              onGroup={() => openDrill("Uncategorized calls", (c) => c.classification === "uncategorized" && !c.isFire)}
              onCat={(name) => openDrill(name, (c) => c.category === name && c.classification === "uncategorized")} />
          </div>

          {/* ── Fire Response + Cardiac Arrest ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, marginBottom: 14 }}>
            <Section title="Fire Response" subtitle={`${data.fire.count} · ${data.fire.pct.toFixed(1)}%`}>
              <ClickRow label="Fire Response — total" count={data.fire.count} pct={data.fire.pct} bold accent="#fb923c"
                onClick={() => openDrill("Fire Response calls", (c) => c.isFire)} />
              <div style={{ paddingLeft: 10, display: "grid", gap: 5, marginTop: 5 }}>
                <ClickRow label="• Still Alarm" count={data.fire.still.count} pct={data.fire.still.pct} accent="#fb923c"
                  onClick={() => openDrill("Fire — Still Alarm", (c) => c.isFire && c.fireType === "still")} />
                <ClickRow label="• 1st Alarm" count={data.fire.first.count} pct={data.fire.first.pct} accent="#fb923c"
                  onClick={() => openDrill("Fire — 1st Alarm", (c) => c.isFire && c.fireType === "first")} />
                {data.fire.other.count > 0 && (
                  <ClickRow label="• Other" count={data.fire.other.count} pct={data.fire.other.pct} accent="#fb923c"
                    onClick={() => openDrill("Fire — Other", (c) => c.isFire && c.fireType === "other")} />
                )}
              </div>
            </Section>
            <Section title="Cardiac Arrest" subtitle={`${data.cardiac.count} · ${data.cardiac.pct.toFixed(1)}%`}>
              <ClickRow label="Cardiac Arrest — total" count={data.cardiac.count} pct={data.cardiac.pct} bold accent="#f0b429"
                onClick={() => openDrill("Cardiac Arrest calls", (c) => c.category === "Cardiac Arrest")} />
              <div style={{ paddingLeft: 10, display: "grid", gap: 5, marginTop: 5 }}>
                <ClickRow label="• Medical" count={data.cardiac.medical} pct={data.cardiac.count ? (data.cardiac.medical / data.cardiac.count) * 100 : 0} accent="#34d399"
                  onClick={() => openDrill("Cardiac Arrest — Medical", (c) => c.category === "Cardiac Arrest" && c.classification === "medical")} />
                <ClickRow label="• Trauma" count={data.cardiac.trauma} pct={data.cardiac.count ? (data.cardiac.trauma / data.cardiac.count) * 100 : 0} accent="#fca5a5"
                  onClick={() => openDrill("Cardiac Arrest — Trauma", (c) => c.category === "Cardiac Arrest" && c.classification === "trauma")} />
              </div>
              <p style={{ color: "#64748b", fontSize: 11, marginTop: 8 }}>Adult {data.cardiac.adult} · Pediatric {data.cardiac.pediatric} (back-office only)</p>
            </Section>
          </div>

          {/* ── Busiest times ── */}
          <div style={{ marginBottom: 14 }}>
            <CallBusyCharts byHour={data.byHour} byDow={data.byDow} accent="#f0b429" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
            {/* Category leaderboard */}
            <Section title="Categories" subtitle={`${data.byCategory.length} distinct`}>
              {data.byCategory.length === 0 ? <Empty /> : (
                <BarList rows={data.byCategory.map((r) => ({ label: r.name, count: r.count, pct: r.pct }))} accent="#f0b429" />
              )}
            </Section>

            {/* Units */}
            <Section title="Per Millstadt unit">
              <BarList
                rows={MILLSTADT_UNITS.map((u) => {
                  const row = data.byUnit.find((r) => r.unit === u);
                  return { label: u, count: row?.count ?? 0, pct: row?.pct ?? 0, accent: UNIT_TONE[u] };
                })}
                accent="#7dd3fc"
              />
            </Section>

            {/* MA received by agency — who runs aid for us */}
            <Section title="Mutual aid received · who ran it for us" subtitle="by agency">
              {data.byMAAgency.length === 0 ? <Empty hint="No MA-received calls in this window." /> : (
                <BarList rows={data.byMAAgency.map((r) => ({ label: r.agency, count: r.count, pct: r.pct }))} accent="#34d399" />
              )}
            </Section>

            {/* MA given by agency — who we assisted */}
            <Section title="Mutual aid given · who we assisted" subtitle="by agency">
              {data.maGivenByAgency.length === 0 ? <Empty hint="No agency recorded on MA-given calls in this window." /> : (
                <BarList rows={data.maGivenByAgency.map((r) => ({ label: r.agency, count: r.count, pct: r.pct }))} accent="#c4b5fd" />
              )}
            </Section>

            {/* MA given by unit */}
            <Section title="Mutual aid given · by unit">
              {data.maGivenByUnit.length === 0 ? <Empty hint="No MA-given calls in this window." /> : (
                <BarList rows={data.maGivenByUnit.map((r) => ({ label: r.unit, count: r.count, pct: r.pct, accent: UNIT_TONE[r.unit] }))} accent="#c4b5fd" />
              )}
            </Section>

            {/* HEMS breakdown */}
            <Section title="HEMS">
              <BarList
                rows={[
                  { label: "Requested",      count: data.totals.hemsRequested,   pct: 0, accent: "#fda4af" },
                  { label: "Patient handoff", count: data.totals.hemsHandoff,    pct: data.totals.hemsRequested > 0 ? (data.totals.hemsHandoff / data.totals.hemsRequested) * 100 : 0, accent: "#86efac" },
                  { label: "Disregarded",    count: data.totals.hemsDisregarded, pct: data.totals.hemsRequested > 0 ? (data.totals.hemsDisregarded / data.totals.hemsRequested) * 100 : 0, accent: "#94a3b8" },
                ]}
                accent="#fca5a5"
              />
              <p style={{ color: "#475569", fontSize: 11, marginTop: 8 }}>
                Handoff + disregarded percentages are against HEMS requested (not total calls).
              </p>
            </Section>

            {/* Daily mini histogram */}
            <Section title="Daily call counts">
              {data.dailyCounts.length === 0 ? <Empty /> : <DailyHist rows={data.dailyCounts} />}
            </Section>
          </div>
        </>
      )}

      {/* ── Disclaimer / formulas ─────────────────────────────────────── */}
      <section style={{ ...card, marginTop: 14 }}>
        <div style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.55 }}>
          <strong style={{ color: "white" }}>Disclaimer.</strong> Call category statistics are based on dispatch / ticker information only and may not reflect the final patient care report impression, diagnosis, or billing classification. Categories, formulas, and projections are subject to change as ticker entries are edited or updated.
        </div>
        <div style={{ marginTop: 10, fontFamily: "var(--font-mas-mono), ui-monospace, monospace", fontSize: 11, color: "#94a3b8", display: "grid", gap: 3 }}>
          <div><span style={{ color: "#f0b429" }}>Category %</span>        = category count ÷ total calls (selected period) × 100</div>
          <div><span style={{ color: "#f0b429" }}>Top categories</span>    = categories ranked by total count for the selected period</div>
          <div><span style={{ color: "#f0b429" }}>Mutual aid received</span> = outside EMS response into Millstadt EMS venue</div>
          <div><span style={{ color: "#f0b429" }}>Mutual aid given</span>  = Millstadt EMS response outside its venue</div>
          <div><span style={{ color: "#f0b429" }}>HEMS handoff rate</span> = patient handoffs ÷ total HEMS requests × 100</div>
        </div>
      </section>

      {drill && (
        <div onClick={() => setDrill(null)} role="dialog" aria-modal="true"
          style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(2,9,18,0.78)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 12px", overflowY: "auto" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 680, background: "#071428", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 18, boxShadow: "0 30px 80px rgba(0,0,0,0.55)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10 }}>
              <h2 style={{ margin: 0, color: "white", fontSize: 15, fontWeight: 700 }}>
                {drill.title} <span style={{ color: "#94a3b8", fontWeight: 600 }}>· {drill.calls.length}</span>
              </h2>
              <button type="button" onClick={() => setDrill(null)} style={{ ...ghostBtn, padding: "6px 12px" }}>Close</button>
            </div>
            <div style={{ display: "grid", gap: 6, maxHeight: "62vh", overflowY: "auto" }}>
              {drill.calls.length === 0 ? <span style={{ color: "#475569", fontSize: 12.5 }}>No calls.</span> :
                drill.calls.map((c) => (
                  <div key={c.id} style={{ display: "flex", gap: 10, padding: "8px 10px", borderRadius: 9, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", alignItems: "baseline", flexWrap: "wrap" }}>
                    <span style={{ color: "#94a3b8", fontSize: 11.5, fontVariantNumeric: "tabular-nums", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace", whiteSpace: "nowrap" }}>{c.date} {c.time}</span>
                    <span style={{ color: "white", fontSize: 12.5, fontWeight: 600 }}>{c.nature}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupCard({ title, group, accent, onGroup, onCat }: {
  title: string; group: ClassGroup; accent: string; onGroup: () => void; onCat: (name: string) => void;
}) {
  return (
    <section style={card}>
      <button type="button" onClick={onGroup} style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2 style={{ color: accent, fontSize: 13, fontWeight: 700, margin: 0, letterSpacing: "0.02em" }}>{title}</h2>
          <span style={{ color: "white", fontSize: 19, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{group.pct.toFixed(1)}%</span>
        </div>
        <div style={{ color: "#94a3b8", fontSize: 11.5, margin: "2px 0 10px" }}>{group.count} call{group.count === 1 ? "" : "s"}</div>
      </button>
      <div style={{ display: "grid", gap: 6 }}>
        {group.categories.length === 0 ? <span style={{ color: "#475569", fontSize: 12 }}>None.</span> :
          group.categories.map((c) => (
            <ClickRow key={c.name} label={c.name} count={c.count} pct={c.pct} accent={accent} onClick={() => onCat(c.name)} />
          ))}
      </div>
    </section>
  );
}

function ClickRow({ label, count, pct, accent, bold, onClick }: {
  label: string; count: number; pct: number; accent: string; bold?: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={{ all: "unset", cursor: "pointer", display: "block" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3, gap: 8 }}>
        <span style={{ color: bold ? "white" : "#cbd5e1", fontWeight: bold ? 700 : 600 }}>{label}</span>
        <span style={{ color: "#94a3b8", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{count}<span style={{ color: "#475569" }}> · {pct.toFixed(1)}%</span></span>
      </div>
      <div style={{ height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>
        <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: accent, borderRadius: 4, opacity: 0.85 }} />
      </div>
    </button>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <h2 style={{ color: "#f0b429", fontSize: 10.5, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase", margin: 0 }}>{title}</h2>
        {subtitle && <span style={{ color: "#64748b", fontSize: 11 }}>{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: "gold" | "sky" | "emerald" | "rose" }) {
  const c = tone === "gold" ? "#f0b429" : tone === "sky" ? "#7dd3fc" : tone === "emerald" ? "#34d399" : "#fca5a5";
  return (
    <div style={{ ...card, padding: "12px 14px", margin: 0 }}>
      <div style={{ color: c, fontSize: 9.5, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: "white", fontSize: 24, fontWeight: 900, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function BarList({ rows, accent }: { rows: { label: string; count: number; pct: number; accent?: string }[]; accent: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
      {rows.map((r) => (
        <li key={r.label}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 12 }}>
            <span style={{ color: "#cbd5e1", fontWeight: 700 }}>{r.label}</span>
            <span style={{ color: "#94a3b8", fontVariantNumeric: "tabular-nums" }}>
              {r.count}{r.pct > 0 ? <span style={{ color: "#475569" }}> · {r.pct.toFixed(1)}%</span> : ""}
            </span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>
            <div style={{ height: "100%", width: `${(r.count / max) * 100}%`, background: r.accent ?? accent, borderRadius: 4 }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function DailyHist({ rows }: { rows: { day: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${rows.length}, 1fr)`, gap: 2, alignItems: "end", height: 90 }}>
      {rows.map((r) => (
        <div
          key={r.day}
          title={`${r.day}: ${r.count}`}
          style={{
            height: `${Math.max(4, (r.count / max) * 100)}%`,
            background: "#7dd3fc",
            borderRadius: 2,
            opacity: 0.85,
          }}
        />
      ))}
    </div>
  );
}

function Empty({ hint }: { hint?: string }) {
  return <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>{hint ?? "Nothing matches this filter set."}</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", color: "#94a3b8", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>{label}</span>
      {children}
    </label>
  );
}

const card: React.CSSProperties = {
  background: "#071428", border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 14, padding: 16, marginBottom: 12,
};
const inputStyle: React.CSSProperties = {
  width: "100%", background: "#040d1a",
  border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10,
  padding: "9px 12px", color: "white", fontSize: 13, fontFamily: "inherit",
};
const chipOn: React.CSSProperties = {
  background: "#f0b429", color: "#040d1a", border: 0, padding: "6px 12px",
  borderRadius: 999, fontWeight: 900, fontSize: 11, letterSpacing: "0.10em",
  textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit",
};
const chipOff: React.CSSProperties = {
  background: "transparent", color: "#cbd5e1",
  border: "1px solid rgba(255,255,255,0.12)", padding: "6px 12px",
  borderRadius: 999, fontWeight: 700, fontSize: 11, letterSpacing: "0.10em",
  textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit",
};
const ghostBtn: React.CSSProperties = {
  background: "transparent", color: "#cbd5e1",
  border: "1px solid rgba(255,255,255,0.12)", padding: "8px 12px",
  borderRadius: 10, fontWeight: 800, fontSize: 12,
  letterSpacing: "0.10em", textTransform: "uppercase",
  textDecoration: "none",
};
const code: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: 4,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace", fontSize: 11.5,
};

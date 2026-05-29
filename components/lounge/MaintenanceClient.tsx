"use client";

import { useCallback, useEffect, useState } from "react";
import LoungePageHeader from "./LoungePageHeader";

type Kind = "vehicle" | "building";
type Status = "open" | "in_progress" | "resolved" | "dismissed";

interface Req {
  id: string;
  kind: Kind;
  category: string;
  customCategory: string | null;
  unitOrLocation: string | null;
  summary: string;
  details: string | null;
  status: Status;
  resolvedAt: string | null;
  resolvedNotes: string | null;
  createdAt: string;
  createdBy: { id: string; firstName: string; lastName: string; photoUrl: string | null };
}

const VEHICLE_CATEGORIES = [
  "Oil change due",
  "Tire pressure / rotation",
  "Brakes",
  "Battery",
  "Lights / sirens / strobes",
  "Suction unit",
  "Onboard O₂ system",
  "Stretcher / cot / power-load",
  "AC / heat / climate",
  "Wipers / fluids",
  "Engine warning light",
  "Fuel system",
  "Body damage / scratch / dent",
  "Interior cleanliness",
  "Other",
] as const;

const BUILDING_CATEGORIES = [
  "HVAC / AC / heat",
  "Plumbing",
  "Electrical / lighting",
  "Door / lock / garage door",
  "Roof / ceiling / leak",
  "Internet / network / Wi-Fi",
  "Appliance (fridge/stove/etc.)",
  "Bay floor / drain",
  "Office equipment",
  "Pest / cleanliness",
  "Security / camera",
  "Cleaning supplies needed",
  "Other",
] as const;

const VEHICLE_UNITS = ["M3935", "M3926", "M3925", "Other / multiple"];
const BUILDING_AREAS = ["Bay / garage", "Day room / kitchen", "Bunk room", "Office", "Restroom", "Exterior", "Other"];

const STATUS_META: Record<Status, { label: string; color: string; bg: string }> = {
  open:         { label: "Open",        color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  in_progress:  { label: "In Progress", color: "#38bdf8", bg: "rgba(56,189,248,0.12)" },
  resolved:     { label: "Resolved",    color: "#86efac", bg: "rgba(134,239,172,0.12)" },
  dismissed:    { label: "Dismissed",   color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
};

export default function MaintenanceClient({ isAdmin }: { isAdmin: boolean }) {
  const [mine, setMine] = useState<Req[]>([]);
  const [all, setAll] = useState<Req[]>([]);
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [composing, setComposing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [m, a] = await Promise.all([
      fetch("/api/lounge/maintenance?scope=mine").then((r) => r.ok ? r.json() : { requests: [] }),
      isAdmin ? fetch("/api/lounge/maintenance?scope=all").then((r) => r.ok ? r.json() : { requests: [] }) : Promise.resolve({ requests: [] }),
    ]);
    setMine(m.requests ?? []);
    setAll(a.requests ?? []);
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  const visible = scope === "all" ? all : mine;
  const open = visible.filter((r) => r.status === "open" || r.status === "in_progress");
  const done = visible.filter((r) => r.status === "resolved" || r.status === "dismissed");

  return (
    <div>
      <LoungePageHeader
        kicker="Maintenance"
        title="Trucks, station, and everything in between"
        description={
          <>
            Spot something broken? Open a ticket. Leadership sees it on the dashboard and
            updates the status as it&apos;s worked.
          </>
        }
        photo="/lounge/brand/compartment.jpg"
        photoPosition="center 55%"
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 14 }}>
        <button type="button" onClick={() => setComposing(true)} style={goldBtn}>+ New Request</button>
        {isAdmin && (
          <div style={{ display: "flex", background: "#071428", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden" }}>
            <ScopeBtn active={scope === "mine"} onClick={() => setScope("mine")}>Mine ({mine.length})</ScopeBtn>
            <ScopeBtn active={scope === "all"}  onClick={() => setScope("all")}>All Station ({all.length})</ScopeBtn>
          </div>
        )}
      </div>

      {composing && (
        <Composer
          onCancel={() => setComposing(false)}
          onSubmit={async (body) => {
            const r = await fetch("/api/lounge/maintenance", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            if (r.ok) { setComposing(false); await load(); }
          }}
        />
      )}

      <Section title={`Open (${open.length})`} accent="#fbbf24">
        {loading ? <p style={muted}>Loading…</p> :
         open.length === 0 ? <p style={muted}>Nothing open. Nice.</p> :
         open.map((r) => <Card key={r.id} req={r} isAdmin={isAdmin} onChange={load} />)}
      </Section>

      <Section title={`Resolved (${done.length})`} accent="#64748b">
        {done.length === 0 ? <p style={muted}>—</p> :
         done.map((r) => <Card key={r.id} req={r} isAdmin={isAdmin} onChange={load} />)}
      </Section>
    </div>
  );
}

function ScopeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 14px",
        background: active ? "rgba(240,180,41,0.15)" : "transparent",
        color: active ? "#f0b429" : "#94a3b8",
        border: 0,
        fontFamily: "inherit",
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: accent }} />
        <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", color: "#e2e8f0" }}>
          {title}
        </span>
      </div>
      <div style={{ display: "grid", gap: 10 }}>{children}</div>
    </section>
  );
}

function Card({ req, isAdmin, onChange }: { req: Req; isAdmin: boolean; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const meta = STATUS_META[req.status];
  const cat = req.category === "Other" ? `Other — ${req.customCategory ?? ""}` : req.category;

  async function update(status: Status, notes?: string) {
    setBusy(true);
    try {
      await fetch(`/api/lounge/maintenance/${req.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes: notes ?? null }),
      });
      await onChange();
    } finally { setBusy(false); }
  }
  async function remove() {
    if (!confirm("Delete this request?")) return;
    setBusy(true);
    try {
      await fetch(`/api/lounge/maintenance/${req.id}`, { method: "DELETE" });
      await onChange();
    } finally { setBusy(false); }
  }

  return (
    <article style={{ background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22 }}>{req.kind === "vehicle" ? "🚑" : "🏠"}</span>
            <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: "#f0b429" }}>
              {req.kind === "vehicle" ? "Vehicle" : "Building"}{req.unitOrLocation ? ` · ${req.unitOrLocation}` : ""}
            </span>
          </div>
          <h3 style={{ margin: "4px 0 2px", fontSize: 16, fontWeight: 900, color: "white" }}>{cat}</h3>
          <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 4 }}>{req.summary}</div>
        </div>
        <span style={{ padding: "4px 10px", borderRadius: 999, background: meta.bg, color: meta.color, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {meta.label}
        </span>
      </div>

      {req.details && (
        <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
          {req.details}
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 10, flexWrap: "wrap" }}>
        <span style={{ color: "#64748b", fontSize: 12 }}>
          Submitted by {req.createdBy.firstName} {req.createdBy.lastName} · {new Date(req.createdAt).toLocaleString()}
        </span>
        {isAdmin && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {req.status === "open" && (
              <button type="button" disabled={busy} onClick={() => update("in_progress")} style={smallBtn("#38bdf8")}>Start</button>
            )}
            {(req.status === "open" || req.status === "in_progress") && (
              <>
                <button type="button" disabled={busy} onClick={() => {
                  const n = prompt("Notes for resolution (optional)") ?? "";
                  update("resolved", n);
                }} style={smallBtn("#86efac")}>Resolved</button>
                <button type="button" disabled={busy} onClick={() => update("dismissed")} style={smallBtn("#94a3b8")}>Dismiss</button>
              </>
            )}
            {(req.status === "resolved" || req.status === "dismissed") && (
              <button type="button" disabled={busy} onClick={() => update("open")} style={smallBtn("#fbbf24")}>Reopen</button>
            )}
            <button type="button" disabled={busy} onClick={remove} style={smallBtn("#fca5a5")}>Delete</button>
          </div>
        )}
      </div>

      {req.resolvedNotes && (
        <div style={{ marginTop: 8, padding: 10, background: "rgba(134,239,172,0.06)", border: "1px solid rgba(134,239,172,0.20)", borderRadius: 10 }}>
          <div style={{ color: "#86efac", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>
            Resolution notes
          </div>
          <div style={{ color: "#e2e8f0", fontSize: 13, whiteSpace: "pre-wrap" }}>{req.resolvedNotes}</div>
        </div>
      )}
    </article>
  );
}

function Composer({ onCancel, onSubmit }: {
  onCancel: () => void;
  onSubmit: (body: { kind: Kind; category: string; customCategory?: string; unitOrLocation?: string; summary: string; details?: string }) => Promise<void>;
}) {
  const [kind, setKind] = useState<Kind>("vehicle");
  const [category, setCategory] = useState<string>(VEHICLE_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [unitOrLocation, setUnit] = useState("");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const cats = kind === "vehicle" ? VEHICLE_CATEGORIES : BUILDING_CATEGORIES;
  const locations = kind === "vehicle" ? VEHICLE_UNITS : BUILDING_AREAS;

  async function go() {
    if (!summary.trim()) return;
    if (category === "Other" && !customCategory.trim()) return;
    setBusy(true);
    try {
      await onSubmit({
        kind,
        category,
        customCategory: category === "Other" ? customCategory.trim() : undefined,
        unitOrLocation: unitOrLocation || undefined,
        summary: summary.trim(),
        details: details.trim() || undefined,
      });
    } finally { setBusy(false); }
  }

  return (
    <section style={{ background: "#071428", border: "1px solid rgba(240,180,41,0.30)", borderRadius: 14, padding: 18, marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <KindTab active={kind === "vehicle"} onClick={() => { setKind("vehicle"); setCategory(VEHICLE_CATEGORIES[0]); }} label="🚑 Vehicle" />
        <KindTab active={kind === "building"} onClick={() => { setKind("building"); setCategory(BUILDING_CATEGORIES[0]); }} label="🏠 Building" />
      </div>

      <Field label={kind === "vehicle" ? "Unit" : "Area of station"}>
        <select value={unitOrLocation} onChange={(e) => setUnit(e.target.value)} style={inp}>
          <option value="">— select —</option>
          {locations.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </Field>

      <Field label="What's wrong?">
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={inp}>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>

      {category === "Other" && (
        <Field label="Describe (since you picked Other)">
          <input value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="Short label for the issue" style={inp} />
        </Field>
      )}

      <Field label="Quick summary">
        <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One-line description for the ticket list" style={inp} />
      </Field>

      <Field label="Details (optional)">
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={4} placeholder="When did you notice it? Any photos taken? Severity?" style={{ ...inp, resize: "vertical", minHeight: 90, fontFamily: "inherit" }} />
      </Field>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
        <button type="button" onClick={onCancel} style={ghostBtn}>Cancel</button>
        <button type="button" onClick={go} disabled={busy || !summary.trim() || (category === "Other" && !customCategory.trim())} style={{ ...goldBtn, opacity: busy || !summary.trim() ? 0.5 : 1 }}>
          {busy ? "Submitting…" : "Submit Request"}
        </button>
      </div>
    </section>
  );
}

function KindTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "12px 16px",
        background: active ? "rgba(240,180,41,0.15)" : "rgba(255,255,255,0.04)",
        color: active ? "#f0b429" : "#cbd5e1",
        border: active ? "1px solid rgba(240,180,41,0.35)" : "1px solid rgba(255,255,255,0.10)",
        borderRadius: 12,
        fontFamily: "inherit",
        fontSize: 14,
        fontWeight: 900,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6, marginTop: 12 }}>
      <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>{label}</span>
      {children}
    </label>
  );
}

const inp: React.CSSProperties = {
  background: "#040d1a",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "white",
  padding: "11px 13px",
  borderRadius: 10,
  fontSize: 14,
  outline: "none",
  width: "100%",
  fontFamily: "inherit",
};
const goldBtn: React.CSSProperties = {
  padding: "10px 18px",
  background: "#f0b429",
  color: "#040d1a",
  border: 0,
  borderRadius: 12,
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  padding: "10px 16px",
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#cbd5e1",
  borderRadius: 12,
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
};
function smallBtn(color: string): React.CSSProperties {
  return {
    padding: "6px 12px",
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${color}66`,
    color,
    borderRadius: 8,
    fontFamily: "inherit",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    cursor: "pointer",
  };
}
const muted: React.CSSProperties = { color: "#64748b", margin: 0, fontSize: 13 };

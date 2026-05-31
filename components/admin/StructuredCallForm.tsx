"use client";

/**
 * Structured ticker editor — replaces the free-text "Call Type / Description"
 * input on /admin/calls. Generates the canonical dispatch_nature string
 * the live ticker reads, while also persisting the unit, mutual-aid,
 * HEMS, category, and notes fields to dedicated columns so they can be
 * aggregated in the reports page.
 *
 * Behavior:
 *   - Pick one or more Millstadt units (+ Add unit button)
 *   - Mutual Aid Received → pick the assisting outside agency
 *   - Mutual Aid Given    → call counted as MA-given for reports
 *   - HEMS Requested      → force-pick handoff vs disregarded
 *   - Category dropdown populated from /api/admin/calls/categories
 *   - "+ New category" inline action POSTs a new name and re-selects
 *   - Notes — free text, surfaces in (parentheses) on the public ticker
 *   - Live preview of the generated dispatch_nature line
 *
 * The form intentionally re-uses the existing date/time/eventNumber/
 * active controls in the caller (page.tsx) so this component stays
 * focused on the structured fields.
 */

import { useEffect, useMemo, useState } from "react";

export const MILLSTADT_UNITS = ["M3925", "M3926", "M3935"] as const;
export type MillstadtUnit = (typeof MILLSTADT_UNITS)[number];

export const MUTUAL_AID_AGENCIES = [
  "Columbia EMS",
  "Monroe County EMS",
  "Dupo EMS",
  "Medstar EMS",
  "Abbott EMS",
  "Mascoutah EMS",
  "New Baden EMS",
  "O'Fallon EMS",
] as const;
export type MutualAidAgency = (typeof MUTUAL_AID_AGENCIES)[number];

const UNIT_TONES: Record<MillstadtUnit, { bg: string; fg: string; border: string }> = {
  M3925: { bg: "rgba(240,180,41,0.16)",  fg: "#f0b429", border: "rgba(240,180,41,0.40)" },
  M3926: { bg: "rgba(125,211,252,0.16)", fg: "#7dd3fc", border: "rgba(125,211,252,0.40)" },
  M3935: { bg: "rgba(167,139,250,0.16)", fg: "#c4b5fd", border: "rgba(167,139,250,0.40)" },
};

const AGENCY_TONES: Record<MutualAidAgency, { bg: string; fg: string; border: string }> = {
  "Columbia EMS":      { bg: "rgba(34,197,94,0.16)",   fg: "#86efac", border: "rgba(34,197,94,0.40)" },
  "Monroe County EMS": { bg: "rgba(56,189,248,0.14)",  fg: "#7dd3fc", border: "rgba(56,189,248,0.36)" },
  "Dupo EMS":          { bg: "rgba(244,114,182,0.14)", fg: "#f9a8d4", border: "rgba(244,114,182,0.36)" },
  "Medstar EMS":       { bg: "rgba(251,113,133,0.14)", fg: "#fda4af", border: "rgba(251,113,133,0.36)" },
  "Abbott EMS":        { bg: "rgba(192,132,252,0.14)", fg: "#d8b4fe", border: "rgba(192,132,252,0.36)" },
  "Mascoutah EMS":     { bg: "rgba(45,212,191,0.14)",  fg: "#5eead4", border: "rgba(45,212,191,0.36)" },
  "New Baden EMS":     { bg: "rgba(250,204,21,0.14)",  fg: "#fde047", border: "rgba(250,204,21,0.36)" },
  "O'Fallon EMS":      { bg: "rgba(248,113,113,0.14)", fg: "#fca5a5", border: "rgba(248,113,113,0.36)" },
};

export interface StructuredValue {
  units: MillstadtUnit[];
  category: string;
  notes: string;
  mutualAidReceived: boolean;
  mutualAidReceivedAgency: MutualAidAgency | "";
  mutualAidGiven: boolean;
  hemsRequested: boolean;
  hemsOutcome: "handoff" | "disregarded" | "";
}

export const EMPTY_STRUCTURED: StructuredValue = {
  units: [],
  category: "",
  notes: "",
  mutualAidReceived: false,
  mutualAidReceivedAgency: "",
  mutualAidGiven: false,
  hemsRequested: false,
  hemsOutcome: "",
};

/** Pure preview formatter — must stay in sync with the server-side
 * formatDispatchNature() in lib/cad/structured.ts. */
export function previewDispatchNature(v: StructuredValue): string {
  const units = Array.from(new Set(v.units));
  units.sort();
  const brackets: string[] = units.map((u) => `[${u}]`);
  if (v.mutualAidReceived && v.mutualAidReceivedAgency) {
    brackets.push(`[${v.mutualAidReceivedAgency}]`);
  }
  const prefix = brackets.length ? brackets.join(" ") + " " : "";
  const cat = v.category.trim();
  const notes = v.notes.trim();
  return `${prefix}${notes ? `${cat} (${notes})` : cat}`.trim();
}

export default function StructuredCallForm({
  value, onChange,
}: {
  value: StructuredValue;
  onChange: (next: StructuredValue) => void;
}) {
  const [categories, setCategories] = useState<string[]>([]);
  const [catFilter, setCatFilter] = useState("");
  const [adding, setAdding] = useState(false);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/calls/categories", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : { categories: [] })
      .then((d) => setCategories(Array.isArray(d.categories) ? d.categories : []))
      .catch(() => setCategories([]));
  }, []);

  const filteredCats = useMemo(() => {
    const q = catFilter.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.toLowerCase().includes(q));
  }, [categories, catFilter]);

  const preview = previewDispatchNature(value);

  function patch(next: Partial<StructuredValue>) {
    onChange({ ...value, ...next });
  }

  function addUnitSlot() {
    const remaining = (MILLSTADT_UNITS as readonly MillstadtUnit[]).find((u) => !value.units.includes(u));
    if (!remaining) return;
    patch({ units: [...value.units, remaining] });
  }
  function setUnit(idx: number, next: MillstadtUnit | "") {
    const arr = [...value.units];
    if (next === "") arr.splice(idx, 1);
    else arr[idx] = next;
    patch({ units: Array.from(new Set(arr.filter(Boolean))) });
  }
  function removeUnit(idx: number) {
    const arr = [...value.units];
    arr.splice(idx, 1);
    patch({ units: arr });
  }

  async function submitNewCat() {
    const n = newCat.trim();
    if (!n) return;
    setAdding(true); setError(null);
    try {
      const r = await fetch("/api/admin/calls/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d?.error ?? "Could not add."); return; }
      setCategories(Array.isArray(d.categories) ? d.categories : categories);
      patch({ category: n });
      setShowNewCat(false);
      setNewCat("");
    } finally { setAdding(false); }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* ── Responding units ─────────────────────────────────────────── */}
      <Section title="Responding units" hint="Pick one Millstadt unit; tap + Add unit for multi-unit responses.">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {value.units.length === 0 && (
            <UnitPicker
              taken={[]}
              onSelect={(u) => { if (u) patch({ units: [u] }); }}
            />
          )}
          {value.units.map((u, i) => (
            <span key={`${u}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <UnitChip unit={u} />
              <UnitPicker
                taken={value.units.filter((_, j) => j !== i)}
                selected={u}
                onSelect={(next) => setUnit(i, next)}
              />
              <button type="button" onClick={() => removeUnit(i)} aria-label="Remove unit" style={removeBtn}>×</button>
            </span>
          ))}
          {value.units.length > 0 && value.units.length < MILLSTADT_UNITS.length && (
            <button type="button" onClick={addUnitSlot} style={addBtn}>+ Add unit</button>
          )}
        </div>
      </Section>

      {/* ── Mutual aid ────────────────────────────────────────────────── */}
      <Section title="Mutual aid" hint="Received = outside agency came to help us. Given = a Millstadt unit went out.">
        <div style={{ display: "grid", gap: 10 }}>
          <CheckRow
            label="Mutual Aid Received"
            checked={value.mutualAidReceived}
            onChange={(c) => patch({
              mutualAidReceived: c,
              mutualAidReceivedAgency: c ? value.mutualAidReceivedAgency : "",
            })}
            help="Outside EMS rolled into Millstadt's first-due. Still our call."
          />
          {value.mutualAidReceived && (
            <div>
              <label style={fieldLabel}>Assisting agency</label>
              <select
                value={value.mutualAidReceivedAgency}
                onChange={(e) => patch({ mutualAidReceivedAgency: e.target.value as MutualAidAgency })}
                style={fieldInput}
              >
                <option value="">Choose agency…</option>
                {MUTUAL_AID_AGENCIES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              {value.mutualAidReceivedAgency && (
                <div style={{ marginTop: 6 }}>
                  <AgencyChip agency={value.mutualAidReceivedAgency as MutualAidAgency} />
                </div>
              )}
            </div>
          )}
          <CheckRow
            label="Mutual Aid Given"
            checked={value.mutualAidGiven}
            onChange={(c) => patch({ mutualAidGiven: c })}
            help="A Millstadt unit went out of our first-due to assist another agency."
          />
        </div>
      </Section>

      {/* ── HEMS ──────────────────────────────────────────────────────── */}
      <Section title="HEMS" hint="Helicopter EMS. Required follow-up choice if the helicopter was called.">
        <CheckRow
          label="HEMS Requested"
          checked={value.hemsRequested}
          onChange={(c) => patch({
            hemsRequested: c,
            hemsOutcome: c ? value.hemsOutcome : "",
          })}
          help="Tick this when ARCH / air evac was requested on scene."
        />
        {value.hemsRequested && (
          <div style={{ marginTop: 8 }}>
            <label style={fieldLabel}>Outcome (required)</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <RadioCard
                label="Patient Handoff to HEMS"
                desc="Patient transferred to the helicopter crew."
                checked={value.hemsOutcome === "handoff"}
                onSelect={() => patch({ hemsOutcome: "handoff" })}
              />
              <RadioCard
                label="HEMS Disregarded"
                desc="Helicopter cancelled / stood down before handoff."
                checked={value.hemsOutcome === "disregarded"}
                onSelect={() => patch({ hemsOutcome: "disregarded" })}
              />
            </div>
          </div>
        )}
      </Section>

      {/* ── Category ──────────────────────────────────────────────────── */}
      <Section
        title="Call category"
        hint="From your existing ticker categories. Use + New category if you need a brand-new one."
      >
        <div style={{ display: "grid", gap: 8 }}>
          <input
            placeholder="Type to filter… (e.g. Fall, Shortness)"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            style={fieldInput}
          />
          <select
            value={value.category}
            onChange={(e) => patch({ category: e.target.value })}
            style={{ ...fieldInput, minHeight: 38 }}
          >
            <option value="">Choose a category…</option>
            {filteredCats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {!showNewCat ? (
            <button type="button" onClick={() => setShowNewCat(true)} style={ghostBtn}>+ New category</button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                autoFocus
                placeholder="New category name…"
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitNewCat(); if (e.key === "Escape") setShowNewCat(false); }}
                style={{ ...fieldInput, flex: 1 }}
              />
              <button type="button" onClick={submitNewCat} disabled={adding || !newCat.trim()} style={primaryBtn}>
                {adding ? "Saving…" : "Add"}
              </button>
              <button type="button" onClick={() => { setShowNewCat(false); setNewCat(""); }} style={ghostBtn}>Cancel</button>
            </div>
          )}
          {error && <div style={errorBox}>{error}</div>}
        </div>
      </Section>

      {/* ── Notes ─────────────────────────────────────────────────────── */}
      <Section title="Notes (optional)" hint="Anything in here surfaces in (parentheses) on the public ticker — not counted in stats.">
        <textarea
          rows={2}
          value={value.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          placeholder="e.g. Arch Requested, School Bus Involved, Coughing up blood"
          style={{ ...fieldInput, resize: "vertical", fontFamily: "inherit" }}
        />
      </Section>

      {/* ── Live preview ──────────────────────────────────────────────── */}
      <Section title="Live preview" hint="This is exactly what will appear on the public ticker.">
        <div style={previewBox}>
          {preview || <span style={{ color: "#475569" }}>Pick a unit and a category to see the preview.</span>}
        </div>
      </Section>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <div style={{ marginBottom: 8 }}>
        <div style={{ color: "#f0b429", fontSize: 10, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>{title}</div>
        {hint && <div style={{ color: "#64748b", fontSize: 11.5, marginTop: 2 }}>{hint}</div>}
      </div>
      {children}
    </section>
  );
}

function UnitChip({ unit }: { unit: MillstadtUnit }) {
  const t = UNIT_TONES[unit];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "5px 10px", borderRadius: 8,
      background: t.bg, color: t.fg, border: `1px solid ${t.border}`,
      fontWeight: 900, fontSize: 12, letterSpacing: "0.08em",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
    }}>{unit}</span>
  );
}

function AgencyChip({ agency }: { agency: MutualAidAgency }) {
  const t = AGENCY_TONES[agency];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "4px 9px", borderRadius: 8,
      background: t.bg, color: t.fg, border: `1px solid ${t.border}`,
      fontWeight: 800, fontSize: 11.5, letterSpacing: "0.04em",
    }}>{agency}</span>
  );
}

function UnitPicker({
  taken, selected, onSelect,
}: {
  taken: string[];
  selected?: MillstadtUnit;
  onSelect: (u: MillstadtUnit | "") => void;
}) {
  const options = (MILLSTADT_UNITS as readonly MillstadtUnit[]).filter((u) => !taken.includes(u) || u === selected);
  return (
    <select
      value={selected ?? ""}
      onChange={(e) => onSelect(e.target.value as MillstadtUnit | "")}
      style={{ ...fieldInput, width: 130, padding: "7px 10px", fontSize: 12 }}
    >
      <option value="">{selected ? "Change…" : "Pick unit…"}</option>
      {options.map((u) => <option key={u} value={u}>{u}</option>)}
    </select>
  );
}

function CheckRow({
  label, checked, onChange, help,
}: {
  label: string; checked: boolean; onChange: (next: boolean) => void; help?: string;
}) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 12px", borderRadius: 10, background: checked ? "rgba(240,180,41,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${checked ? "rgba(240,180,41,0.30)" : "rgba(255,255,255,0.07)"}`, cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 3, accentColor: "#f0b429" }} />
      <span>
        <span style={{ display: "block", color: "white", fontSize: 13, fontWeight: 800 }}>{label}</span>
        {help && <span style={{ display: "block", color: "#94a3b8", fontSize: 11.5, marginTop: 2 }}>{help}</span>}
      </span>
    </label>
  );
}

function RadioCard({
  label, desc, checked, onSelect,
}: { label: string; desc: string; checked: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} style={{
      flex: 1, minWidth: 200, textAlign: "left",
      padding: "9px 12px", borderRadius: 10,
      background: checked ? "rgba(240,180,41,0.10)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${checked ? "rgba(240,180,41,0.40)" : "rgba(255,255,255,0.08)"}`,
      color: checked ? "white" : "#cbd5e1",
      cursor: "pointer", fontFamily: "inherit",
    }}>
      <div style={{ fontWeight: 800, fontSize: 13, color: checked ? "#f0b429" : "white" }}>{label}</div>
      <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>{desc}</div>
    </button>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const fieldLabel: React.CSSProperties = {
  display: "block", color: "#94a3b8", fontSize: 10.5, fontWeight: 800,
  letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 5,
};
const fieldInput: React.CSSProperties = {
  width: "100%",
  background: "#040d1a", border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 10, padding: "8px 11px", color: "white", fontSize: 13,
  fontFamily: "inherit",
};
const primaryBtn: React.CSSProperties = {
  background: "#f0b429", color: "#040d1a", border: 0,
  padding: "8px 14px", borderRadius: 10, fontWeight: 900, fontSize: 12,
  letterSpacing: "0.10em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit",
};
const ghostBtn: React.CSSProperties = {
  background: "transparent", color: "#cbd5e1",
  border: "1px solid rgba(255,255,255,0.12)",
  padding: "8px 14px", borderRadius: 10, fontWeight: 800, fontSize: 12,
  letterSpacing: "0.10em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit",
};
const addBtn: React.CSSProperties = {
  ...ghostBtn,
  borderStyle: "dashed",
  borderColor: "rgba(240,180,41,0.40)",
  color: "#f0b429",
  padding: "6px 10px",
  fontSize: 11,
};
const removeBtn: React.CSSProperties = {
  background: "transparent", color: "#94a3b8", border: 0,
  fontSize: 18, lineHeight: 1, cursor: "pointer", padding: "0 4px",
};
const errorBox: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 10,
  background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)",
  color: "#fecaca", fontSize: 12.5,
};
const previewBox: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
  background: "#040d1a", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10, padding: "12px 14px",
  color: "white", fontSize: 13.5, fontWeight: 700,
  whiteSpace: "pre-wrap", minHeight: 42,
};

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

/** Kept in sync with STANDBY_CATEGORY in lib/cad/structured.ts. Declared
 * locally so this client component never imports the server-only module. */
export const STANDBY_CATEGORY = "Standby";

/** Kept in sync with lib/cad/structured.ts. */
export type Classification = "medical" | "trauma" | "uncategorized" | "cancelled";
const CLASSIFICATIONS: { value: Classification; label: string; tone: string }[] = [
  { value: "medical",       label: "Medical",       tone: "#34d399" },
  { value: "trauma",        label: "Trauma",        tone: "#fca5a5" },
  { value: "uncategorized", label: "Uncategorized", tone: "#94a3b8" },
  { value: "cancelled",     label: "Cancelled",     tone: "#fbbf24" },
];
const CARDIAC_CATEGORY = "Cardiac Arrest";

/** Kept in sync with ASSIST_CATEGORY / ASSIST_TARGETS in lib/cad/structured.ts. */
export const ASSIST_CATEGORY = "Assist";
const ASSIST_TARGETS = ["Police Department", "Fire Department", "Citizen Assist"] as const;
function formatAssist(prefix: string, who: string): string {
  const w = who.trim();
  const label = !w ? "Assist" : (w.toLowerCase() === "citizen assist" ? "Citizen Assist" : `Assist ${w}`);
  return `${prefix}${label}`.trim();
}

/** Kept in sync with CATEGORY_ALIASES in lib/cad/structured.ts. */
const CATEGORY_ALIASES: Record<string, string> = {
  "psych eval": "Psychiatric Emergency",
  "psych evaluation": "Psychiatric Emergency",
  "psychiatric eval": "Psychiatric Emergency",
  "psychiatric evaluation": "Psychiatric Emergency",
  "behavioral emergency": "Psychiatric Emergency",
  "pregnancy complications": "Obstetrical Emergency",
  "pregnancy complication": "Obstetrical Emergency",
  "shortness of breath": "Difficulty Breathing",
  "sob": "Difficulty Breathing",
};
function resolveCategoryAlias(name: string): string {
  const cleaned = name.replace(/\s+/g, " ").trim();
  return CATEGORY_ALIASES[cleaned.toLowerCase()] ?? cleaned;
}

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
  mutualAidGivenAgency: MutualAidAgency | "";
  hemsRequested: boolean;
  hemsOutcome: "handoff" | "disregarded" | "";
  classification: Classification | "";
  cardiacAge: "adult" | "pediatric" | "";
}

export const EMPTY_STRUCTURED: StructuredValue = {
  units: [],
  category: "",
  notes: "",
  mutualAidReceived: false,
  mutualAidReceivedAgency: "",
  mutualAidGiven: false,
  mutualAidGivenAgency: "",
  hemsRequested: false,
  hemsOutcome: "",
  classification: "",
  cardiacAge: "",
};

/** Pure preview formatter — must stay in sync with the server-side
 * formatDispatchNature() in lib/cad/structured.ts. */
export function previewDispatchNature(v: StructuredValue): string {
  const cat = v.category.trim();
  const notes = v.notes.trim();

  // Mutual aid RECEIVED → "[Mutual Aid] <Agency>: <Category>" (no unit).
  if (v.mutualAidReceived && v.mutualAidReceivedAgency) {
    const base = `[Mutual Aid] ${v.mutualAidReceivedAgency}: ${cat}`.trim();
    return notes ? `${base} (${notes})` : base;
  }

  const units = Array.from(new Set(v.units));
  units.sort();
  const brackets: string[] = units.map((u) => `[${u}]`);
  const prefix = brackets.length ? brackets.join(" ") + " " : "";
  // Standby renders as a consistent "Standby at <location>" line (the
  // location lives in notes). Mirror of formatDispatchNature().
  if (cat.toLowerCase() === STANDBY_CATEGORY.toLowerCase()) {
    return `${prefix}${notes ? `Standby at ${notes}` : "Standby"}`.trim();
  }
  if (cat.toLowerCase() === ASSIST_CATEGORY.toLowerCase()) {
    return formatAssist(prefix, notes);
  }
  // Mirror formatDispatchNature(): notes + an automatic "Mutual Aid Given"
  // tag. Received is shown via the agency bracket above, not here.
  const parenParts: string[] = [];
  if (notes) parenParts.push(notes);
  if (v.mutualAidGiven) {
    parenParts.push(v.mutualAidGivenAgency ? `Mutual Aid Given to ${v.mutualAidGivenAgency}` : "Mutual Aid Given");
  }
  const body = parenParts.length ? `${cat} (${parenParts.join("; ")})` : cat;
  return `${prefix}${body}`.trim();
}

// ── Fuzzy category matching (for "similar existing" suggestions) ──────
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[n];
}

/** 0..1 similarity — combines edit distance, containment, and shared
 * words so typos ("Sezure"), partials ("Chest"), and reorders all match. */
export function catSimilarity(a: string, b: string): number {
  const x = a.toLowerCase().replace(/\s+/g, " ").trim();
  const y = b.toLowerCase().replace(/\s+/g, " ").trim();
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.92;
  const ratio = 1 - levenshtein(x, y) / Math.max(x.length, y.length);
  const tx = new Set(x.split(/[^a-z0-9]+/).filter(Boolean));
  const ty = new Set(y.split(/[^a-z0-9]+/).filter(Boolean));
  let shared = 0;
  for (const t of tx) if (ty.has(t)) shared++;
  const overlap = shared / Math.max(1, Math.min(tx.size, ty.size));
  return Math.max(ratio, overlap >= 1 ? 0.85 : overlap * 0.8);
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
  // Manage-categories panel state
  const [managing, setManaging] = useState(false);
  const [busyCat, setBusyCat] = useState<string | null>(null);
  const [renameOf, setRenameOf] = useState<string | null>(null);
  const [renameTo, setRenameTo] = useState("");

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

  // Count case/whitespace-duplicate categories so we can nudge the user
  // to clean them up (e.g. "Fire-1st" + "Fire-1st ").
  const dupCount = useMemo(() => {
    const seen = new Map<string, number>();
    for (const c of categories) {
      const key = c.replace(/\s+/g, " ").trim().toLowerCase();
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    let extra = 0;
    for (const n of seen.values()) if (n > 1) extra += n - 1;
    return extra;
  }, [categories]);

  // If what's typed is an aliased name (e.g. "psych eval"), the canonical
  // category we steer the user to instead.
  const aliasHint = useMemo(() => {
    const raw = newCat.trim();
    if (!raw) return null;
    const canon = resolveCategoryAlias(raw);
    return canon.toLowerCase() !== raw.toLowerCase() ? canon : null;
  }, [newCat]);

  // Existing categories that look similar to what's being typed as a new
  // one — surfaced so the user reuses one instead of creating a near-dup.
  const catSuggestions = useMemo(() => {
    const q = newCat.trim();
    if (q.length < 2) return [];
    const ql = q.toLowerCase();
    return categories
      .filter((c) => c.toLowerCase() !== ql)
      .map((c) => ({ c, score: catSimilarity(q, c) }))
      .filter((x) => x.score >= 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.c);
  }, [newCat, categories]);

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
    const n = resolveCategoryAlias(newCat);
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

  // ── Manage categories (rename / remove / clean duplicates) ──────────
  // These only edit the dropdown master list — they never change the
  // text on any existing call, so the live ticker is unaffected.
  async function catRequest(method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>) {
    setError(null);
    const r = await fetch("/api/admin/calls/categories", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setError(d?.error ?? "Could not update categories."); return null; }
    if (Array.isArray(d.categories)) setCategories(d.categories);
    return d;
  }

  async function removeCat(name: string) {
    setBusyCat(name);
    try { await catRequest("DELETE", { name }); }
    finally { setBusyCat(null); }
  }

  async function saveRename(from: string) {
    const to = renameTo.trim();
    if (!to || to === from) { setRenameOf(null); return; }
    setBusyCat(from);
    try {
      const d = await catRequest("PATCH", { from, to });
      if (d) {
        // If the renamed category was the one selected, keep selection in sync.
        if (value.category === from) patch({ category: to });
        setRenameOf(null);
        setRenameTo("");
      }
    } finally { setBusyCat(null); }
  }

  async function dedupeCats() {
    setBusyCat("__dedupe__");
    try { await catRequest("POST", { action: "dedupe" }); }
    finally { setBusyCat(null); }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* ── Classification (required) ─────────────────────────────────── */}
      <Section title="Classification — required" hint="Medical and Trauma drive the reports. Uncategorized (fire, standby, assist) and Cancelled group together.">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {CLASSIFICATIONS.map((c) => {
            const on = value.classification === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => patch({ classification: c.value })}
                style={{
                  flex: "1 1 120px", minWidth: 110, padding: "10px 12px", borderRadius: 10,
                  cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: on ? 700 : 600,
                  color: on ? "#06101f" : c.tone,
                  background: on ? c.tone : "rgba(255,255,255,0.03)",
                  border: `1px solid ${on ? c.tone : "rgba(255,255,255,0.14)"}`,
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </Section>

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
            onChange={(c) => patch({
              mutualAidGiven: c,
              mutualAidGivenAgency: c ? value.mutualAidGivenAgency : "",
            })}
            help="A Millstadt unit went out of our first-due to assist another agency."
          />
          {value.mutualAidGiven && (
            <div>
              <label style={fieldLabel}>Agency assisted <span style={{ color: "#64748b", fontWeight: 600, letterSpacing: 0, textTransform: "none" }}>(optional)</span></label>
              <select
                value={value.mutualAidGivenAgency}
                onChange={(e) => patch({ mutualAidGivenAgency: e.target.value as MutualAidAgency })}
                style={fieldInput}
              >
                <option value="">Choose agency…</option>
                {MUTUAL_AID_AGENCIES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              {value.mutualAidGivenAgency && (
                <div style={{ marginTop: 6 }}>
                  <AgencyChip agency={value.mutualAidGivenAgency as MutualAidAgency} />
                </div>
              )}
            </div>
          )}
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

          {value.category.toLowerCase() === STANDBY_CATEGORY.toLowerCase() && (
            <div style={standbyBox}>
              <label style={fieldLabel}>Where are you standing by?</label>
              <input
                autoFocus
                value={value.notes}
                onChange={(e) => patch({ notes: e.target.value })}
                placeholder="e.g. BET, parade route, fireworks display"
                style={fieldInput}
              />
              <div style={{ color: "#94a3b8", fontSize: 11.5, marginTop: 6 }}>
                Shows on the ticker as{" "}
                <span style={{ color: "#f0b429", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace" }}>
                  Standby at {value.notes.trim() || "…"}
                </span>
              </div>
            </div>
          )}

          {value.category.toLowerCase() === ASSIST_CATEGORY.toLowerCase() && (
            <div style={standbyBox}>
              <label style={fieldLabel}>Who did you assist?</label>
              <select
                value={value.notes}
                onChange={(e) => patch({ notes: e.target.value })}
                style={fieldInput}
              >
                <option value="">Choose…</option>
                {ASSIST_TARGETS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <div style={{ color: "#94a3b8", fontSize: 11.5, marginTop: 6 }}>
                Shows on the ticker as{" "}
                <span style={{ color: "#f0b429", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace" }}>
                  {formatAssist("", value.notes) || "Assist"}
                </span>
              </div>
            </div>
          )}

          {value.category.toLowerCase() === CARDIAC_CATEGORY.toLowerCase() && (
            <div style={standbyBox}>
              <label style={fieldLabel}>
                Patient age band{" "}
                <span style={{ color: "#64748b", fontWeight: 600, letterSpacing: 0, textTransform: "none" }}>(reporting only — never shown on the ticker)</span>
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["adult", "pediatric"] as const).map((a) => {
                  const on = value.cardiacAge === a;
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => patch({ cardiacAge: a })}
                      style={{
                        flex: 1, padding: "9px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                        fontSize: 13, fontWeight: on ? 700 : 600,
                        color: on ? "#06101f" : "#cbd5e1",
                        background: on ? "#7dd3fc" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${on ? "#7dd3fc" : "rgba(255,255,255,0.14)"}`,
                      }}
                    >
                      {a === "adult" ? "Adult" : "Pediatric"}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!showNewCat ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => setShowNewCat(true)} style={ghostBtn}>+ New category</button>
              <button type="button" onClick={() => setManaging((v) => !v)} style={ghostBtn}>
                {managing ? "Done managing" : "Manage list"}
              </button>
            </div>
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

          {showNewCat && aliasHint && (
            <div style={aliasBox}>
              <span style={{ color: "#fde68a", fontSize: 12.5 }}>
                Heads up — use <strong style={{ color: "white" }}>{aliasHint}</strong> for this. You&apos;ve been told to use this category going forward.
              </span>
              <button
                type="button"
                onClick={() => { patch({ category: aliasHint }); setShowNewCat(false); setNewCat(""); setError(null); }}
                style={{ ...primaryBtn, padding: "6px 12px", marginTop: 8 }}
              >
                Use {aliasHint}
              </button>
            </div>
          )}

          {showNewCat && !aliasHint && catSuggestions.length > 0 && (
            <div style={suggestBox}>
              <div style={{ color: "#fbbf24", fontSize: 11.5, marginBottom: 6 }}>
                Similar categories already exist — tap one to use it instead of adding a duplicate:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {catSuggestions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { patch({ category: c }); setShowNewCat(false); setNewCat(""); setError(null); }}
                    style={suggestChip}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {managing && (
            <div style={manageBox}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: "#94a3b8", fontSize: 11.5 }}>
                  {categories.length} categor{categories.length === 1 ? "y" : "ies"}
                  {dupCount > 0 && <span style={{ color: "#fbbf24" }}> · {dupCount} duplicate{dupCount === 1 ? "" : "s"} found</span>}
                </span>
                {dupCount > 0 && (
                  <button
                    type="button"
                    onClick={dedupeCats}
                    disabled={busyCat === "__dedupe__"}
                    style={{ ...primaryBtn, padding: "6px 12px" }}
                  >
                    {busyCat === "__dedupe__" ? "Cleaning…" : "Clean up duplicates"}
                  </button>
                )}
              </div>
              <div style={{ display: "grid", gap: 6, marginTop: 10, maxHeight: 260, overflowY: "auto" }}>
                {categories.length === 0 && (
                  <span style={{ color: "#475569", fontSize: 12.5 }}>No categories yet.</span>
                )}
                {categories.map((c) => (
                  <div key={c} style={manageRow}>
                    {renameOf === c ? (
                      <>
                        <input
                          autoFocus
                          value={renameTo}
                          onChange={(e) => setRenameTo(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveRename(c); if (e.key === "Escape") { setRenameOf(null); setRenameTo(""); } }}
                          style={{ ...fieldInput, flex: 1, padding: "6px 9px" }}
                        />
                        <button type="button" onClick={() => saveRename(c)} disabled={busyCat === c} style={{ ...primaryBtn, padding: "6px 12px" }}>Save</button>
                        <button type="button" onClick={() => { setRenameOf(null); setRenameTo(""); }} style={{ ...ghostBtn, padding: "6px 10px" }}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <span style={{ flex: 1, color: "white", fontSize: 13, wordBreak: "break-word" }}>{c}</span>
                        <button type="button" onClick={() => { setRenameOf(c); setRenameTo(c.replace(/\s+/g, " ").trim()); }} style={{ ...ghostBtn, padding: "6px 10px" }}>Rename</button>
                        <button type="button" onClick={() => removeCat(c)} disabled={busyCat === c} style={{ ...ghostBtn, padding: "6px 10px", color: "#fca5a5", borderColor: "rgba(248,113,113,0.30)" }}>
                          {busyCat === c ? "…" : "Remove"}
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <p style={{ color: "#64748b", fontSize: 11, marginTop: 8 }}>
                Editing this list only changes the dropdown choices. It never alters what any saved call already shows on the ticker.
              </p>
            </div>
          )}
          {error && <div style={errorBox}>{error}</div>}
        </div>
      </Section>

      {/* ── Notes ─────────────────────────────────────────────────────────
          Hidden for Standby — that category repurposes `notes` as the
          standby location via the field under the category dropdown. */}
      {value.category.toLowerCase() !== STANDBY_CATEGORY.toLowerCase()
        && value.category.toLowerCase() !== ASSIST_CATEGORY.toLowerCase() && (
        <Section title="Notes (optional)" hint="Anything in here surfaces in (parentheses) on the public ticker — not counted in stats.">
          <textarea
            rows={2}
            value={value.notes}
            onChange={(e) => patch({ notes: e.target.value })}
            placeholder="e.g. Arch Requested, School Bus Involved, Coughing up blood"
            style={{ ...fieldInput, resize: "vertical", fontFamily: "inherit" }}
          />
        </Section>
      )}

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
        <div style={{ color: "#cbd5e1", fontSize: 12.5, fontWeight: 600, letterSpacing: "-0.005em" }}>{title}</div>
        {hint && <div style={{ color: "#7c899e", fontSize: 11.5, marginTop: 2, lineHeight: 1.45 }}>{hint}</div>}
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
      fontWeight: 600, fontSize: 12, letterSpacing: "0.02em",
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
      fontWeight: 600, fontSize: 11.5, letterSpacing: "0.01em",
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
        <span style={{ display: "block", color: "white", fontSize: 13, fontWeight: 600 }}>{label}</span>
        {help && <span style={{ display: "block", color: "#94a3b8", fontSize: 11.5, marginTop: 2, lineHeight: 1.45 }}>{help}</span>}
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
      <div style={{ fontWeight: 600, fontSize: 13, color: checked ? "#f0b429" : "white" }}>{label}</div>
      <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>{desc}</div>
    </button>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const fieldLabel: React.CSSProperties = {
  display: "block", color: "#8b98ac", fontSize: 11, fontWeight: 600,
  letterSpacing: "0.01em", marginBottom: 5,
};
const fieldInput: React.CSSProperties = {
  width: "100%",
  background: "#0a1422", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10, padding: "9px 11px", color: "white", fontSize: 13,
  fontFamily: "inherit",
};
const primaryBtn: React.CSSProperties = {
  background: "#f0b429", color: "#06101f", border: 0,
  padding: "9px 14px", borderRadius: 10, fontWeight: 600, fontSize: 13,
  letterSpacing: 0, cursor: "pointer", fontFamily: "inherit",
};
const ghostBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.02)", color: "#cbd5e1",
  border: "1px solid rgba(255,255,255,0.14)",
  padding: "9px 14px", borderRadius: 10, fontWeight: 600, fontSize: 13,
  letterSpacing: 0, cursor: "pointer", fontFamily: "inherit",
};
const addBtn: React.CSSProperties = {
  ...ghostBtn,
  borderStyle: "dashed",
  borderColor: "rgba(240,180,41,0.35)",
  color: "#f0b429",
  padding: "8px 12px",
  fontSize: 12.5,
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
const manageBox: React.CSSProperties = {
  background: "rgba(2,9,18,0.55)", border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 12, padding: 12,
};
const manageRow: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
  padding: "6px 8px", borderRadius: 9,
  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
};
const standbyBox: React.CSSProperties = {
  background: "rgba(240,180,41,0.06)", border: "1px solid rgba(240,180,41,0.30)",
  borderRadius: 12, padding: 12,
};
const suggestBox: React.CSSProperties = {
  background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.28)",
  borderRadius: 12, padding: 12,
};
const aliasBox: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "flex-start",
  background: "rgba(240,180,41,0.10)", border: "1px solid rgba(240,180,41,0.40)",
  borderRadius: 12, padding: 12,
};
const suggestChip: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)", color: "white",
  border: "1px solid rgba(255,255,255,0.16)", borderRadius: 999,
  padding: "6px 11px", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
};
const previewBox: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
  background: "#040d1a", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10, padding: "12px 14px",
  color: "white", fontSize: 13.5, fontWeight: 700,
  whiteSpace: "pre-wrap", minHeight: 42,
};

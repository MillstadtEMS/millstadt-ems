"use client";

/**
 * Admin · Volunteer Hours
 *
 * One row per active volunteer; one column per month of the selected
 * year. Each cell is an inline-edit number input that PUTs to
 * /api/admin/volunteers/hours on blur. Totals are computed client-side
 * so edits feel instant.
 *
 * Mobile: collapses to a card-per-volunteer with months stacked. Year
 * selector + Add Volunteer button stay at the top.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Volunteer {
  id: string;
  name: string;
  active: boolean;
  notes: string | null;
  createdAt: string;
}
interface HoursRow {
  volunteerId: string;
  year: number;
  month: number;
  hours: number;
  notes: string | null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function VolunteerHoursPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ isAdmin: boolean } | null>(null);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [hours, setHours] = useState<HoursRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingNew, setSavingNew] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

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
    const [vRes, hRes] = await Promise.all([
      fetch("/api/admin/volunteers", { cache: "no-store" }),
      fetch(`/api/admin/volunteers/hours?year=${year}`, { cache: "no-store" }),
    ]);
    if (vRes.ok) {
      const d = await vRes.json();
      setVolunteers(Array.isArray(d.volunteers) ? d.volunteers : []);
    }
    if (hRes.ok) {
      const d = await hRes.json();
      setHours(Array.isArray(d.hours) ? d.hours : []);
    }
    setLoading(false);
  }, [year]);

  useEffect(() => { if (me) load(); }, [me, load]);

  const hoursByCell = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of hours) m.set(`${h.volunteerId}:${h.month}`, h.hours);
    return m;
  }, [hours]);

  const totalsByVolunteer = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of hours) m.set(h.volunteerId, (m.get(h.volunteerId) ?? 0) + Number(h.hours || 0));
    return m;
  }, [hours]);

  const totalsByMonth = useMemo(() => {
    const arr = new Array(12).fill(0);
    for (const h of hours) arr[h.month - 1] += Number(h.hours || 0);
    return arr;
  }, [hours]);

  const grandTotal = useMemo(
    () => Array.from(totalsByVolunteer.values()).reduce((a, b) => a + b, 0),
    [totalsByVolunteer],
  );

  const visibleVolunteers = useMemo(
    () => volunteers.filter((v) => showInactive ? true : v.active),
    [volunteers, showInactive],
  );

  async function saveCell(volunteerId: string, month: number, value: string) {
    const num = value.trim() === "" ? 0 : parseFloat(value);
    if (!Number.isFinite(num) || num < 0) return;
    const r = await fetch("/api/admin/volunteers/hours", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ volunteerId, year, month, hours: num }),
    });
    if (r.ok) {
      setHours((arr) => {
        const next = arr.filter((h) => !(h.volunteerId === volunteerId && h.month === month && h.year === year));
        next.push({ volunteerId, year, month, hours: num, notes: null });
        return next;
      });
    }
  }

  async function addVolunteer() {
    const name = newName.trim();
    if (!name) { setAddError("Name required."); return; }
    setSavingNew(true); setAddError(null);
    try {
      const r = await fetch("/api/admin/volunteers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setAddError(d.error ?? "Could not add."); return; }
      setNewName("");
      setShowAdd(false);
      load();
    } finally { setSavingNew(false); }
  }

  async function renameVolunteer(v: Volunteer) {
    const next = window.prompt("Rename volunteer:", v.name);
    if (!next || !next.trim() || next.trim() === v.name) return;
    await fetch(`/api/admin/volunteers/${v.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: next.trim() }),
    });
    load();
  }

  async function toggleActive(v: Volunteer) {
    await fetch(`/api/admin/volunteers/${v.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !v.active }),
    });
    load();
  }

  async function removeVolunteer(v: Volunteer) {
    if (!window.confirm(`Delete ${v.name} and all their hours? This cannot be undone.`)) return;
    await fetch(`/api/admin/volunteers/${v.id}`, { method: "DELETE" });
    load();
  }

  if (!me) return <p style={{ color: "#94a3b8", padding: 22 }}>Loading…</p>;

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  return (
    <div>
      <header style={{ marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ color: "#34d399", fontSize: 11, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Admin · Volunteers
          </div>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.85rem", fontWeight: 900, letterSpacing: "-0.015em" }}>
            Volunteer hours
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "0.92rem", marginTop: 4 }}>
            Track monthly volunteer hours. Click any cell to edit; changes save on blur.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            style={{ ...inputStyle, padding: "9px 14px", fontWeight: 800 }}
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => setShowAdd(true)} style={primaryBtn}>+ Add volunteer</button>
        </div>
      </header>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <Tile label="Volunteers" value={visibleVolunteers.length.toString()} accent="#34d399" />
        <Tile label={`Total hours · ${year}`} value={grandTotal.toFixed(1)} accent="#f0b429" />
        <Tile label="Avg / volunteer" value={visibleVolunteers.length ? (grandTotal / visibleVolunteers.length).toFixed(1) : "0"} accent="#7dd3fc" />
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", color: "#cbd5e1", fontSize: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} style={{ accentColor: "#f0b429" }} />
          Show inactive
        </label>
      </div>

      {loading ? (
        <p style={{ color: "#94a3b8" }}>Loading…</p>
      ) : visibleVolunteers.length === 0 ? (
        <div style={emptyCard}>
          <h2 style={{ color: "white", fontSize: 18, fontWeight: 900, margin: 0 }}>No volunteers yet</h2>
          <p style={{ color: "#94a3b8", marginTop: 6 }}>Add your first volunteer to start logging monthly hours.</p>
        </div>
      ) : (
        <>
          {/* Desktop / wide: matrix table */}
          <div style={{ overflowX: "auto", display: "block" }} className="hidden md:block">
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: "left", minWidth: 180 }}>Volunteer</th>
                  {MONTHS.map((m, i) => (
                    <th key={m} style={thStyle}>{m}</th>
                  ))}
                  <th style={{ ...thStyle, color: "#f0b429" }}>Total</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleVolunteers.map((v) => (
                  <tr key={v.id} style={{ opacity: v.active ? 1 : 0.5 }}>
                    <td style={{ ...tdStyle, textAlign: "left", fontWeight: 800, color: "white" }}>
                      {v.name}
                      {!v.active && <span style={{ marginLeft: 6, color: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em" }}>· inactive</span>}
                    </td>
                    {MONTHS.map((_, i) => {
                      const cellKey = `${v.id}:${i + 1}`;
                      const current = hoursByCell.get(cellKey) ?? 0;
                      return (
                        <td key={i} style={tdStyle}>
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step={0.25}
                            defaultValue={current === 0 ? "" : String(current)}
                            onBlur={(e) => { if (e.target.value !== (current === 0 ? "" : String(current))) saveCell(v.id, i + 1, e.target.value); }}
                            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                            style={cellInput}
                          />
                        </td>
                      );
                    })}
                    <td style={{ ...tdStyle, color: "#f0b429", fontWeight: 900 }}>{(totalsByVolunteer.get(v.id) ?? 0).toFixed(1)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                        <button onClick={() => renameVolunteer(v)} style={miniBtn}>Edit</button>
                        <button onClick={() => toggleActive(v)} style={miniBtn}>{v.active ? "Hide" : "Show"}</button>
                        <button onClick={() => removeVolunteer(v)} style={dangerMini}>×</button>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid rgba(255,255,255,0.10)" }}>
                  <td style={{ ...tdStyle, textAlign: "left", color: "#94a3b8", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", fontSize: 11 }}>Monthly total</td>
                  {totalsByMonth.map((t, i) => (
                    <td key={i} style={{ ...tdStyle, color: "#cbd5e1", fontWeight: 800 }}>{t === 0 ? "—" : t.toFixed(1)}</td>
                  ))}
                  <td style={{ ...tdStyle, color: "#f0b429", fontWeight: 900, fontSize: 15 }}>{grandTotal.toFixed(1)}</td>
                  <td style={tdStyle}></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile: card per volunteer */}
          <div style={{ display: "grid", gap: 12 }} className="md:hidden">
            {visibleVolunteers.map((v) => (
              <div key={v.id} style={{ ...mobileCard, opacity: v.active ? 1 : 0.55 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: "white", fontWeight: 900, fontSize: 16 }}>{v.name}</div>
                    {!v.active && <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>Inactive</div>}
                  </div>
                  <div style={{ color: "#f0b429", fontWeight: 900, fontSize: 18, fontVariantNumeric: "tabular-nums" }}>
                    {(totalsByVolunteer.get(v.id) ?? 0).toFixed(1)} hrs
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {MONTHS.map((m, i) => {
                    const cellKey = `${v.id}:${i + 1}`;
                    const current = hoursByCell.get(cellKey) ?? 0;
                    return (
                      <label key={m} style={{ display: "block" }}>
                        <span style={{ display: "block", color: "#94a3b8", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 3 }}>{m}</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={0.25}
                          defaultValue={current === 0 ? "" : String(current)}
                          onBlur={(e) => { if (e.target.value !== (current === 0 ? "" : String(current))) saveCell(v.id, i + 1, e.target.value); }}
                          style={{ ...cellInput, width: "100%", padding: "8px 10px", textAlign: "left" as const, fontSize: 14 }}
                        />
                      </label>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  <button onClick={() => renameVolunteer(v)} style={miniBtn}>Rename</button>
                  <button onClick={() => toggleActive(v)} style={miniBtn}>{v.active ? "Mark inactive" : "Reactivate"}</button>
                  <button onClick={() => removeVolunteer(v)} style={dangerMini}>Delete</button>
                </div>
              </div>
            ))}
            <div style={{ ...mobileCard, background: "rgba(7,20,40,0.4)" }}>
              <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>Year total</div>
              <div style={{ color: "#f0b429", fontWeight: 900, fontSize: 24, marginTop: 4 }}>{grandTotal.toFixed(1)} hrs</div>
            </div>
          </div>
        </>
      )}

      {showAdd && (
        <div role="dialog" aria-modal="true" style={modalBackdrop} onClick={() => setShowAdd(false)}>
          <div style={modalSheet} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ color: "white", fontSize: 18, fontWeight: 900, margin: 0 }}>Add volunteer</h2>
              <button onClick={() => setShowAdd(false)} aria-label="Close" style={closeBtn}>×</button>
            </div>
            <label style={{ display: "block", marginBottom: 10 }}>
              <span style={{ display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>Full name *</span>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Jane Doe"
                autoFocus
                style={inputStyle}
                onKeyDown={(e) => { if (e.key === "Enter") addVolunteer(); }}
              />
            </label>
            {addError && <p style={{ color: "#fca5a5", fontSize: 12 }}>{addError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14, flexWrap: "wrap" }}>
              <button onClick={() => setShowAdd(false)} style={ghostBtn}>Cancel</button>
              <button onClick={addVolunteer} disabled={savingNew} style={primaryBtn}>{savingNew ? "Saving…" : "Add"}</button>
            </div>
          </div>
        </div>
      )}

      <p style={{ color: "#475569", fontSize: 11, marginTop: 18 }}>
        <Link href="/admin" style={{ color: "#94a3b8", textDecoration: "none" }}>← Back to admin</Link>
      </p>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "10px 14px", minWidth: 140 }}>
      <div style={{ color: accent, fontSize: 10, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: "white", fontSize: 22, fontWeight: 900, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", background: "#040d1a", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: "10px 12px", color: "white", fontSize: 14, fontFamily: "inherit",
};
const primaryBtn: React.CSSProperties = {
  background: "#f0b429", color: "#040d1a", border: 0, padding: "9px 16px", borderRadius: 10, fontWeight: 900, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit",
};
const ghostBtn: React.CSSProperties = {
  background: "transparent", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.12)", padding: "9px 16px", borderRadius: 10, fontWeight: 800, fontSize: 12, letterSpacing: "0.10em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit",
};
const miniBtn: React.CSSProperties = {
  background: "transparent", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.10)", padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.08em", textTransform: "uppercase",
};
const dangerMini: React.CSSProperties = {
  background: "transparent", color: "#fca5a5", border: "1px solid rgba(248,113,113,0.30)", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
};
const emptyCard: React.CSSProperties = {
  background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "32px 24px", textAlign: "center" as const,
};
const tableStyle: React.CSSProperties = {
  width: "100%", borderCollapse: "separate", borderSpacing: 0, background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, overflow: "hidden",
};
const thStyle: React.CSSProperties = {
  padding: "12px 8px", background: "#0a1c33", color: "#94a3b8", fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", textAlign: "center" as const, borderBottom: "1px solid rgba(255,255,255,0.08)",
};
const tdStyle: React.CSSProperties = {
  padding: "8px", borderBottom: "1px solid rgba(255,255,255,0.04)", textAlign: "center" as const, color: "#cbd5e1", fontSize: 13, fontVariantNumeric: "tabular-nums",
};
const cellInput: React.CSSProperties = {
  width: 56, background: "transparent", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, padding: "5px 6px", color: "white", fontSize: 13, fontFamily: "inherit", textAlign: "center" as const, fontVariantNumeric: "tabular-nums",
};
const mobileCard: React.CSSProperties = {
  background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 16px",
};
const modalBackdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(2,9,18,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100,
};
const modalSheet: React.CSSProperties = {
  width: "100%", maxWidth: 440, background: "#071428", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 22,
};
const closeBtn: React.CSSProperties = {
  background: "transparent", border: 0, color: "#94a3b8", fontSize: 24, lineHeight: 1, cursor: "pointer", padding: "0 4px",
};

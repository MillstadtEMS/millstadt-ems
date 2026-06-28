"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StructuredCallForm, {
  EMPTY_STRUCTURED,
  previewDispatchNature,
  type StructuredValue,
} from "@/components/admin/StructuredCallForm";

interface Call {
  id: string; dispatchDate: string; dispatchTime: string;
  dispatchNature: string; completedAt: string | null;
  eventNumber: string | null; createdAt: string;
}

function todayLocal() {
  const d = new Date();
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
}
function nowTimeLocal() {
  const d = new Date();
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); // HH:MM
}
/** ISO timestamp → value for <input type="datetime-local"> in local time. */
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Defined OUTSIDE parent so React never remounts it on parent re-render
function CallRow({
  c, highlight, isEditing, editValue, saving, toggling,
  onEdit, onSave, onCancel, onDelete, onEditChange, onToggleActive,
}: {
  c: Call; highlight: boolean; isEditing: boolean;
  editValue: string; saving: boolean; toggling: boolean;
  onEdit: (c: Call) => void;
  onSave: (id: string) => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
  onEditChange: (v: string) => void;
  onToggleActive: (c: Call) => void;
}) {
  return (
    <div className={`border rounded-xl px-4 py-3 sm:px-5 sm:py-4 ${highlight ? "bg-red-400/5 border-red-400/25" : "bg-white/2 border-white/6"}`}>
      {isEditing ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-slate-500 text-xs tabular-nums font-mono">{c.dispatchDate} {c.dispatchTime}</span>
            {c.eventNumber && <span className="text-slate-600 text-xs font-mono">{c.eventNumber}</span>}
          </div>
          <input
            autoFocus
            value={editValue}
            onChange={e => onEditChange(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") onSave(c.id); if (e.key === "Escape") onCancel(); }}
            className="w-full bg-[#040d1a] border border-[#f0b429]/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#f0b429]/80"
          />
          <div className="flex items-center gap-2">
            <button onClick={() => onSave(c.id)} disabled={saving}
              className="flex-1 sm:flex-none bg-[#f0b429] hover:bg-[#f5c842] disabled:opacity-50 text-[#020810] font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={onCancel}
              className="flex-1 sm:flex-none text-slate-400 hover:text-slate-200 border border-white/10 px-4 py-2.5 rounded-xl text-sm transition-colors">
              Cancel
            </button>
          </div>
          <p className="text-slate-600 text-xs">Updates the live ticker on the site within 30 seconds.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {/* Metadata row — full width on mobile, inline on desktop */}
          <div className="flex items-center gap-3 min-w-0 sm:flex-1">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${highlight ? "bg-red-400" : "bg-slate-700"}`} aria-hidden />
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <span className={`text-sm font-bold leading-snug break-words ${highlight ? "text-red-300" : "text-slate-300"}`}>
                {c.dispatchNature}
              </span>
              <span className="text-slate-500 text-[11px] tabular-nums font-mono flex items-center gap-2 flex-wrap">
                <span>{c.dispatchDate}</span>
                <span className="text-slate-700">·</span>
                <span>{c.dispatchTime}</span>
                {c.eventNumber && (
                  <>
                    <span className="text-slate-700">·</span>
                    <span className="text-slate-600">{c.eventNumber}</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Actions row — wraps on mobile under the metadata */}
          <div className="flex items-center gap-2 sm:gap-3 sm:shrink-0">
            <button
              onClick={() => onToggleActive(c)}
              disabled={toggling}
              title={highlight ? "Mark as completed (remove from ticker)" : "Mark as active (show on ticker)"}
              className={`flex-1 sm:flex-none min-h-[36px] sm:min-w-[100px] text-[10px] font-semibold uppercase tracking-widest px-3 py-1.5 rounded border transition-colors disabled:opacity-50 ${highlight ? "text-red-300 bg-red-400/10 border-red-400/25 hover:bg-red-400/20" : "text-slate-400 bg-white/3 border-white/8 hover:text-[#f0b429] hover:border-[#f0b429]/40"}`}
            >
              {toggling ? "…" : highlight ? "On ticker" : "Show ticker"}
            </button>
            <button onClick={() => onEdit(c)} title="Edit call description" aria-label="Edit"
              className="text-slate-500 hover:text-[#f0b429] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-white/[0.03] shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </button>
            <button onClick={() => onDelete(c.id)} title="Remove from log" aria-label="Delete"
              className="text-slate-600 hover:text-red-400 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-red-400/[0.04] shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const inp = "w-full bg-[#040d1a] border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#f0b429]/50 placeholder:text-slate-600 transition-colors";
const lbl = "block text-slate-300 text-xs font-semibold mb-1.5 uppercase tracking-wide";

export default function CallsAdmin() {
  const [calls, setCalls]     = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving]   = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Structured edit modal — replaces the legacy text-only inline edit
  // for the pencil button on each row.
  const [structEditCall, setStructEditCall] = useState<Call | null>(null);
  const [structEditValue, setStructEditValue] = useState<StructuredValue>(EMPTY_STRUCTURED);
  const [structEditLoading, setStructEditLoading] = useState(false);
  const [structEditSaving, setStructEditSaving] = useState(false);
  const [structEditError, setStructEditError] = useState<string | null>(null);
  const [closedAtInput, setClosedAtInput] = useState("");

  // Add call form
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    dispatchDate: todayLocal(),
    dispatchTime: nowTimeLocal(),
    eventNumber: "",
    active: false,
  });
  const [structured, setStructured] = useState<StructuredValue>(EMPTY_STRUCTURED);
  const [adding, setAdding]   = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/cad/log");
    setCalls(await r.json()); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function startEdit(c: Call) { setEditingId(c.id); setEditValue(c.dispatchNature); }

  async function openStructuredEdit(c: Call) {
    setStructEditCall(c);
    setStructEditValue(EMPTY_STRUCTURED);
    setStructEditLoading(true);
    setStructEditError(null);
    try {
      const r = await fetch(`/api/admin/calls/${c.id}`, { cache: "no-store" });
      const d = await r.json();
      if (r.ok && d.structured) {
        setStructEditValue({
          ...EMPTY_STRUCTURED,
          ...d.structured,
          mutualAidReceivedAgency: d.structured.mutualAidReceivedAgency ?? "",
          hemsOutcome: d.structured.hemsOutcome ?? "",
        });
      }
      setClosedAtInput(isoToLocalInput(d?.completedAt ?? c.completedAt ?? null));
    } catch { setClosedAtInput(isoToLocalInput(c.completedAt)); }
    finally { setStructEditLoading(false); }
  }
  async function saveStructuredEdit() {
    if (!structEditCall) return;
    const preview = previewDispatchNature(structEditValue);
    if (!preview) { setStructEditError("Pick at least a unit or category."); return; }
    if (structEditValue.hemsRequested && !structEditValue.hemsOutcome) {
      setStructEditError("HEMS requested needs an outcome.");
      return;
    }
    if (structEditValue.mutualAidReceived && !structEditValue.mutualAidReceivedAgency) {
      setStructEditError("Mutual aid received needs the assisting agency.");
      return;
    }
    setStructEditSaving(true); setStructEditError(null);
    const r = await fetch("/api/admin/calls", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: structEditCall.id,
        structured: structEditValue,
        completedAt: closedAtInput ? new Date(closedAtInput).toISOString() : null,
      }),
    });
    setStructEditSaving(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setStructEditError(d?.error ?? "Could not save.");
      return;
    }
    setStructEditCall(null);
    await load();
  }
  function closeStructuredEdit() {
    setStructEditCall(null);
    setStructEditValue(EMPTY_STRUCTURED);
    setStructEditError(null);
    setClosedAtInput("");
  }

  async function saveEdit(id: string) {
    if (!editValue.trim()) return cancelEdit();
    setSaving(true);
    await fetch("/api/admin/calls", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, dispatchNature: editValue.trim() }),
    });
    setSaving(false);
    setEditingId(null);
    await load();
  }

  function cancelEdit() { setEditingId(null); setEditValue(""); }

  async function toggleActive(c: Call) {
    const nextActive = !!c.completedAt; // if currently completed, we want to reactivate
    const confirmMsg = nextActive
      ? "Mark this call as ACTIVE? It will appear on the live ticker."
      : "Mark this call as completed? It will be removed from the live ticker.";
    if (!confirm(confirmMsg)) return;
    setTogglingId(c.id);
    await fetch("/api/admin/calls", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, active: nextActive }),
    });
    setTogglingId(null);
    await load();
  }

  async function del(id: string) {
    if (!confirm("Remove this call from the log?")) return;
    await fetch("/api/admin/calls", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  }

  async function addCall() {
    const preview = previewDispatchNature(structured);
    if (!preview) { setAddError("Pick at least a unit or category before saving."); return; }
    if (structured.hemsRequested && !structured.hemsOutcome) {
      setAddError("HEMS requested needs an outcome: Patient handoff or Disregarded.");
      return;
    }
    if (structured.mutualAidReceived && !structured.mutualAidReceivedAgency) {
      setAddError("Mutual aid received needs the assisting agency.");
      return;
    }
    setAdding(true); setAddError(null);
    const r = await fetch("/api/admin/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dispatchDate: addForm.dispatchDate,
        dispatchTime: addForm.dispatchTime,
        eventNumber: addForm.eventNumber,
        active: addForm.active,
        structured,
      }),
    });
    setAdding(false);
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setAddError(d?.error ?? "Could not save."); return; }
    setShowAdd(false);
    setAddForm({ dispatchDate: todayLocal(), dispatchTime: nowTimeLocal(), eventNumber: "", active: false });
    setStructured(EMPTY_STRUCTURED);
    await load();
  }

  const q = query.trim().toLowerCase();
  const match = (c: Call) =>
    !q ||
    c.dispatchNature.toLowerCase().includes(q) ||
    (c.eventNumber ?? "").toLowerCase().includes(q) ||
    c.dispatchDate.toLowerCase().includes(q) ||
    c.dispatchTime.toLowerCase().includes(q);
  const active   = calls.filter(c => !c.completedAt && match(c));
  const complete = calls.filter(c =>  c.completedAt && match(c));

  const rowProps = {
    editValue, saving,
    // Pencil now opens the structured editor — same flow as Add. The
    // legacy text input flow is only kept around for the saveEdit /
    // onChange callbacks so the type contract stays stable.
    onEdit: openStructuredEdit, onSave: saveEdit,
    onCancel: cancelEdit, onDelete: del,
    onEditChange: setEditValue,
    onToggleActive: toggleActive,
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="h-px w-8 bg-[#f0b429]/70" />
          <span className="text-[#f0b429] text-[11px] font-semibold tracking-[0.12em] uppercase">Dispatch</span>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-[1.7rem] font-semibold tracking-[-0.02em] text-white leading-tight">Live Call Ticker Editor</h1>
            <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">
              {new Date().getFullYear()} — {calls.length} calls. Active calls show on the public top ticker; edits update within 30 seconds.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 sm:shrink-0">
            <ForcePollButton onAfter={() => load()} />
            <Link href="/admin/calls/reports"
              className="flex items-center justify-center gap-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 text-sky-300 font-semibold text-sm px-4 py-3 sm:py-2.5 rounded-xl transition-colors">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden><path d="M4 19V5h2v14H4zm4 0v-8h2v8H8zm4 0V9h2v10h-2zm4 0v-6h2v6h-2z"/></svg>
              Reports
            </Link>
            <button
              onClick={() => setShowAdd(v => !v)}
              className="flex items-center justify-center gap-2 bg-[#f0b429]/10 hover:bg-[#f0b429]/20 border border-[#f0b429]/25 text-[#f0b429] font-semibold text-sm px-4 py-3 sm:py-2.5 rounded-xl transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              Add ticker/log item
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6 sm:mb-8">
        <div className="rounded-xl sm:rounded-2xl border border-red-400/20 bg-red-400/5 p-3 sm:p-4">
          <span className="text-red-300 text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.16em] sm:tracking-[0.2em] leading-tight block">Live ticker</span>
          <strong className="block text-white text-xl sm:text-2xl mt-1 tabular-nums">{active.length}</strong>
          <p className="text-slate-500 text-[10px] sm:text-xs mt-1 leading-tight hidden sm:block">Showing on the public top strip now.</p>
        </div>
        <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
          <span className="text-slate-400 text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.16em] sm:tracking-[0.2em] leading-tight block">Completed</span>
          <strong className="block text-white text-xl sm:text-2xl mt-1 tabular-nums">{complete.length}</strong>
          <p className="text-slate-500 text-[10px] sm:text-xs mt-1 leading-tight hidden sm:block">Stored history, not on the ticker.</p>
        </div>
        <div className="rounded-xl sm:rounded-2xl border border-[#f0b429]/20 bg-[#f0b429]/5 p-3 sm:p-4">
          <span className="text-[#f0b429] text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.16em] sm:tracking-[0.2em] leading-tight block">Refresh</span>
          <strong className="block text-white text-xl sm:text-2xl mt-1 tabular-nums">30s</strong>
          <p className="text-slate-500 text-[10px] sm:text-xs mt-1 leading-tight hidden sm:block">Ticker refresh window after edits.</p>
        </div>
      </div>

      {/* Search across the whole year's log */}
      {!loading && calls.length > 0 && (
        <div className="mb-6">
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search calls by type, event #, or date…"
            className={inp}
            autoComplete="off"
          />
          {q && (
            <p className="text-slate-500 text-xs mt-1.5">
              {active.length + complete.length} match{active.length + complete.length === 1 ? "" : "es"} of {calls.length}
            </p>
          )}
        </div>
      )}

      {/* Add call form */}
      {showAdd && (
        <div className="bg-[#071428] border border-[#f0b429]/20 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-white font-semibold text-base mb-2">Add ticker / log item</h2>
          <p className="text-slate-400 text-sm mb-5">
            Build the entry from the structured fields below — the public ticker line is generated automatically so the format stays consistent. Gmail polling and cron jobs are unchanged.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={lbl}>Date</label>
              <input type="date" value={addForm.dispatchDate} onChange={e => setAddForm(f => ({...f, dispatchDate: e.target.value}))} className={inp} />
            </div>
            <div>
              <label className={lbl}>Time</label>
              <input type="time" value={addForm.dispatchTime} onChange={e => setAddForm(f => ({...f, dispatchTime: e.target.value}))} className={inp} />
            </div>
            <div>
              <label className={lbl}>Event # <span className="text-slate-600 font-normal normal-case">(optional)</span></label>
              <input value={addForm.eventNumber} onChange={e => setAddForm(f => ({...f, eventNumber: e.target.value}))} placeholder="e.g. 2026-00123" className={inp} />
            </div>
          </div>
          <StructuredCallForm value={structured} onChange={setStructured} />
          <label className="mt-5 mb-5 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={addForm.active}
              onChange={e => setAddForm(f => ({...f, active: e.target.checked}))}
              className="mt-1 h-4 w-4 accent-[#f0b429]"
            />
            <span>
              <span className="block text-white text-sm font-semibold">Show on live ticker immediately</span>
              <span className="block text-slate-500 text-xs mt-1">
                Leave off to save it as completed log history only.
              </span>
            </span>
          </label>
          {addError && (
            <div className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 text-red-200 text-sm px-4 py-3">
              {addError}
            </div>
          )}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2 sm:gap-3">
            <button onClick={() => { setShowAdd(false); setAddError(null); }}
              className="text-slate-400 hover:text-slate-200 border border-white/10 px-4 py-3 sm:py-2.5 rounded-xl text-sm transition-colors">
              Cancel
            </button>
            <button onClick={addCall} disabled={adding}
              className="bg-[#f0b429] hover:bg-[#f5c842] disabled:opacity-40 text-[#020810] font-semibold px-6 py-3 sm:py-2.5 rounded-xl text-sm transition-colors">
              {adding ? "Adding…" : addForm.active ? "Add to live ticker" : "Add to log"}
            </button>
          </div>
        </div>
      )}

      {loading ? <div className="text-slate-600 text-sm py-10">Loading…</div> : calls.length === 0 ? (
        <div className="text-center py-16 text-slate-600">No calls logged yet.</div>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="relative flex w-2.5 h-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-400" />
                </span>
                <span className="text-red-300 text-[13px] font-semibold tracking-[0.06em] uppercase">{active.length} on live ticker</span>
              </div>
              <div className="space-y-2">
                {active.map(c => <CallRow key={c.id} c={c} highlight={true} isEditing={editingId === c.id} toggling={togglingId === c.id} {...rowProps} />)}
              </div>
              <p className="text-slate-600 text-xs mt-3">These are the items currently feeding the public call ticker.</p>
            </div>
          )}
          {complete.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="h-px w-6 bg-slate-700" />
                <span className="text-slate-500 text-xs font-semibold uppercase tracking-widest">{complete.length} completed / not on ticker</span>
              </div>
              <div className="space-y-2">
                {complete.map(c => <CallRow key={c.id} c={c} highlight={false} isEditing={editingId === c.id} toggling={togglingId === c.id} {...rowProps} />)}
              </div>
            </div>
          )}
        </div>
      )}
      <p className="text-slate-700 text-xs mt-8">This editor only changes the display records in the call log table. CAD polling, the call ticker component, and cron behavior are untouched.</p>

      {/* Structured edit modal — opens when the pencil on a row is clicked. */}
      {structEditCall && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeStructuredEdit}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(2,9,18,0.75)",
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            padding: "32px 12px 12px", overflowY: "auto",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 640,
              background: "#071428", border: "1px solid rgba(240,180,41,0.25)",
              borderRadius: 16, padding: 20,
              boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 12 }}>
              <div>
                <div style={{ color: "#7dd3fc", fontSize: 10, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>Edit ticker entry</div>
                <div style={{ color: "white", fontSize: 14, fontWeight: 800, marginTop: 4, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace" }}>
                  {structEditCall.dispatchDate} · {structEditCall.dispatchTime}
                </div>
                <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
                  Originally: <span style={{ color: "#cbd5e1", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace" }}>{structEditCall.dispatchNature}</span>
                </div>
              </div>
              <button onClick={closeStructuredEdit} aria-label="Close" style={{ background: "transparent", border: 0, color: "#94a3b8", fontSize: 22, lineHeight: 1, cursor: "pointer" }}>×</button>
            </div>

            {structEditLoading ? (
              <p style={{ color: "#94a3b8", padding: 16 }}>Loading structured fields…</p>
            ) : (
              <>
                <StructuredCallForm value={structEditValue} onChange={setStructEditValue} />

                {/* Call closed time — admin override for wrong/auto close times */}
                <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: "rgba(2,9,18,0.55)", border: "1px solid rgba(255,255,255,0.10)" }}>
                  <label style={{ display: "block", color: "#8b98ac", fontSize: 11, fontWeight: 600, letterSpacing: "0.01em", marginBottom: 5 }}>
                    Call closed at <span style={{ color: "#64748b", fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>(leave blank if not closed / unknown)</span>
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    <input
                      type="datetime-local"
                      value={closedAtInput}
                      onChange={(e) => setClosedAtInput(e.target.value)}
                      style={{ flex: "1 1 220px", minWidth: 200, background: "#0a1422", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "9px 11px", color: "white", fontSize: 13, fontFamily: "inherit" }}
                    />
                    {closedAtInput && (
                      <button type="button" onClick={() => setClosedAtInput("")}
                        style={{ background: "rgba(255,255,255,0.02)", color: "#fca5a5", border: "1px solid rgba(248,113,113,0.30)", padding: "9px 14px", borderRadius: 10, fontWeight: 600, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
                        Clear
                      </button>
                    )}
                  </div>
                  <div style={{ color: "#64748b", fontSize: 11, marginTop: 6, lineHeight: 1.45 }}>
                    Sets the public &ldquo;call closed&rdquo; time + total call time. Clearing it re-opens the call.
                  </div>
                </div>
              </>
            )}

            {structEditError && (
              <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, fontSize: 13, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", color: "#fecaca" }}>
                {structEditError}
              </div>
            )}

            <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={closeStructuredEdit} disabled={structEditSaving}
                style={{ background: "transparent", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.12)", padding: "9px 16px", borderRadius: 10, fontWeight: 800, fontSize: 12, letterSpacing: "0.10em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
              <button onClick={saveStructuredEdit} disabled={structEditSaving || structEditLoading}
                style={{ background: "#f0b429", color: "#040d1a", border: 0, padding: "9px 18px", borderRadius: 10, fontWeight: 900, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", opacity: structEditSaving || structEditLoading ? 0.6 : 1 }}>
                {structEditSaving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ForcePollButton({ onAfter }: { onAfter: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function go() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/cad-poll", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(d.error || `Poll failed (${r.status})`);
      } else {
        setMsg(
          d.processed === 0
            ? "Polled Gmail — no new dispatch emails."
            : `Polled Gmail — processed ${d.processed}, dupes ${d.duplicates ?? 0}, failed ${d.failed ?? 0}.`,
        );
        onAfter();
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Poll error");
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 6000);
    }
  }
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <button
        onClick={go}
        disabled={busy}
        className="flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold text-sm px-4 py-3 sm:py-2.5 rounded-xl transition-colors disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden><path d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.74 9.99h-2.07A6 6 0 1 1 12 6a5.85 5.85 0 0 1 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
        {busy ? "Polling…" : "Poll Gmail now"}
      </button>
      {msg && <span className="text-slate-300 text-xs leading-relaxed">{msg}</span>}
    </div>
  );
}

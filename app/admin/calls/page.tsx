"use client";

import { useEffect, useState } from "react";

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
              className="flex-1 sm:flex-none bg-[#f0b429] hover:bg-[#f5c842] disabled:opacity-50 text-[#020810] font-black px-5 py-2.5 rounded-xl text-sm transition-colors">
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
              className={`flex-1 sm:flex-none min-h-[36px] sm:min-w-[100px] text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded border transition-colors disabled:opacity-50 ${highlight ? "text-red-300 bg-red-400/10 border-red-400/25 hover:bg-red-400/20" : "text-slate-400 bg-white/3 border-white/8 hover:text-[#f0b429] hover:border-[#f0b429]/40"}`}
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

  // Add call form
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    dispatchDate: todayLocal(),
    dispatchTime: nowTimeLocal(),
    dispatchNature: "",
    eventNumber: "",
    active: false,
  });
  const [adding, setAdding]   = useState(false);

  async function load() {
    const r = await fetch("/api/cad/log");
    setCalls(await r.json()); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function startEdit(c: Call) { setEditingId(c.id); setEditValue(c.dispatchNature); }

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
    if (!addForm.dispatchNature.trim()) return;
    setAdding(true);
    await fetch("/api/admin/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    setAdding(false);
    setShowAdd(false);
    setAddForm({ dispatchDate: todayLocal(), dispatchTime: nowTimeLocal(), dispatchNature: "", eventNumber: "", active: false });
    await load();
  }

  const active   = calls.filter(c => !c.completedAt);
  const complete = calls.filter(c =>  c.completedAt);

  const rowProps = {
    editValue, saving,
    onEdit: startEdit, onSave: saveEdit,
    onCancel: cancelEdit, onDelete: del,
    onEditChange: setEditValue,
    onToggleActive: toggleActive,
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="h-px w-8 bg-[#f0b429]" />
          <span className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase">Dispatch</span>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">Live Call Ticker Editor</h1>
            <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">
              {new Date().getFullYear()} — {calls.length} calls. Active calls show on the public top ticker; edits update within 30 seconds.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 sm:shrink-0">
            <ForcePollButton onAfter={() => load()} />
            <button
              onClick={() => setShowAdd(v => !v)}
              className="flex items-center justify-center gap-2 bg-[#f0b429]/10 hover:bg-[#f0b429]/20 border border-[#f0b429]/25 text-[#f0b429] font-black text-sm px-4 py-3 sm:py-2.5 rounded-xl transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              Add ticker/log item
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6 sm:mb-8">
        <div className="rounded-xl sm:rounded-2xl border border-red-400/20 bg-red-400/5 p-3 sm:p-4">
          <span className="text-red-300 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.16em] sm:tracking-[0.2em] leading-tight block">Live ticker</span>
          <strong className="block text-white text-xl sm:text-2xl mt-1 tabular-nums">{active.length}</strong>
          <p className="text-slate-500 text-[10px] sm:text-xs mt-1 leading-tight hidden sm:block">Showing on the public top strip now.</p>
        </div>
        <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
          <span className="text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.16em] sm:tracking-[0.2em] leading-tight block">Completed</span>
          <strong className="block text-white text-xl sm:text-2xl mt-1 tabular-nums">{complete.length}</strong>
          <p className="text-slate-500 text-[10px] sm:text-xs mt-1 leading-tight hidden sm:block">Stored history, not on the ticker.</p>
        </div>
        <div className="rounded-xl sm:rounded-2xl border border-[#f0b429]/20 bg-[#f0b429]/5 p-3 sm:p-4">
          <span className="text-[#f0b429] text-[9px] sm:text-[10px] font-black uppercase tracking-[0.16em] sm:tracking-[0.2em] leading-tight block">Refresh</span>
          <strong className="block text-white text-xl sm:text-2xl mt-1 tabular-nums">30s</strong>
          <p className="text-slate-500 text-[10px] sm:text-xs mt-1 leading-tight hidden sm:block">Ticker refresh window after edits.</p>
        </div>
      </div>

      {/* Add call form */}
      {showAdd && (
        <div className="bg-[#071428] border border-[#f0b429]/20 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-white font-black text-base mb-2">Add ticker/log item</h2>
          <p className="text-slate-400 text-sm mb-5">
            Use this for a corrected dispatch entry or a manual public ticker item. Gmail polling and cron jobs are unchanged.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={lbl}>Date</label>
              <input type="date" value={addForm.dispatchDate} onChange={e => setAddForm(f => ({...f, dispatchDate: e.target.value}))} className={inp} />
            </div>
            <div>
              <label className={lbl}>Time</label>
              <input type="time" value={addForm.dispatchTime} onChange={e => setAddForm(f => ({...f, dispatchTime: e.target.value}))} className={inp} />
            </div>
          </div>
          <div className="mb-4">
            <label className={lbl}>Call Type / Description</label>
            <input
              autoFocus
              value={addForm.dispatchNature}
              onChange={e => setAddForm(f => ({...f, dispatchNature: e.target.value}))}
              onKeyDown={e => { if (e.key === "Enter") addCall(); if (e.key === "Escape") setShowAdd(false); }}
              placeholder="e.g. Medical Emergency"
              className={inp}
            />
          </div>
          <div className="mb-5">
            <label className={lbl}>Event Number <span className="text-slate-600 font-normal normal-case">(optional)</span></label>
            <input value={addForm.eventNumber} onChange={e => setAddForm(f => ({...f, eventNumber: e.target.value}))} placeholder="e.g. 2026-00123" className={inp} />
          </div>
          <label className="mb-5 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={addForm.active}
              onChange={e => setAddForm(f => ({...f, active: e.target.checked}))}
              className="mt-1 h-4 w-4 accent-[#f0b429]"
            />
            <span>
              <span className="block text-white text-sm font-black">Show on live ticker immediately</span>
              <span className="block text-slate-500 text-xs mt-1">
                Leave off to save it as completed log history only.
              </span>
            </span>
          </label>
          <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2 sm:gap-3">
            <button onClick={() => setShowAdd(false)}
              className="text-slate-400 hover:text-slate-200 border border-white/10 px-4 py-3 sm:py-2.5 rounded-xl text-sm transition-colors">
              Cancel
            </button>
            <button onClick={addCall} disabled={adding || !addForm.dispatchNature.trim()}
              className="bg-[#f0b429] hover:bg-[#f5c842] disabled:opacity-40 text-[#020810] font-black px-6 py-3 sm:py-2.5 rounded-xl text-sm transition-colors">
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
                <span className="text-red-400 text-sm font-black uppercase tracking-widest">{active.length} on live ticker</span>
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
        className="flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-black text-sm px-4 py-3 sm:py-2.5 rounded-xl transition-colors disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden><path d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.74 9.99h-2.07A6 6 0 1 1 12 6a5.85 5.85 0 0 1 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
        {busy ? "Polling…" : "Poll Gmail now"}
      </button>
      {msg && <span className="text-slate-300 text-xs leading-relaxed">{msg}</span>}
    </div>
  );
}

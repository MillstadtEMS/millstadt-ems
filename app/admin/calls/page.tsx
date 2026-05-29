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
    <div className={`border rounded-xl px-5 py-4 ${highlight ? "bg-red-400/5 border-red-400/25" : "bg-white/2 border-white/6"}`}>
      {isEditing ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-xs tabular-nums font-mono">{c.dispatchDate} {c.dispatchTime}</span>
            {c.eventNumber && <span className="text-slate-600 text-xs font-mono">{c.eventNumber}</span>}
          </div>
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={editValue}
              onChange={e => onEditChange(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") onSave(c.id); if (e.key === "Escape") onCancel(); }}
              className="flex-1 bg-[#040d1a] border border-[#f0b429]/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#f0b429]/80"
            />
            <button onClick={() => onSave(c.id)} disabled={saving}
              className="bg-[#f0b429] hover:bg-[#f5c842] disabled:opacity-50 text-[#020810] font-black px-4 py-2.5 rounded-xl text-sm transition-colors shrink-0">
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={onCancel}
              className="text-slate-500 hover:text-slate-300 px-3 py-2.5 rounded-xl text-sm transition-colors shrink-0">
              Cancel
            </button>
          </div>
          <p className="text-slate-600 text-xs">This will update the live ticker on the site within 30 seconds.</p>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${highlight ? "bg-red-400" : "bg-slate-700"}`} />
          <span className="text-slate-500 text-xs tabular-nums font-mono w-20 shrink-0">{c.dispatchDate}</span>
          <span className="text-slate-400 text-xs tabular-nums font-mono w-12 shrink-0">{c.dispatchTime}</span>
          <span className={`text-sm font-bold flex-1 truncate ${highlight ? "text-red-300" : "text-slate-300"}`}>{c.dispatchNature}</span>
          {c.eventNumber && <span className="text-slate-600 text-xs font-mono shrink-0 hidden sm:block">{c.eventNumber}</span>}
          <button
            onClick={() => onToggleActive(c)}
            disabled={toggling}
            title={highlight ? "Mark as completed (remove from ticker)" : "Mark as active (show on ticker)"}
            className={`min-w-[92px] text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border shrink-0 transition-colors disabled:opacity-50 ${highlight ? "text-red-300 bg-red-400/10 border-red-400/25 hover:bg-red-400/20" : "text-slate-400 bg-white/3 border-white/8 hover:text-[#f0b429] hover:border-[#f0b429]/40"}`}
          >
            {toggling ? "…" : highlight ? "On ticker" : "Show ticker"}
          </button>
          <button onClick={() => onEdit(c)} title="Edit call description"
            className="text-slate-600 hover:text-[#f0b429] transition-colors p-1 shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          </button>
          <button onClick={() => onDelete(c.id)} title="Remove from log"
            className="text-slate-700 hover:text-red-400 transition-colors p-1 shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
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
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="h-px w-8 bg-[#f0b429]" />
          <span className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase">Dispatch</span>
        </div>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-black text-white">Live Call Ticker Editor</h1>
            <p className="text-slate-400 text-sm mt-1">
              {new Date().getFullYear()} — {calls.length} calls. Active calls show in the public top ticker; edits update within 30 seconds.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ForcePollButton onAfter={() => load()} />
            <button
              onClick={() => setShowAdd(v => !v)}
              className="shrink-0 flex items-center gap-2 bg-[#f0b429]/10 hover:bg-[#f0b429]/20 border border-[#f0b429]/25 text-[#f0b429] font-black text-sm px-4 py-2.5 rounded-xl transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              Add ticker/log item
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mb-8">
        <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-4">
          <span className="text-red-300 text-[10px] font-black uppercase tracking-[0.2em]">Live ticker</span>
          <strong className="block text-white text-2xl mt-1">{active.length}</strong>
          <p className="text-slate-500 text-xs mt-1">Showing on the public top strip now.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Completed log</span>
          <strong className="block text-white text-2xl mt-1">{complete.length}</strong>
          <p className="text-slate-500 text-xs mt-1">Stored history, not on the ticker.</p>
        </div>
        <div className="rounded-2xl border border-[#f0b429]/20 bg-[#f0b429]/5 p-4">
          <span className="text-[#f0b429] text-[10px] font-black uppercase tracking-[0.2em]">Update timing</span>
          <strong className="block text-white text-2xl mt-1">30s</strong>
          <p className="text-slate-500 text-xs mt-1">Ticker refresh window after edits.</p>
        </div>
      </div>

      {/* Add call form */}
      {showAdd && (
        <div className="bg-[#071428] border border-[#f0b429]/20 rounded-2xl p-6 mb-8">
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
          <div className="flex items-center gap-3">
            <button onClick={addCall} disabled={adding || !addForm.dispatchNature.trim()}
              className="bg-[#f0b429] hover:bg-[#f5c842] disabled:opacity-40 text-[#020810] font-black px-6 py-2.5 rounded-xl text-sm transition-colors">
              {adding ? "Adding…" : addForm.active ? "Add to live ticker" : "Add to log"}
            </button>
            <button onClick={() => setShowAdd(false)}
              className="text-slate-500 hover:text-slate-300 px-4 py-2.5 rounded-xl text-sm transition-colors">
              Cancel
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
    <div className="flex items-center gap-3">
      <button
        onClick={go}
        disabled={busy}
        className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-black text-sm px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.74 9.99h-2.07A6 6 0 1 1 12 6a5.85 5.85 0 0 1 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
        {busy ? "Polling…" : "Poll Gmail now"}
      </button>
      {msg && <span className="text-slate-300 text-xs">{msg}</span>}
    </div>
  );
}

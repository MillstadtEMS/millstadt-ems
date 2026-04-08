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
  c, highlight, isEditing, editValue, saving,
  onEdit, onSave, onCancel, onDelete, onEditChange,
}: {
  c: Call; highlight: boolean; isEditing: boolean;
  editValue: string; saving: boolean;
  onEdit: (c: Call) => void;
  onSave: (id: string) => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
  onEditChange: (v: string) => void;
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
          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border shrink-0 ${highlight ? "text-red-400 bg-red-400/10 border-red-400/20" : "text-slate-600 bg-white/3 border-white/8"}`}>
            {highlight ? "Active" : "Done"}
          </span>
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

  // Add call form
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ dispatchDate: todayLocal(), dispatchTime: nowTimeLocal(), dispatchNature: "", eventNumber: "" });
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
    setAddForm({ dispatchDate: todayLocal(), dispatchTime: nowTimeLocal(), dispatchNature: "", eventNumber: "" });
    await load();
  }

  const active   = calls.filter(c => !c.completedAt);
  const complete = calls.filter(c =>  c.completedAt);

  const rowProps = {
    editValue, saving,
    onEdit: startEdit, onSave: saveEdit,
    onCancel: cancelEdit, onDelete: del,
    onEditChange: setEditValue,
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="h-px w-8 bg-[#f0b429]" />
          <span className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase">Dispatch</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white">Call Log</h1>
            <p className="text-slate-400 text-sm mt-1">{new Date().getFullYear()} — {calls.length} calls. Click the pencil icon to edit a call&apos;s description.</p>
          </div>
          <button
            onClick={() => setShowAdd(v => !v)}
            className="shrink-0 flex items-center gap-2 bg-[#f0b429]/10 hover:bg-[#f0b429]/20 border border-[#f0b429]/25 text-[#f0b429] font-black text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            Add Call
          </button>
        </div>
      </div>

      {/* Add call form */}
      {showAdd && (
        <div className="bg-[#071428] border border-[#f0b429]/20 rounded-2xl p-6 mb-8">
          <h2 className="text-white font-black text-base mb-5">Add to Log</h2>
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
          <p className="text-slate-600 text-xs mb-5">This adds the call directly to the completed log. It will not affect the live active ticker.</p>
          <div className="flex items-center gap-3">
            <button onClick={addCall} disabled={adding || !addForm.dispatchNature.trim()}
              className="bg-[#f0b429] hover:bg-[#f5c842] disabled:opacity-40 text-[#020810] font-black px-6 py-2.5 rounded-xl text-sm transition-colors">
              {adding ? "Adding…" : "Add to Log"}
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
                <span className="text-red-400 text-sm font-black uppercase tracking-widest">{active.length} Active</span>
              </div>
              <div className="space-y-2">
                {active.map(c => <CallRow key={c.id} c={c} highlight={true} isEditing={editingId === c.id} {...rowProps} />)}
              </div>
              <p className="text-slate-600 text-xs mt-3">Edit the description above — the ticker updates within 30 seconds.</p>
            </div>
          )}
          {complete.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="h-px w-6 bg-slate-700" />
                <span className="text-slate-500 text-xs font-semibold uppercase tracking-widest">{complete.length} Completed</span>
              </div>
              <div className="space-y-2">
                {complete.map(c => <CallRow key={c.id} c={c} highlight={false} isEditing={editingId === c.id} {...rowProps} />)}
              </div>
            </div>
          )}
        </div>
      )}
      <p className="text-slate-700 text-xs mt-8">Removing a call only affects the public display — it does not delete from the raw Gmail log.</p>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

interface Call {
  id: string; dispatchDate: string; dispatchTime: string;
  dispatchNature: string; completedAt: string | null;
  eventNumber: string | null; createdAt: string;
}

export default function CallsAdmin() {
  const [calls, setCalls]     = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const r = await fetch("/api/cad/log");
    setCalls(await r.json()); setLoading(false);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { if (editingId) inputRef.current?.focus(); }, [editingId]);

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

  const active   = calls.filter(c => !c.completedAt);
  const complete = calls.filter(c =>  c.completedAt);

  function CallRow({ c, highlight }: { c: Call; highlight: boolean }) {
    const isEditing = editingId === c.id;
    return (
      <div className={`border rounded-xl px-5 py-4 ${highlight ? "bg-red-400/5 border-red-400/25" : "bg-white/2 border-white/6"}`}>
        {isEditing ? (
          /* ── Edit mode ── */
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="text-slate-500 text-xs tabular-nums font-mono">{c.dispatchDate} {c.dispatchTime}</span>
              {c.eventNumber && <span className="text-slate-600 text-xs font-mono">{c.eventNumber}</span>}
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveEdit(c.id); if (e.key === "Escape") cancelEdit(); }}
                className="flex-1 bg-[#040d1a] border border-[#f0b429]/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#f0b429]/80"
              />
              <button onClick={() => saveEdit(c.id)} disabled={saving}
                className="bg-[#f0b429] hover:bg-[#f5c842] disabled:opacity-50 text-[#020810] font-black px-4 py-2.5 rounded-xl text-sm transition-colors shrink-0">
                {saving ? "Saving…" : "Save"}
              </button>
              <button onClick={cancelEdit}
                className="text-slate-500 hover:text-slate-300 px-3 py-2.5 rounded-xl text-sm transition-colors shrink-0">
                Cancel
              </button>
            </div>
            <p className="text-slate-600 text-xs">This will update the live ticker on the site immediately.</p>
          </div>
        ) : (
          /* ── Display mode ── */
          <div className="flex items-center gap-4">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${highlight ? "bg-red-400" : "bg-slate-700"}`} />
            <span className="text-slate-500 text-xs tabular-nums font-mono w-20 shrink-0">{c.dispatchDate}</span>
            <span className="text-slate-400 text-xs tabular-nums font-mono w-12 shrink-0">{c.dispatchTime}</span>
            <span className={`text-sm font-bold flex-1 truncate ${highlight ? "text-red-300" : "text-slate-300"}`}>{c.dispatchNature}</span>
            {c.eventNumber && <span className="text-slate-600 text-xs font-mono shrink-0 hidden sm:block">{c.eventNumber}</span>}
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border shrink-0 ${highlight ? "text-red-400 bg-red-400/10 border-red-400/20" : "text-slate-600 bg-white/3 border-white/8"}`}>
              {highlight ? "Active" : "Done"}
            </span>
            {/* Edit button */}
            <button onClick={() => startEdit(c)} title="Edit call description"
              className="text-slate-600 hover:text-[#f0b429] transition-colors p-1 shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </button>
            <button onClick={() => del(c.id)} title="Remove from log"
              className="text-slate-700 hover:text-red-400 transition-colors p-1 shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="h-px w-8 bg-[#f0b429]" />
          <span className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase">Dispatch</span>
        </div>
        <h1 className="text-3xl font-black text-white">Call Log</h1>
        <p className="text-slate-400 text-sm mt-1.5">{new Date().getFullYear()} — {calls.length} calls. Click the pencil icon to edit a call&apos;s description and update the live ticker.</p>
      </div>

      {loading ? <div className="text-slate-600 text-sm py-10">Loading…</div> : calls.length === 0 ? (
        <div className="text-center py-16 text-slate-600">No calls logged yet.</div>
      ) : (
        <div className="space-y-8">

          {/* ── Active calls ── */}
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
                {active.map(c => <CallRow key={c.id} c={c} highlight={true} />)}
              </div>
              <p className="text-slate-600 text-xs mt-3">Edit the description above and hit Save — the ticker on the website updates within 30 seconds.</p>
            </div>
          )}

          {/* ── Completed calls ── */}
          {complete.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="h-px w-6 bg-slate-700" />
                <span className="text-slate-500 text-xs font-semibold uppercase tracking-widest">{complete.length} Completed</span>
              </div>
              <div className="space-y-2">
                {complete.map(c => <CallRow key={c.id} c={c} highlight={false} />)}
              </div>
            </div>
          )}

        </div>
      )}
      <p className="text-slate-700 text-xs mt-8">Removing a call only affects the public display — it does not delete from the raw Gmail log.</p>
    </div>
  );
}

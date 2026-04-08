"use client";

import { useEffect, useRef, useState } from "react";

interface Call {
  id: string; dispatchDate: string; dispatchTime: string;
  dispatchNature: string; completedAt: string | null;
  eventNumber: string | null; createdAt: string;
}

export default function CallsAdmin() {
  const [calls, setCalls]   = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const r = await fetch("/api/cad/log");
    setCalls(await r.json()); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (editingId) inputRef.current?.focus();
  }, [editingId]);

  function startEdit(c: Call) {
    setEditingId(c.id);
    setEditValue(c.dispatchNature);
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

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  async function del(id: string) {
    if (!confirm("Remove this call from the log?")) return;
    await fetch("/api/admin/calls", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  }

  const active   = calls.filter(c => !c.completedAt);
  const complete = calls.filter(c => c.completedAt);

  return (
    <div className="max-w-3xl">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white">Call Log</h1>
          <p className="text-slate-500 text-sm mt-1">{new Date().getFullYear()} dispatch log — {calls.length} total calls.</p>
        </div>
        {active.length > 0 && (
          <div className="flex items-center gap-2 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping absolute" />
            <span className="w-2 h-2 rounded-full bg-red-400 relative" />
            <span className="text-red-400 text-sm font-bold">{active.length} active</span>
          </div>
        )}
      </div>

      {loading ? <div className="text-slate-600 text-sm">Loading…</div> : calls.length === 0 ? (
        <div className="text-center py-16 text-slate-600">No calls logged yet.</div>
      ) : (
        <div className="space-y-2">
          {calls.map(c => {
            const isActive  = !c.completedAt;
            const isEditing = editingId === c.id;
            return (
              <div key={c.id} className={`border rounded-xl px-5 py-4 flex items-center gap-4 ${isActive ? "bg-red-400/5 border-red-400/20" : "bg-white/2 border-white/6"}`}>
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isActive ? "bg-red-400" : "bg-slate-700"}`} />
                <span className="text-slate-500 text-xs tabular-nums font-mono w-20 shrink-0">{c.dispatchDate}</span>
                <span className="text-slate-400 text-xs tabular-nums font-mono w-12 shrink-0">{c.dispatchTime}</span>

                {/* Nature — editable inline */}
                {isEditing ? (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <input
                      ref={inputRef}
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") saveEdit(c.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="flex-1 bg-[#040d1a] border border-[#f0b429]/40 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#f0b429]/70"
                    />
                    <button
                      onClick={() => saveEdit(c.id)}
                      disabled={saving}
                      className="bg-[#f0b429] hover:bg-[#f5c842] disabled:opacity-50 text-[#020810] font-black text-xs px-3 py-1.5 rounded-lg transition-colors shrink-0"
                    >
                      {saving ? "…" : "Save"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="text-slate-500 hover:text-slate-300 text-xs px-2 py-1.5 rounded-lg transition-colors shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(c)}
                    title="Click to edit"
                    className={`text-sm font-bold flex-1 truncate text-left hover:underline decoration-dotted underline-offset-2 transition-colors ${isActive ? "text-red-300 hover:text-red-200" : "text-slate-300 hover:text-white"}`}
                  >
                    {c.dispatchNature}
                  </button>
                )}

                {!isEditing && (
                  <>
                    {c.eventNumber && <span className="text-slate-600 text-xs font-mono shrink-0 hidden sm:block">{c.eventNumber}</span>}
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border shrink-0 ${isActive ? "text-red-400 bg-red-400/10 border-red-400/20" : "text-slate-600 bg-white/3 border-white/8"}`}>
                      {isActive ? "Active" : "Done"}
                    </span>
                    <button onClick={() => del(c.id)} className="text-slate-700 hover:text-red-400 transition-colors p-1 shrink-0" title="Remove from log">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="text-slate-700 text-xs mt-6">Click any call name to edit it. Removing a call only affects the public display — it does not delete from the raw Gmail log.</p>
    </div>
  );
}

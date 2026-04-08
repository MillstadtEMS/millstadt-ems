"use client";

import { useEffect, useState } from "react";

interface Call {
  id: string; dispatchDate: string; dispatchTime: string;
  dispatchNature: string; completedAt: string | null;
  eventNumber: string | null; createdAt: string;
}

export default function CallsAdmin() {
  const [calls, setCalls]   = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const r = await fetch("/api/cad/log");
    setCalls(await r.json()); setLoading(false);
  }
  useEffect(() => { load(); }, []);

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
            const isActive = !c.completedAt;
            return (
              <div key={c.id} className={`border rounded-xl px-5 py-4 flex items-center gap-4 ${isActive ? "bg-red-400/5 border-red-400/20" : "bg-white/2 border-white/6"}`}>
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isActive ? "bg-red-400" : "bg-slate-700"}`} />
                <span className="text-slate-500 text-xs tabular-nums font-mono w-20 shrink-0">{c.dispatchDate}</span>
                <span className="text-slate-400 text-xs tabular-nums font-mono w-12 shrink-0">{c.dispatchTime}</span>
                <span className={`text-sm font-bold flex-1 truncate ${isActive ? "text-red-300" : "text-slate-300"}`}>{c.dispatchNature}</span>
                {c.eventNumber && <span className="text-slate-600 text-xs font-mono shrink-0 hidden sm:block">{c.eventNumber}</span>}
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border shrink-0 ${isActive ? "text-red-400 bg-red-400/10 border-red-400/20" : "text-slate-600 bg-white/3 border-white/8"}`}>
                  {isActive ? "Active" : "Done"}
                </span>
                <button onClick={() => del(c.id)} className="text-slate-700 hover:text-red-400 transition-colors p-1 shrink-0" title="Remove from log">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-slate-700 text-xs mt-6">Removing a call only affects the public display — it does not delete from the raw Gmail log.</p>
    </div>
  );
}

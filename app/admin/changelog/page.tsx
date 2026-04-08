"use client";

import { useEffect, useState } from "react";

interface Entry { id: string; action: string; section: string; detail: string; createdAt: string; }

const ACTION_STYLE: Record<string, string> = {
  "Publish":      "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  "Save Draft":   "text-[#f0b429] bg-[#f0b429]/10 border-[#f0b429]/20",
  "Create":       "text-blue-400 bg-blue-400/10 border-blue-400/20",
  "Update":       "text-sky-400 bg-sky-400/10 border-sky-400/20",
  "Delete":       "text-red-400 bg-red-400/10 border-red-400/20",
  "Upload":       "text-teal-400 bg-teal-400/10 border-teal-400/20",
  "Approve":      "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  "Hide":         "text-slate-400 bg-white/5 border-white/10",
};

function getStyle(action: string) {
  for (const [k, v] of Object.entries(ACTION_STYLE)) {
    if (action.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return "text-slate-400 bg-white/5 border-white/10";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });
}

export default function ChangelogPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/changelog").then(r => r.json()).then(d => { setEntries(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  // Group by date
  const byDay: Record<string, Entry[]> = {};
  entries.forEach(e => {
    const day = new Date(e.createdAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(e);
  });

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2"><span className="h-px w-8 bg-[#f0b429]" /><span className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase">Audit Trail</span></div>
        <h1 className="text-3xl font-black text-white">Change Log</h1>
        <p className="text-slate-400 text-sm mt-1.5">A record of every admin action taken on the site.</p>
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm py-12 text-center">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="bg-[#071428] border border-white/10 rounded-2xl p-12 text-center text-slate-500 text-sm">No changes recorded yet.</div>
      ) : (
        <div className="space-y-8">
          {Object.entries(byDay).map(([day, dayEntries]) => (
            <div key={day}>
              <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">{day}</div>
              <div className="space-y-2">
                {dayEntries.map(e => (
                  <div key={e.id} className="bg-[#071428] border border-white/10 rounded-xl px-5 py-4 flex items-start gap-4">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1.5 rounded-lg border shrink-0 ${getStyle(e.action)}`}>{e.action}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-white text-sm font-semibold">{e.section}</span>
                      </div>
                      {e.detail && <div className="text-slate-400 text-xs leading-relaxed">{e.detail}</div>}
                    </div>
                    <div className="text-slate-600 text-xs shrink-0">{fmtDate(e.createdAt)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

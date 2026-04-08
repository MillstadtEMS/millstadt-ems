"use client";

import { useEffect, useState } from "react";

interface Announcement {
  id: string; title: string; body: string;
  severity: "info" | "warning" | "critical"; active: boolean; createdAt: string;
}

const SEV = ["info","warning","critical"] as const;
const SEV_STYLE: Record<string, string> = {
  info:     "text-blue-400 bg-blue-400/10 border-blue-400/20",
  warning:  "text-amber-400 bg-amber-400/10 border-amber-400/20",
  critical: "text-red-400 bg-red-400/10 border-red-400/20",
};

const blank = { title: "", body: "", severity: "info" as const, active: true };

export default function AnnouncementsAdmin() {
  const [items, setItems]     = useState<Announcement[]>([]);
  const [form, setForm]       = useState(blank);
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const r = await fetch("/api/admin/announcements");
    setItems(await r.json()); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/admin/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm(blank); await load(); setSaving(false);
  }

  async function toggle(a: Announcement) {
    await fetch("/api/admin/announcements", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id, active: !a.active }) });
    await load();
  }

  async function del(id: string) {
    if (!confirm("Delete this announcement?")) return;
    await fetch("/api/admin/announcements", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8"><h1 className="text-2xl font-black text-white">Announcements</h1><p className="text-slate-500 text-sm mt-1">Shown as a banner on the site to all visitors.</p></div>

      {/* New announcement form */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-6 mb-8">
        <h2 className="text-white font-bold mb-5 text-sm uppercase tracking-widest">New Announcement</h2>
        <div className="space-y-4">
          <div>
            <label className="text-slate-500 text-xs uppercase tracking-widest font-bold block mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-[#f0b429]/40 text-sm" placeholder="Road closure on Jefferson Ave" />
          </div>
          <div>
            <label className="text-slate-500 text-xs uppercase tracking-widest font-bold block mb-1.5">Message</label>
            <textarea value={form.body} onChange={e => setForm(f => ({...f, body: e.target.value}))} rows={3} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-[#f0b429]/40 text-sm resize-none" placeholder="Details about the announcement…" />
          </div>
          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="text-slate-500 text-xs uppercase tracking-widest font-bold block mb-1.5">Severity</label>
              <select value={form.severity} onChange={e => setForm(f => ({...f, severity: e.target.value as typeof form.severity}))} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-[#f0b429]/40">
                {SEV.map(s => <option key={s} value={s} className="bg-[#020810] capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={save} disabled={saving || !form.title || !form.body} className="bg-[#f0b429] hover:bg-[#f5c842] disabled:opacity-40 text-[#020810] font-black px-6 py-2.5 rounded-lg text-sm transition-colors">
                {saving ? "Posting…" : "Post Announcement"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? <div className="text-slate-600 text-sm">Loading…</div> : items.length === 0 ? (
        <div className="text-center py-16 text-slate-600">No announcements yet.</div>
      ) : (
        <div className="space-y-3">
          {items.map(a => (
            <div key={a.id} className={`border rounded-xl p-5 flex gap-4 items-start ${a.active ? "bg-white/3 border-white/8" : "bg-white/1 border-white/4 opacity-50"}`}>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border shrink-0 mt-0.5 ${SEV_STYLE[a.severity]}`}>{a.severity}</span>
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-sm">{a.title}</div>
                <div className="text-slate-400 text-sm mt-1 leading-relaxed">{a.body}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggle(a)} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${a.active ? "border-emerald-500/30 text-emerald-400 hover:bg-red-400/10 hover:text-red-400 hover:border-red-400/30" : "border-white/10 text-slate-500 hover:bg-emerald-400/10 hover:text-emerald-400 hover:border-emerald-400/30"}`}>
                  {a.active ? "Deactivate" : "Activate"}
                </button>
                <button onClick={() => del(a.id)} className="text-slate-600 hover:text-red-400 transition-colors p-1.5">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

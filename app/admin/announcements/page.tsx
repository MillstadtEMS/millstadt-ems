"use client";

import { useEffect, useState } from "react";

interface Announcement {
  id: string; title: string; body: string;
  severity: "info" | "warning" | "critical"; active: boolean; createdAt: string;
}

const SEV = ["info","warning","critical"] as const;
const SEV_STYLE: Record<string, string> = {
  info:     "text-blue-300 bg-blue-400/15 border-blue-400/30",
  warning:  "text-amber-300 bg-amber-400/15 border-amber-400/30",
  critical: "text-red-300 bg-red-400/15 border-red-400/30",
};

const blank = { title: "", body: "", severity: "info" as const, active: true };
const inp   = "w-full bg-[#040d1a] border border-white/15 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#f0b429]/50 placeholder:text-slate-600 transition-colors";
const lbl   = "block text-slate-300 text-sm font-semibold mb-2";

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
    if (!form.title || !form.body) return;
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
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2"><span className="h-px w-8 bg-[#f0b429]" /><span className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase">Site Alerts</span></div>
        <h1 className="text-3xl font-black text-white">Announcements</h1>
        <p className="text-slate-400 text-sm mt-1.5">Active announcements appear as a banner to all site visitors.</p>
      </div>

      {/* New form */}
      <div className="bg-[#071428] border border-white/10 rounded-2xl p-7 mb-8">
        <h2 className="text-white font-black text-lg mb-6">New Announcement</h2>
        <div className="space-y-5">
          <div>
            <label className={lbl}>Title</label>
            <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} className={inp} placeholder="Road closure on Jefferson Ave" />
          </div>
          <div>
            <label className={lbl}>Message</label>
            <textarea value={form.body} onChange={e => setForm(f => ({...f, body: e.target.value}))} rows={4} className={`${inp} resize-none`} placeholder="Details about the announcement…" />
          </div>
          <div className="flex flex-wrap gap-5 items-end">
            <div>
              <label className={lbl}>Severity</label>
              <select value={form.severity} onChange={e => setForm(f => ({...f, severity: e.target.value as typeof form.severity}))} className="bg-[#040d1a] border border-white/15 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#f0b429]/50 transition-colors">
                {SEV.map(s => <option key={s} value={s} className="bg-[#020810] capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
            </div>
            <button onClick={save} disabled={saving || !form.title || !form.body} className="bg-[#f0b429] hover:bg-[#f5c842] disabled:opacity-40 text-[#020810] font-black px-7 py-3 rounded-xl text-sm transition-colors">
              {saving ? "Posting…" : "Post Announcement"}
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-slate-500 text-sm py-10 text-center">Loading…</div>
      ) : items.length === 0 ? (
        <div className="bg-[#071428] border border-white/10 rounded-2xl p-12 text-center text-slate-500 text-sm">No announcements yet.</div>
      ) : (
        <div className="space-y-3">
          {items.map(a => (
            <div key={a.id} className={`bg-[#071428] border rounded-2xl p-6 flex gap-4 items-start transition-opacity ${a.active ? "border-white/10" : "border-white/5 opacity-60"}`}>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border shrink-0 mt-0.5 ${SEV_STYLE[a.severity]}`}>{a.severity}</span>
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold mb-1.5">{a.title}</div>
                <div className="text-slate-400 text-sm leading-relaxed">{a.body}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggle(a)} className={`text-xs font-bold px-3 py-2 rounded-lg border transition-colors ${
                  a.active
                    ? "border-emerald-500/30 text-emerald-400 hover:border-red-400/30 hover:text-red-400"
                    : "border-white/10 text-slate-500 hover:border-emerald-400/30 hover:text-emerald-400"
                }`}>
                  {a.active ? "Active" : "Inactive"}
                </button>
                <button onClick={() => del(a.id)} className="text-slate-600 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-400/5">
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

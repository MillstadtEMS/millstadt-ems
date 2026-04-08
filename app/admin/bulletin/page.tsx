"use client";

import { useEffect, useState } from "react";

interface Post {
  id: string; author: string; title: string; body: string;
  category: string; approved: boolean; createdAt: string;
}

const CATEGORIES = ["General","Events","Safety","Lost & Found","For Sale","Volunteer"];

const CAT_COLORS: Record<string, string> = {
  General:      "text-slate-400 bg-slate-400/10 border-slate-400/20",
  Events:       "text-blue-400 bg-blue-400/10 border-blue-400/20",
  Safety:       "text-red-400 bg-red-400/10 border-red-400/20",
  "Lost & Found":"text-amber-400 bg-amber-400/10 border-amber-400/20",
  "For Sale":   "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Volunteer:    "text-purple-400 bg-purple-400/10 border-purple-400/20",
};

const blankPost = { author: "Millstadt EMS", title: "", body: "", category: "General" };

export default function BulletinAdmin() {
  const [items, setItems]   = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<"all"|"pending"|"approved">("pending");
  const [form,    setForm]    = useState(blankPost);
  const [saving,  setSaving]  = useState(false);

  async function load() {
    const r = await fetch("/api/admin/bulletin");
    setItems(await r.json()); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function approve(p: Post) {
    await fetch("/api/admin/bulletin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, approved: !p.approved }) });
    await load();
  }

  async function del(id: string) {
    if (!confirm("Delete this post?")) return;
    await fetch("/api/admin/bulletin", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  }

  async function createPost() {
    if (!form.title || !form.body) return;
    setSaving(true);
    await fetch("/api/admin/bulletin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, approved: true }),
    });
    setForm(blankPost);
    setFilter("approved");
    await load();
    setSaving(false);
  }

  const pending  = items.filter(p => !p.approved);
  const approved = items.filter(p => p.approved);
  const shown    = filter === "all" ? items : filter === "pending" ? pending : approved;

  return (
    <div className="max-w-3xl">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white">Bulletin Board</h1>
          <p className="text-slate-500 text-sm mt-1">Review community posts or publish staff announcements.</p>
        </div>
        {pending.length > 0 && (
          <div className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-amber-400 text-sm font-bold">{pending.length} pending review</span>
          </div>
        )}
      </div>

      {/* Create staff post */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-6 mb-8">
        <h2 className="text-white font-bold mb-5 text-sm uppercase tracking-widest">Post as Staff</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-slate-500 text-xs uppercase tracking-widest font-bold block mb-1.5">Author</label>
            <input value={form.author} onChange={e => setForm(f => ({...f, author: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-[#f0b429]/40 text-sm" placeholder="Millstadt EMS" />
          </div>
          <div>
            <label className="text-slate-500 text-xs uppercase tracking-widest font-bold block mb-1.5">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-[#f0b429]/40 text-sm">
              {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#020810]">{c}</option>)}
            </select>
          </div>
        </div>
        <div className="mb-4">
          <label className="text-slate-500 text-xs uppercase tracking-widest font-bold block mb-1.5">Title</label>
          <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-[#f0b429]/40 text-sm" placeholder="Blood drive this Saturday…" />
        </div>
        <div className="mb-4">
          <label className="text-slate-500 text-xs uppercase tracking-widest font-bold block mb-1.5">Message</label>
          <textarea value={form.body} onChange={e => setForm(f => ({...f, body: e.target.value}))} rows={3} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-[#f0b429]/40 text-sm resize-none" placeholder="Details…" />
        </div>
        <button onClick={createPost} disabled={saving || !form.title || !form.body} className="bg-[#f0b429] hover:bg-[#f5c842] disabled:opacity-40 text-[#020810] font-black px-6 py-2.5 rounded-lg text-sm transition-colors">
          {saving ? "Posting…" : "Publish Post"}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["pending","approved","all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-colors ${filter === f ? "bg-[#f0b429]/10 text-[#f0b429] border border-[#f0b429]/20" : "text-slate-500 hover:text-white border border-transparent"}`}>
            {f} {f === "pending" ? `(${pending.length})` : f === "approved" ? `(${approved.length})` : `(${items.length})`}
          </button>
        ))}
      </div>

      {loading ? <div className="text-slate-600 text-sm">Loading…</div> : shown.length === 0 ? (
        <div className="text-center py-16 text-slate-600">No posts in this view.</div>
      ) : (
        <div className="space-y-3">
          {shown.map(p => (
            <div key={p.id} className={`border rounded-xl p-5 ${p.approved ? "bg-white/3 border-white/8" : "bg-amber-400/3 border-amber-400/15"}`}>
              <div className="flex gap-3 items-start flex-wrap mb-2">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border shrink-0 ${CAT_COLORS[p.category] ?? CAT_COLORS["General"]}`}>{p.category}</span>
                <span className="text-white font-bold text-sm">{p.title}</span>
                <span className="text-slate-500 text-xs ml-auto">{p.author} · {new Date(p.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">{p.body}</p>
              <div className="flex gap-2">
                <button onClick={() => approve(p)} className={`text-xs font-bold px-4 py-2 rounded-lg border transition-colors ${p.approved ? "border-slate-500/30 text-slate-400 hover:bg-red-400/10 hover:text-red-400 hover:border-red-400/30" : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-400/10"}`}>
                  {p.approved ? "Unapprove" : "✓ Approve"}
                </button>
                <button onClick={() => del(p.id)} className="text-xs font-bold px-4 py-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-400/10 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

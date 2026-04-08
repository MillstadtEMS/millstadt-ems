"use client";

import { useEffect, useState } from "react";

interface Post {
  id: string; author: string; title: string; body: string;
  category: string; approved: boolean; createdAt: string;
}

const blank = { author: "Millstadt Ambulance Service", title: "", body: "" };
const inp   = "w-full bg-[#040d1a] border border-white/15 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#f0b429]/50 placeholder:text-slate-600 transition-colors";
const lbl   = "block text-slate-300 text-sm font-semibold mb-2";

export default function BulletinAdmin() {
  const [items, setItems]     = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState(blank);
  const [saving, setSaving]   = useState(false);

  async function load() {
    const r = await fetch("/api/admin/bulletin");
    setItems(await r.json()); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function createPost() {
    if (!form.title || !form.body) return;
    setSaving(true);
    await fetch("/api/admin/bulletin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, category: "Official", approved: true }),
    });
    setForm(blank);
    await load();
    setSaving(false);
  }

  async function del(id: string) {
    if (!confirm("Delete this post?")) return;
    await fetch("/api/admin/bulletin", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  }

  const published = items.filter(p => p.approved);

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2"><span className="h-px w-8 bg-[#f0b429]" /><span className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase">Official</span></div>
        <h1 className="text-3xl font-black text-white">Bulletin Board</h1>
        <p className="text-slate-400 text-sm mt-1.5">Post official updates from Millstadt Ambulance Service to the public board.</p>
      </div>

      {/* Create post */}
      <div className="bg-[#071428] border border-white/10 rounded-2xl p-7 mb-8">
        <h2 className="text-white font-black text-lg mb-6">New Post</h2>
        <div className="space-y-5">
          <div>
            <label className={lbl}>Posted By</label>
            <input value={form.author} onChange={e => setForm(f => ({...f, author: e.target.value}))} className={inp} placeholder="Millstadt Ambulance Service" />
          </div>
          <div>
            <label className={lbl}>Title</label>
            <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} className={inp} placeholder="Blood drive this Saturday…" />
          </div>
          <div>
            <label className={lbl}>Message</label>
            <textarea value={form.body} onChange={e => setForm(f => ({...f, body: e.target.value}))} rows={5} className={`${inp} resize-none`} placeholder="Details about the post…" />
          </div>
        </div>
        <button onClick={createPost} disabled={saving || !form.title || !form.body} className="mt-6 bg-[#f0b429] hover:bg-[#f5c842] disabled:opacity-40 text-[#020810] font-black px-8 py-3 rounded-xl text-sm transition-colors">
          {saving ? "Publishing…" : "Publish to Board"}
        </button>
      </div>

      {/* Published posts */}
      <div className="flex items-center gap-3 mb-5">
        <span className="h-px w-8 bg-[#f0b429]" />
        <span className="text-slate-400 text-sm font-semibold">{published.length} published post{published.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm py-10 text-center">Loading…</div>
      ) : published.length === 0 ? (
        <div className="bg-[#071428] border border-white/10 rounded-2xl p-12 text-center text-slate-500 text-sm">No posts yet.</div>
      ) : (
        <div className="space-y-3">
          {published.map(p => (
            <div key={p.id} className="bg-[#071428] border border-white/10 rounded-2xl p-6">
              <div className="flex items-start gap-3 mb-2">
                <div className="flex-1">
                  <div className="text-white font-bold mb-0.5">{p.title}</div>
                  <div className="text-slate-500 text-xs">{p.author} · {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                </div>
                <button onClick={() => del(p.id)} className="text-slate-600 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-400/5">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

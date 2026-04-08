"use client";

import { useEffect, useState } from "react";
import type { Metadata } from "next";

interface Post {
  id: string; author: string; title: string; body: string;
  category: string; createdAt: string;
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

const blankForm = { author: "", title: "", body: "", category: "General" };

export default function BulletinPage() {
  const [posts, setPosts]       = useState<Post[]>([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState(blankForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [filter, setFilter]         = useState("All");

  async function load() {
    const r = await fetch("/api/bulletin");
    setPosts(await r.json()); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/bulletin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSubmitting(false); setSubmitted(true); setForm(blankForm); setShowForm(false);
    setTimeout(() => setSubmitted(false), 5000);
  }

  const shown = filter === "All" ? posts : posts.filter(p => p.category === filter);

  return (
    <>
      {/* Header */}
      <section className="pt-16 pb-20 bg-gradient-to-b from-[#071428] to-[#040d1a] border-b border-white/5">
        <div className="wrap">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Community</span>
          </div>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">Bulletin Board</h1>
              <p className="text-slate-400 mt-3 max-w-lg">Community posts, updates, and announcements from Millstadt residents. All posts are reviewed before going live.</p>
            </div>
            <button
              onClick={() => setShowForm(v => !v)}
              className="bg-[#f0b429] hover:bg-[#f5c842] text-[#040d1a] font-black px-6 py-3 rounded-xl text-sm transition-colors flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              Post a Message
            </button>
          </div>
        </div>
      </section>

      {/* Submit form */}
      {showForm && (
        <section className="py-10 bg-[#071428] border-b border-white/5">
          <div className="wrap max-w-2xl">
            {submitted ? (
              <div className="flex items-center gap-3 bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-5 py-4">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-emerald-400 shrink-0"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                <span className="text-emerald-400 font-bold">Post submitted! It will appear after review.</span>
              </div>
            ) : (
              <form onSubmit={submit} className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-4">
                <h2 className="text-white font-black text-lg mb-2">New Post</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-500 text-xs uppercase tracking-widest font-bold block mb-1.5">Your Name</label>
                    <input required value={form.author} onChange={e => setForm(f => ({...f, author: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-[#f0b429]/40 text-sm" placeholder="Jane Smith" />
                  </div>
                  <div>
                    <label className="text-slate-500 text-xs uppercase tracking-widest font-bold block mb-1.5">Category</label>
                    <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-[#f0b429]/40 text-sm">
                      {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#040d1a]">{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-slate-500 text-xs uppercase tracking-widest font-bold block mb-1.5">Title</label>
                  <input required value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-[#f0b429]/40 text-sm" placeholder="Community yard sale this Saturday" />
                </div>
                <div>
                  <label className="text-slate-500 text-xs uppercase tracking-widest font-bold block mb-1.5">Message</label>
                  <textarea required value={form.body} onChange={e => setForm(f => ({...f, body: e.target.value}))} rows={4} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-[#f0b429]/40 text-sm resize-none" placeholder="Write your message here…" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={submitting} className="bg-[#f0b429] hover:bg-[#f5c842] disabled:opacity-50 text-[#040d1a] font-black px-6 py-3 rounded-lg text-sm transition-colors">
                    {submitting ? "Submitting…" : "Submit Post"}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="border border-white/10 text-slate-400 hover:text-white px-6 py-3 rounded-lg text-sm transition-colors">
                    Cancel
                  </button>
                </div>
                <p className="text-slate-600 text-xs">Posts are reviewed by staff before appearing publicly.</p>
              </form>
            )}
          </div>
        </section>
      )}

      {/* Filter tabs */}
      <section className="py-8 bg-[#040d1a]">
        <div className="wrap">
          <div className="flex flex-wrap gap-2 mb-8">
            {["All", ...CATEGORIES].map(cat => (
              <button key={cat} onClick={() => setFilter(cat)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors border ${filter === cat ? "bg-[#f0b429]/10 text-[#f0b429] border-[#f0b429]/20" : "text-slate-500 border-transparent hover:text-white hover:border-white/10"}`}>
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-4">{[0,1,2].map(i => <div key={i} className="h-28 rounded-xl bg-white/3 animate-pulse" />)}</div>
          ) : shown.length === 0 ? (
            <div className="text-center py-20 text-slate-600">
              <svg viewBox="0 0 24 24" className="w-12 h-12 fill-current mx-auto mb-3 opacity-30"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
              No posts yet. Be the first to post!
            </div>
          ) : (
            <div className="space-y-4">
              {shown.map(p => (
                <div key={p.id} className="bg-white/3 border border-white/8 rounded-xl p-6">
                  <div className="flex items-center gap-3 flex-wrap mb-3">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border ${CAT_COLORS[p.category] ?? CAT_COLORS["General"]}`}>{p.category}</span>
                    <h3 className="text-white font-bold">{p.title}</h3>
                    <span className="text-slate-600 text-xs ml-auto">{p.author} · {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <div className="h-24 bg-[#040d1a]" />
    </>
  );
}

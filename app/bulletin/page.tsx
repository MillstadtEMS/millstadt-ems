"use client";

import { useEffect, useState } from "react";

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

export default function BulletinPage() {
  const [posts, setPosts]   = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("All");

  useEffect(() => {
    fetch("/api/bulletin")
      .then(r => r.json())
      .then(data => { setPosts(data); setLoading(false); });
  }, []);

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
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">Bulletin Board</h1>
          <p className="text-slate-400 mt-3">Posts and updates from Millstadt Ambulance Service.</p>
        </div>
      </section>

      {/* Posts */}
      <section className="py-12 bg-[#040d1a]">
        <div className="wrap">
          {/* Filter tabs */}
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
            <div className="text-center py-24 text-slate-600">
              <svg viewBox="0 0 24 24" className="w-12 h-12 fill-current mx-auto mb-3 opacity-30"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
              No posts yet.
            </div>
          ) : (
            <div className="space-y-4">
              {shown.map(p => (
                <div key={p.id} className="bg-white/3 border border-white/8 rounded-xl p-6">
                  <div className="flex items-center gap-3 flex-wrap mb-3">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border ${CAT_COLORS[p.category] ?? CAT_COLORS["General"]}`}>{p.category}</span>
                    <h3 className="text-white font-bold">{p.title}</h3>
                    <span className="text-slate-600 text-xs ml-auto">{new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
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

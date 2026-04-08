"use client";

import { useEffect, useState } from "react";

interface Post {
  id: string; author: string; title: string; body: string;
  category: string; createdAt: string;
}

export default function BulletinPage() {
  const [posts, setPosts]     = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bulletin")
      .then(r => r.json())
      .then(data => { setPosts(data); setLoading(false); });
  }, []);

  return (
    <>
      {/* Header */}
      <section className="pt-16 pb-20 bg-gradient-to-b from-[#071428] to-[#040d1a] border-b border-white/5">
        <div className="wrap">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Official Posts</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">Bulletin Board</h1>
          <p className="text-slate-400 mt-3 text-lg">Official posts and updates from Millstadt Ambulance Service.</p>
        </div>
      </section>

      {/* Posts */}
      <section className="py-12 bg-[#040d1a]">
        <div className="wrap max-w-3xl">
          {loading ? (
            <div className="space-y-4">{[0,1,2].map(i => <div key={i} className="h-28 rounded-xl bg-[#071428] animate-pulse" />)}</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-24">
              <svg viewBox="0 0 24 24" className="w-12 h-12 fill-current mx-auto mb-3 text-slate-700"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
              <p className="text-slate-600 font-bold">No posts yet.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {posts.map(p => (
                <div key={p.id} className="bg-[#071428] border border-white/10 rounded-2xl p-7">
                  <div className="flex items-center gap-3 flex-wrap mb-3">
                    <span className="text-[#f0b429] text-[10px] font-black uppercase tracking-widest bg-[#f0b429]/10 border border-[#f0b429]/20 px-2.5 py-1 rounded-lg">Millstadt EMS</span>
                    <span className="text-slate-500 text-xs ml-auto">{new Date(p.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                  </div>
                  <h3 className="text-white font-black text-lg mb-2">{p.title}</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">{p.body}</p>
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

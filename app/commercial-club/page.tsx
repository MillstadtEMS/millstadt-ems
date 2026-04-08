"use client";

import { useEffect, useState } from "react";

const MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];

export default function CommercialClubPage() {
  const now = new Date();
  const [month, setMonth] = useState(MONTHS[now.getMonth()]);
  const [year,  setYear]  = useState(String(now.getFullYear()));
  const [url,   setUrl]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/commercial-club/docs?month=${month}&year=${year}`)
      .then(r => r.json())
      .then(d => { setUrl(d.url ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [month, year]);

  const displayMonth = month.charAt(0).toUpperCase() + month.slice(1);

  return (
    <>
      <section className="pt-16 pb-16 bg-gradient-to-b from-[#071428] to-[#040d1a] border-b border-white/5">
        <div className="wrap">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Community</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white leading-tight mb-4">
            Commercial Club<br />
            <span className="text-[#f0b429]">Newsletter</span>
          </h1>
          <p className="text-slate-400 text-lg">The latest news and updates from the Millstadt Commercial Club.</p>
        </div>
      </section>

      <section className="py-14 bg-[#040d1a]">
        <div className="wrap max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-[#f0b429]" />
              <span className="text-white font-black text-2xl">{displayMonth} {year}</span>
            </div>
            <div className="flex gap-3">
              <select value={month} onChange={e => setMonth(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#f0b429]/50 capitalize">
                {MONTHS.map(m => <option key={m} value={m} className="bg-[#040d1a]">{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
              </select>
              <select value={year} onChange={e => setYear(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#f0b429]/50">
                {["2025","2026","2027"].map(y => <option key={y} value={y} className="bg-[#040d1a]">{y}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="h-48 rounded-2xl bg-white/3 animate-pulse" />
          ) : url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-6 bg-gradient-to-br from-emerald-600/15 to-emerald-900/10 border border-emerald-500/20 hover:border-emerald-400/40 rounded-2xl p-8 transition-all hover:scale-[1.01]"
            >
              <svg viewBox="0 0 24 24" className="w-12 h-12 fill-current text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
                <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/>
              </svg>
              <div>
                <div className="text-white font-black text-xl mb-1">Commercial Club Newsletter</div>
                <div className="text-slate-400 text-sm">{displayMonth} {year} · PDF Document</div>
                <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-bold mt-3">
                  Open PDF
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current group-hover:translate-x-1 transition-transform"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
                </div>
              </div>
            </a>
          ) : (
            <div className="text-center py-20 border border-white/6 rounded-2xl">
              <div className="text-4xl mb-4">📰</div>
              <p className="text-slate-500 font-bold">No newsletter posted yet for {displayMonth} {year}.</p>
              <p className="text-slate-700 text-sm mt-2">Check back soon or select a different month.</p>
            </div>
          )}
        </div>
      </section>
      <div className="h-24 bg-[#040d1a]" />
    </>
  );
}

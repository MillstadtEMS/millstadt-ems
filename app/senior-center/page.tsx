"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const MONTHS = [
  "january","february","march","april","may","june",
  "july","august","september","october","november","december",
];

const DOC_CONFIG = [
  {
    type: "menu",
    title: "Monthly Menu",
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current"><path d="M18.06 22.99h1.66c.84 0 1.53-.64 1.63-1.46L23 5.05h-5V1h-1.97v4.05h-4.97l.3 2.34c1.71.47 3.31 1.32 4.27 2.26 1.44 1.42 2.43 2.89 2.43 5.29v8.05zM1 21.99V21h15.03v.99c0 .55-.45 1-1.01 1H2.01c-.56 0-1.01-.45-1.01-1zm15.03-7c0-8-15.03-8-15.03 0h15.03zM1.02 17h15v2h-15z"/></svg>
    ),
    color: "from-amber-600/20 to-amber-900/10",
    border: "border-amber-500/20 hover:border-amber-400/40",
    iconColor: "text-amber-400",
    label: "View Menu",
  },
  {
    type: "activities",
    title: "Activities",
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
    ),
    color: "from-emerald-600/20 to-emerald-900/10",
    border: "border-emerald-500/20 hover:border-emerald-400/40",
    iconColor: "text-emerald-400",
    label: "View Activities",
  },
  {
    type: "newsletter",
    title: "Newsletter",
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
    ),
    color: "from-blue-600/20 to-blue-900/10",
    border: "border-blue-500/20 hover:border-blue-400/40",
    iconColor: "text-blue-400",
    label: "View Newsletter",
  },
];

export default function SeniorCenterPage() {
  const now = new Date();
  const [month, setMonth] = useState(MONTHS[now.getMonth()]);
  const [year,  setYear]  = useState(String(now.getFullYear()));
  const [docs,  setDocs]  = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/senior-center/docs?month=${month}&year=${year}`)
      .then(r => r.json())
      .then(data => { setDocs(data.docs ?? {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, [month, year]);

  const displayMonth = month.charAt(0).toUpperCase() + month.slice(1);

  return (
    <>
      {/* ── Hero photos ── */}
      <section className="relative overflow-hidden">
        <div className="grid md:grid-cols-2" style={{ minHeight: 380 }}>
          <div className="relative min-h-[200px]">
            <Image src="/images/senior-center-1.jpg" alt="Millstadt Senior Center" fill className="object-cover" priority sizes="(max-width: 768px) 100vw, 50vw" />
            <div className="absolute inset-0 bg-[#040d1a]/30" />
          </div>
          <div className="relative min-h-[200px]">
            <Image src="/images/senior-center-2.jpg" alt="Millstadt Senior Center" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
            <div className="absolute inset-0 bg-[#040d1a]/30" />
          </div>
          {/* Title overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center px-4">
              <div className="inline-block bg-[#040d1a]/75 backdrop-blur-sm rounded-2xl px-8 py-6 border border-white/10">
                <p className="text-[#f0b429] text-xs font-black tracking-[0.3em] uppercase mb-3">Millstadt, Illinois</p>
                <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
                  Senior Center
                </h1>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Documents ── */}
      <section className="py-16 bg-[#040d1a]">
        <div className="wrap">

          {/* Month picker */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-[#f0b429]" />
              <span className="text-white font-black text-2xl">{displayMonth} {year}</span>
            </div>
            <div className="flex gap-3">
              <select
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#f0b429]/50 capitalize"
              >
                {MONTHS.map(m => (
                  <option key={m} value={m} className="bg-[#040d1a]">{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
              <select
                value={year}
                onChange={e => setYear(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#f0b429]/50"
              >
                {["2026","2027","2028"].map(y => <option key={y} value={y} className="bg-[#040d1a]">{y}</option>)}
              </select>
            </div>
          </div>

          {/* Cards */}
          {loading ? (
            <div className="grid sm:grid-cols-3 gap-6">
              {[0,1,2].map(i => <div key={i} className="rounded-2xl bg-white/4 border border-white/8 h-48 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-6">
              {DOC_CONFIG.map(doc => {
                const url = docs[doc.type];
                return url ? (
                  <a
                    key={doc.type}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group bg-gradient-to-br ${doc.color} border ${doc.border} rounded-2xl p-8 flex flex-col items-center text-center gap-5 hover:scale-[1.02] transition-all duration-200`}
                  >
                    <div className={`${doc.iconColor} group-hover:scale-110 transition-transform`}>{doc.icon}</div>
                    <div>
                      <div className="text-white font-black text-xl mb-1">{doc.title}</div>
                      <div className="text-slate-400 text-sm">{displayMonth} {year}</div>
                    </div>
                    <div className={`flex items-center gap-2 ${doc.iconColor} text-sm font-bold mt-auto`}>
                      {doc.label}
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current group-hover:translate-x-1 transition-transform"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
                    </div>
                  </a>
                ) : (
                  <div key={doc.type} className={`bg-gradient-to-br ${doc.color} border ${doc.border} rounded-2xl p-8 flex flex-col items-center text-center gap-5 opacity-40`}>
                    <div className={doc.iconColor}>{doc.icon}</div>
                    <div>
                      <div className="text-white font-black text-xl mb-1">{doc.title}</div>
                      <div className="text-slate-500 text-sm">Not yet posted</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <div className="h-24 bg-[#040d1a]" />
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const LOCATIONS = [
  {
    id: "backstock",
    name: "Backstock",
    desc: "Station supply shelves A–E, medications, housekeeping, office",
    href: "/inventory/backstock",
    ready: true,
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current"><path d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z"/></svg>
    ),
  },
  {
    id: "m3935",
    name: "M3935",
    desc: "Paramedic Unit — 2025 Ford E450 Demers",
    href: "/inventory/m3935",
    ready: false,
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
    ),
  },
  {
    id: "m3926",
    name: "M3926",
    desc: "ALS Upgradeable — Demers F350",
    href: "/inventory/m3926",
    ready: false,
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
    ),
  },
  {
    id: "m3925",
    name: "M3925",
    desc: "Reserve Unit — Demers Sprinter Van",
    href: "/inventory/m3925",
    ready: false,
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
    ),
  },
];

export default function InventoryMenu() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/inventory/items").then(r => {
      if (r.ok) setAuthed(true);
      else { setAuthed(false); router.push("/inventory/login"); }
    }).catch(() => { setAuthed(false); router.push("/inventory/login"); });
  }, [router]);

  if (authed === null) return <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950"><div className="text-slate-400 animate-pulse">Loading...</div></div>;
  if (!authed) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>

      {/* Header */}
      <header className="shrink-0 bg-slate-900 border-b border-slate-700">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-yellow-400"><path d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z"/></svg>
            </div>
            <div>
              <div className="text-white font-black text-lg leading-none">Inventory</div>
              <div className="text-yellow-400/60 text-[10px] font-bold uppercase tracking-widest mt-0.5">Millstadt EMS</div>
            </div>
          </div>
          <button onClick={async () => { await fetch("/api/inventory/logout", { method: "POST" }); router.push("/inventory/login"); }}
            className="h-9 w-9 rounded-xl bg-slate-800 text-slate-500 active:text-red-400 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
          </button>
        </div>
      </header>

      {/* Menu */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-lg">
          <h2 className="text-white text-xl font-black text-center mb-2">Where would you like to perform an inventory?</h2>
          <p className="text-slate-500 text-sm text-center mb-8">Select a location to begin counting</p>

          <div className="space-y-3">
            {LOCATIONS.map(loc => (
              <button
                key={loc.id}
                onClick={() => loc.ready ? router.push(loc.href) : null}
                disabled={!loc.ready}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border text-left transition ${
                  loc.ready
                    ? "bg-slate-900 border-slate-700 hover:bg-slate-800 active:bg-slate-800 hover:border-yellow-500/30 cursor-pointer"
                    : "bg-slate-900/50 border-slate-800 cursor-not-allowed opacity-60"
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${loc.ready ? "bg-yellow-500/15 text-yellow-400" : "bg-slate-800 text-slate-600"}`}>
                  {loc.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-base font-black ${loc.ready ? "text-white" : "text-slate-500"}`}>{loc.name}</span>
                    {!loc.ready && <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">Coming Soon</span>}
                  </div>
                  <div className="text-slate-400 text-sm mt-0.5">{loc.desc}</div>
                </div>
                {loc.ready && (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-slate-600 shrink-0"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

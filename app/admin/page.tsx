"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Stats {
  testimonials: number;
  pendingBulletin: number;
  activeAnnouncements: number;
  callsThisYear: number;
  lastCall: string | null;
}

const cards = [
  { label: "Announcements", href: "/admin/announcements", color: "border-amber-500/30 bg-amber-500/5", icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-amber-400"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>, desc: "Site-wide alerts shown to all visitors" },
  { label: "Bulletin Board", href: "/admin/bulletin", color: "border-blue-500/30 bg-blue-500/5", icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-blue-400"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>, desc: "Approve or remove community posts" },
  { label: "Testimonials", href: "/admin/testimonials", color: "border-purple-500/30 bg-purple-500/5", icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-purple-400"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z"/></svg>, desc: "Add, edit, or hide community testimonials" },
  { label: "Senior Center", href: "/admin/senior-center", color: "border-emerald-500/30 bg-emerald-500/5", icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-emerald-400"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/></svg>, desc: "Upload monthly menu, activities & newsletter" },
  { label: "Call Log", href: "/admin/calls", color: "border-red-500/30 bg-red-500/5", icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-red-400"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>, desc: "Review and manage CAD dispatch entries" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/testimonials").then(r => r.json()).catch(() => []),
      fetch("/api/admin/bulletin").then(r => r.json()).catch(() => []),
      fetch("/api/admin/announcements").then(r => r.json()).catch(() => []),
      fetch("/api/cad/log").then(r => r.json()).catch(() => []),
    ]).then(([t, b, a, c]) => {
      setStats({
        testimonials: Array.isArray(t) ? t.length : 0,
        pendingBulletin: Array.isArray(b) ? b.filter((p: {approved: boolean}) => !p.approved).length : 0,
        activeAnnouncements: Array.isArray(a) ? a.filter((x: {active: boolean}) => x.active).length : 0,
        callsThisYear: Array.isArray(c) ? c.length : 0,
        lastCall: Array.isArray(c) && c.length > 0 ? c[0].dispatchNature : null,
      });
    });
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Millstadt Ambulance Service — Site Control</p>
      </div>

      {/* Stat pills */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Testimonials", value: stats.testimonials, color: "text-purple-400" },
            { label: "Pending Posts", value: stats.pendingBulletin, color: stats.pendingBulletin > 0 ? "text-amber-400" : "text-slate-400" },
            { label: "Active Alerts", value: stats.activeAnnouncements, color: stats.activeAnnouncements > 0 ? "text-red-400" : "text-slate-400" },
            { label: `Calls ${new Date().getFullYear()}`, value: stats.callsThisYear, color: "text-emerald-400" },
          ].map(s => (
            <div key={s.label} className="bg-white/3 border border-white/8 rounded-xl p-4">
              <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-slate-500 text-xs mt-1 uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Section cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map(c => (
          <Link
            key={c.href}
            href={c.href}
            className={`group border ${c.color} rounded-2xl p-6 flex gap-4 items-start hover:scale-[1.01] transition-all duration-150`}
          >
            <div className="shrink-0 mt-0.5">{c.icon}</div>
            <div>
              <div className="text-white font-bold text-base mb-1">{c.label}</div>
              <div className="text-slate-500 text-sm leading-relaxed">{c.desc}</div>
            </div>
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-slate-700 group-hover:text-slate-400 transition-colors shrink-0 mt-1 ml-auto">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}

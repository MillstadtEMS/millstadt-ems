"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Stats {
  testimonials: number;
  pendingBulletin: number;
  activeAnnouncements: number;
  callsThisYear: number;
  unreadSubmissions: number;
  inventoryItems: number;
  lowStock: number;
  expiredItems: number;
}

const SECTIONS = [
  {
    label: "Announcements",
    href: "/admin/announcements",
    desc: "Site-wide banners shown to all visitors",
    accent: "border-amber-500/40 bg-amber-500/8",
    iconColor: "text-amber-400",
    icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>,
  },
  {
    label: "Bulletin Board",
    href: "/admin/bulletin",
    desc: "Review and approve community posts",
    accent: "border-blue-500/40 bg-blue-500/8",
    iconColor: "text-blue-400",
    icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>,
  },
  {
    label: "Testimonials",
    href: "/admin/testimonials",
    desc: "Add, edit, or hide community reviews",
    accent: "border-purple-500/40 bg-purple-500/8",
    iconColor: "text-purple-400",
    icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z"/></svg>,
  },
  {
    label: "Form Submissions",
    href: "/admin/submissions",
    desc: "View all submitted forms from the website",
    accent: "border-[#f0b429]/40 bg-[#f0b429]/8",
    iconColor: "text-[#f0b429]",
    icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>,
  },
  {
    label: "Image Manager",
    href: "/admin/media",
    desc: "Upload and replace images across the site",
    accent: "border-teal-500/40 bg-teal-500/8",
    iconColor: "text-teal-400",
    icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>,
  },
  {
    label: "Senior Center",
    href: "/admin/senior-center",
    desc: "Upload monthly menu, activities & newsletter",
    accent: "border-emerald-500/40 bg-emerald-500/8",
    iconColor: "text-emerald-400",
    icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/></svg>,
  },
  {
    label: "Commercial Club",
    href: "/admin/commercial-club",
    desc: "Manage Commercial Club newsletters & PDFs",
    accent: "border-orange-500/40 bg-orange-500/8",
    iconColor: "text-orange-400",
    icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M20 6h-2.18c.07-.44.18-.88.18-1 0-2.21-1.79-4-4-4s-4 1.79-4 4c0 .12.11.56.18 1H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg>,
  },
  {
    label: "Call Log",
    href: "/admin/calls",
    desc: "Review and manage CAD dispatch entries",
    accent: "border-red-500/40 bg-red-500/8",
    iconColor: "text-red-400",
    icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>,
  },
  {
    label: "Visual Editor",
    href: "/admin/visual-editor",
    desc: "Edit site content visually without touching code",
    accent: "border-[#f0b429]/50 bg-[#f0b429]/10",
    iconColor: "text-[#f0b429]",
    icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>,
  },
  {
    label: "Inventory Reports",
    href: "/admin/inventory-reports",
    desc: "Generate PDF reports, view audit log & history",
    accent: "border-cyan-500/40 bg-cyan-500/8",
    iconColor: "text-cyan-400",
    icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z"/></svg>,
  },
  {
    label: "Inventory Settings",
    href: "/admin/inventory-settings",
    desc: "Manage password, QR codes, and seed inventory data",
    accent: "border-cyan-500/40 bg-cyan-500/8",
    iconColor: "text-cyan-400",
    icon: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>,
  },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/testimonials").then(r => r.json()).catch(() => []),
      fetch("/api/admin/bulletin").then(r => r.json()).catch(() => []),
      fetch("/api/admin/announcements").then(r => r.json()).catch(() => []),
      fetch("/api/cad/log").then(r => r.json()).catch(() => []),
      fetch("/api/admin/submissions").then(r => r.json()).catch(() => []),
      fetch("/api/inventory/items").then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([t, b, a, c, s, inv]) => {
      const invItems = Array.isArray(inv) ? inv : [];
      setStats({
        testimonials: Array.isArray(t) ? t.length : 0,
        pendingBulletin: Array.isArray(b) ? b.filter((p: { approved: boolean }) => !p.approved).length : 0,
        activeAnnouncements: Array.isArray(a) ? a.filter((x: { active: boolean }) => x.active).length : 0,
        callsThisYear: Array.isArray(c) ? c.length : 0,
        unreadSubmissions: Array.isArray(s) ? s.reduce((n: number, cat: { unread: number }) => n + cat.unread, 0) : 0,
        inventoryItems: invItems.length,
        lowStock: invItems.filter((i: { qtyToOrder: number; skipOrder: boolean }) => i.qtyToOrder > 0 && !i.skipOrder).length,
        expiredItems: invItems.filter((i: { expiredQty: number }) => i.expiredQty > 0).length,
      });
    });
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <span className="h-px w-8 bg-[#f0b429]" />
          <span className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase">Admin</span>
        </div>
        <h1 className="text-3xl font-black text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1.5">Millstadt Ambulance Service — Site Control</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          {[
            { label: "Testimonials",     value: stats.testimonials,        color: "text-purple-300" },
            { label: "Pending Posts",    value: stats.pendingBulletin,     color: stats.pendingBulletin > 0 ? "text-amber-300" : "text-slate-300" },
            { label: "Active Alerts",    value: stats.activeAnnouncements, color: stats.activeAnnouncements > 0 ? "text-red-300" : "text-slate-300" },
            { label: "Unread Forms",     value: stats.unreadSubmissions,   color: stats.unreadSubmissions > 0 ? "text-[#f0b429]" : "text-slate-300" },
            { label: `Calls ${new Date().getFullYear()}`, value: stats.callsThisYear, color: "text-emerald-300" },
            { label: "Inventory Items", value: stats.inventoryItems, color: "text-cyan-300" },
            { label: "Low Stock", value: stats.lowStock, color: stats.lowStock > 0 ? "text-amber-300" : "text-slate-300" },
            { label: "Expired", value: stats.expiredItems, color: stats.expiredItems > 0 ? "text-red-300" : "text-slate-300" },
          ].map(s => (
            <div key={s.label} className="bg-[#071428] border border-white/10 rounded-2xl p-5">
              <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-slate-500 text-xs mt-1.5 font-medium uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Section cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {SECTIONS.map(s => (
          <Link
            key={s.href}
            href={s.href}
            className={`group border ${s.accent} rounded-2xl p-6 flex gap-4 items-start hover:opacity-90 transition-all duration-150`}
          >
            <div className={`shrink-0 mt-0.5 ${s.iconColor}`}>{s.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-base mb-1.5">{s.label}</div>
              <div className="text-slate-400 text-sm leading-relaxed">{s.desc}</div>
            </div>
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-slate-600 group-hover:text-slate-300 transition-colors shrink-0 mt-1">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}

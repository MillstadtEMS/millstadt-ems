"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV = [
  {
    label: "Overview",
    href: "/admin",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
      </svg>
    ),
  },
  {
    label: "Announcements",
    href: "/admin/announcements",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
      </svg>
    ),
  },
  {
    label: "Bulletin Board",
    href: "/admin/bulletin",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/>
      </svg>
    ),
  },
  {
    label: "Testimonials",
    href: "/admin/testimonials",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z"/>
      </svg>
    ),
  },
  {
    label: "Senior Center",
    href: "/admin/senior-center",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/>
      </svg>
    ),
  },
  {
    label: "Call Log",
    href: "/admin/calls",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
      </svg>
    ),
  },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [sideOpen, setSideOpen] = useState(false);

  // Don't render shell on login page
  if (pathname === "/admin/login") return <>{children}</>;

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className="min-h-screen bg-[#020810] flex">
      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 bg-[#030c1a] border-r border-white/5 flex flex-col transition-transform duration-300 ${sideOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        {/* Logo */}
        <div className="px-5 py-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#f0b429]/10 border border-[#f0b429]/20 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none">
                <rect x="14" y="2" width="4" height="28" rx="2" fill="white" opacity="0.9"/>
                <rect x="14" y="2" width="4" height="28" rx="2" fill="white" opacity="0.9" transform="rotate(60 16 16)"/>
                <rect x="14" y="2" width="4" height="28" rx="2" fill="white" opacity="0.9" transform="rotate(120 16 16)"/>
                <circle cx="16" cy="16" r="3" fill="#f0b429"/>
              </svg>
            </div>
            <div>
              <div className="text-white font-black text-xs tracking-wider uppercase leading-none">Millstadt EMS</div>
              <div className="text-[#f0b429] text-[9px] tracking-[0.2em] uppercase mt-0.5">Admin Portal</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(item => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSideOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-[#f0b429]/10 text-[#f0b429] border border-[#f0b429]/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className={active ? "text-[#f0b429]" : "text-slate-500"}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-white/5 space-y-1">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
            View Site
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:text-red-400 hover:bg-red-400/5 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sideOpen && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSideOpen(false)} />}

      {/* ── Main content ── */}
      <div className="flex-1 lg:pl-60 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-14 bg-[#020810]/90 backdrop-blur border-b border-white/5 flex items-center px-5 gap-4">
          <button
            onClick={() => setSideOpen(v => !v)}
            className="lg:hidden text-slate-400 hover:text-white transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
          </button>
          <span className="text-slate-400 text-sm font-medium flex-1 truncate">
            {NAV.find(n => n.href === pathname || (n.href !== "/admin" && pathname.startsWith(n.href)))?.label ?? "Admin"}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-slate-500 text-xs">Signed in</span>
          </div>
        </header>

        <main className="flex-1 p-5 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

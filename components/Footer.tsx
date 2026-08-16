"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const footerNav = {
  agency: [
    { href: "/about", label: "Who We Are" },
    { href: "/weather", label: "Local Weather" },
    { href: "/traffic", label: "Traffic" },
    { href: "/fleet", label: "Our Fleet" },
    { href: "/medical-control", label: "Medical Control" },
    { href: "/community-education", label: "Community Education" },
    { href: "/events", label: "Events" },
    { href: "/kids-club", label: "Kids Club" },
  ],
  resources: [
    { href: "/billing", label: "Billing Information" },
    { href: "/financials-information-hub", label: "Financial Information" },
    { href: "/donate", label: "Donate" },
    { href: "/forms", label: "Forms" },
    { href: "/contact", label: "Contact Us" },
  ],
};

// Height of the peek strip that stays visible when the footer is collapsed.
const PEEK = 14;

export default function Footer() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setOpen(false));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <>
      {/* Spacer so page content can scroll to its true bottom without sitting
          underneath the fixed peek strip. */}
      <div aria-hidden style={{ height: PEEK, flexShrink: 0 }} />

      <footer
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
        }}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 40,
          transform: open ? "translateY(0)" : `translateY(calc(100% - ${PEEK}px))`,
          transition: "transform 0.4s cubic-bezier(0.22, 0.61, 0.36, 1)",
          willChange: "transform",
        }}
        className="mems-footer bg-[#040d1a] border-t border-white/5 shadow-[0_-20px_60px_rgba(0,0,0,0.45)]"
      >
        {/* Peek strip — always visible. Click to toggle on touch devices. */}
        <button
          type="button"
          aria-label={open ? "Hide footer" : "Show footer"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          style={{
            display: "block",
            width: "100%",
            height: PEEK,
            padding: 0,
            border: 0,
            cursor: "pointer",
            background:
              "linear-gradient(90deg, #1a3a6e 0%, #f0b429 50%, #1a3a6e 100%)",
            position: "relative",
          }}
        >
          {/* small grabber pill so the peek strip reads as interactive */}
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 40,
              height: 4,
              borderRadius: 2,
              background: "rgba(3, 9, 20, 0.65)",
            }}
          />
        </button>

        <div className="wrap py-10">
          <div className="flex flex-col md:flex-row justify-center gap-10">

            {/* Brand block */}
            <div className="md:w-80 shrink-0">
              <div className="flex items-center gap-3 mb-5">
                <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                  <div className="absolute inset-0 rounded-lg bg-[#1a3a6e] border border-[#2563eb]/40" />
                  <svg viewBox="0 0 32 32" className="relative w-6 h-6" fill="none">
                    <rect x="14" y="2" width="4" height="28" rx="2" fill="white" opacity="0.95"/>
                    <rect x="14" y="2" width="4" height="28" rx="2" fill="white" opacity="0.95" transform="rotate(60 16 16)"/>
                    <rect x="14" y="2" width="4" height="28" rx="2" fill="white" opacity="0.95" transform="rotate(120 16 16)"/>
                    <line x1="16" y1="8" x2="16" y2="24" stroke="#f0b429" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M18 9.5 C20 11 18 13 16 13.5 C14 14 12 15.5 13.5 17.5 C15 19.5 18 20 17 23" stroke="#f0b429" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
                    <circle cx="17" cy="23.2" r="1.1" fill="#f0b429"/>
                  </svg>
                </div>
                <div>
                  <div className="text-white font-black text-sm tracking-wider uppercase">
                    Millstadt Ambulance Service
                  </div>
                  <div className="text-slate-500 text-[9px] tracking-[0.25em] uppercase mt-0.5">
                    Millstadt, Illinois
                  </div>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Providing advanced life support and emergency medical services to Millstadt and surrounding areas since 1980.
              </p>
            </div>

            {/* Agency nav */}
            <div className="md:w-96 shrink-0">
              <div className="text-white font-bold text-xs uppercase tracking-widest mb-5 flex items-center gap-2">
                <span className="w-6 h-px bg-[#f0b429]" />
                Agency
              </div>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-3">
                {footerNav.agency.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-slate-400 hover:text-white text-sm transition-colors inline-flex items-center gap-2 group whitespace-nowrap"
                    >
                      <span className="w-0 group-hover:w-2 h-px bg-[#f0b429] transition-all duration-200 overflow-hidden" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources nav */}
            <div className="md:w-48 shrink-0">
              <div className="text-white font-bold text-xs uppercase tracking-widest mb-5 flex items-center gap-2">
                <span className="w-6 h-px bg-[#f0b429]" />
                Resources
              </div>
              <ul className="space-y-3">
                {footerNav.resources.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-slate-400 hover:text-white text-sm transition-colors inline-flex items-center gap-2 group whitespace-nowrap"
                    >
                      <span className="w-0 group-hover:w-2 h-px bg-[#f0b429] transition-all duration-200 overflow-hidden" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="md:w-48 shrink-0">
              <div className="text-white font-bold text-xs uppercase tracking-widest mb-5 flex items-center gap-2">
                <span className="w-6 h-px bg-[#f0b429]" />
                Contact
              </div>
              <ul className="space-y-4 text-sm text-slate-400">
                <li className="flex items-start gap-2.5">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 mt-0.5 shrink-0 text-[#2563eb] fill-current">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  <span>
                    100 E Laurel St<br />
                    Millstadt, IL 62260
                  </span>
                </li>
                <li>
                  <a
                    href="mailto:millstadtems@gmail.com"
                    className="flex items-center gap-2.5 hover:text-white transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 text-[#2563eb] fill-current">
                      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                    </svg>
                    millstadtems@gmail.com
                  </a>
                </li>
              </ul>
            </div>

          </div>

          {/* Bottom bar */}
          <div className="mt-8 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-600 text-xs">
              &copy; {new Date().getFullYear()} Millstadt Ambulance Service. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot inline-block" />
                <span>Units Active</span>
              </div>
              <span className="text-slate-700 text-xs">·</span>
              <span className="text-slate-600 text-xs">Millstadt, Illinois</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

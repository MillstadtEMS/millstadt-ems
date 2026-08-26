"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Mail, MapPin } from "lucide-react";
import { SITE_BUILD_REVISION, SITE_VERSION } from "@/lib/site-version";

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
    { href: "/financials-information-hub", label: "Financial & Information Transparency" },
    { href: "/election-information", label: "Election Information" },
    { href: "/donate", label: "Donate" },
    { href: "/forms", label: "Forms" },
    { href: "/contact", label: "Contact Us" },
  ],
};

export default function Footer() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setOpen(false));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <footer className="mems-footer border-t border-white/5 bg-[#040d1a]">
      <div className="wrap">
        <div className="grid items-center gap-3 py-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex min-w-0 items-center gap-3">
              <Image
                src="/images/millstadt-ems-footer-logo.png"
                alt=""
                width={64}
                height={64}
                sizes="64px"
                className="h-16 w-16 shrink-0 object-contain"
              />
              <div className="min-w-0">
                <div className="text-sm font-black uppercase tracking-wider text-white">
                  Millstadt Ambulance Service
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Millstadt, Illinois
                </div>
              </div>
            </div>

            <address className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs not-italic text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <MapPin aria-hidden size={15} className="shrink-0 text-[#60a5fa]" />
                100 E Laurel St, Millstadt, IL 62260
              </span>
              <a
                href="mailto:millstadtems@gmail.com"
                className="inline-flex min-h-11 items-center gap-1.5 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0b429]"
              >
                <Mail aria-hidden size={15} className="shrink-0 text-[#60a5fa]" />
                millstadtems@gmail.com
              </a>
            </address>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              aria-label={open ? "Hide footer links and details" : "Show footer links and details"}
              aria-controls="footer-details"
              aria-expanded={open}
              title={open ? "Hide footer details" : "Show footer details"}
              onClick={() => setOpen((value) => !value)}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/15 px-3 text-xs font-bold uppercase text-slate-200 transition-colors hover:border-[#f0b429]/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0b429]"
              style={{ minWidth: 44 }}
            >
              Explore
              <ChevronDown
                aria-hidden
                size={18}
                className={`transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>

        <div
          id="footer-details"
          hidden={!open}
          className="grid gap-4 border-t border-white/8 py-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
        >
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {[...footerNav.agency, ...footerNav.resources].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-11 items-center text-sm text-slate-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0b429]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-2 text-xs text-slate-500 lg:items-end">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <Link
                href="/privacy"
                className="inline-flex min-h-11 items-center transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0b429]"
              >
                Privacy
              </Link>
              <button
                type="button"
                className="inline-flex min-h-11 items-center transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0b429]"
                onClick={() => window.dispatchEvent(new Event("millstadt:open-privacy"))}
              >
                Manage preferences
              </button>
            </div>
            <p>
              &copy; {new Date().getFullYear()} Millstadt Ambulance Service. All rights reserved.
            </p>
            <p aria-label={`Website version ${SITE_VERSION}, build ${SITE_BUILD_REVISION}`}>
              Website v{SITE_VERSION} · build {SITE_BUILD_REVISION}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

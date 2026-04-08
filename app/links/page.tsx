import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Important Links",
  description:
    "Important external links and community resources for Millstadt, Illinois and surrounding areas.",
};

const linkGroups = [
  {
    category: "EMS & Medical",
    links: [
      { label: "Southwestern Illinois EMS System", url: null, note: "Regional EMS medical oversight" },
      { label: "SWIC EMT Program", url: null, note: "Southwestern Illinois College — EMT certification" },
      { label: "SWIC Paramedic Program", url: null, note: "Southwestern Illinois College — Paramedic certification" },
      { label: "Illinois Department of Public Health — EMS", url: null, note: "State EMS licensing and regulations" },
    ],
  },
  {
    category: "Millstadt Community",
    links: [
      {
        label: "Village of Millstadt — Municipal Code",
        url: "https://codelibrary.amlegal.com/codes/millstadt/latest/overview",
        note: "Millstadt village ordinances and municipal code",
      },
      { label: "Millstadt CCSD #160", url: null, note: "Community Consolidated School District #160" },
      { label: "St. James Catholic School", url: null, note: "Millstadt K–8 parochial school" },
      { label: "Village of Millstadt", url: null, note: "Village government and public resources" },
    ],
  },
  {
    category: "Public Safety",
    links: [
      { label: "Illinois Emergency Management Agency (IEMA)", url: null, note: "State emergency preparedness and response" },
      { label: "St. Clair County Emergency Management", url: null, note: "County-level emergency coordination" },
      { label: "National Weather Service — St. Louis", url: null, note: "Official weather alerts and forecasts for the Millstadt area" },
      { label: "Illinois State Police", url: null, note: "ISP Troop 11 — Collinsville District" },
    ],
  },
  {
    category: "Billing & Insurance",
    links: [
      { label: "EMS Secure Pay — Pay Your Bill", url: "https://emsecurepay.emsbilling.com/", note: "Online ambulance bill payment portal" },
      { label: "Medicare — Ambulance Services", url: null, note: "Medicare coverage information for ambulance transport" },
      { label: "Illinois Medicaid", url: null, note: "State Medicaid program information" },
    ],
  },
];

export default function LinksPage() {
  return (
    <>
      {/* Page Header */}
      <section className="relative pt-16 pb-24 bg-[#040d1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        <div className="relative wrap">
          <div className="flex items-center gap-3 mb-5">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.2em] uppercase">Resources</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6">
            Important Links
          </h1>
          <p className="text-slate-400 text-lg">Community resources, EMS education, and public safety links.</p>
        </div>
      </section>

      {/* Link Groups */}
      <section className="py-24 bg-[#040d1a]">
        <div className="wrap space-y-16">
          {linkGroups.map((group) => (
            <div key={group.category}>
              <div className="flex items-center gap-3 mb-8">
                <span className="h-px w-8 bg-[#f0b429]" />
                <span className="text-[#f0b429] text-sm font-black tracking-[0.2em] uppercase">{group.category}</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {group.links.map((link) => (
                  <div key={link.label}>
                    {link.url ? (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-4 p-6 rounded-xl bg-[#071428] border border-white/8 hover:border-[#f0b429]/30 transition-colors group"
                      >
                        <div>
                          <div className="text-white font-semibold text-sm group-hover:text-[#f0b429] transition-colors">{link.label}</div>
                          {link.note && <div className="text-slate-500 text-xs mt-1">{link.note}</div>}
                        </div>
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-slate-600 group-hover:text-[#f0b429] transition-colors shrink-0">
                          <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
                        </svg>
                      </a>
                    ) : (
                      <div className="flex items-center justify-between gap-4 p-6 rounded-xl bg-[#071428] border border-white/8 opacity-60">
                        <div>
                          <div className="text-white font-semibold text-sm">{link.label}</div>
                          {link.note && <div className="text-slate-500 text-xs mt-1">{link.note}</div>}
                        </div>
                        <span className="text-slate-700 text-[10px] uppercase tracking-widest font-bold shrink-0">Soon</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[#071428] border-t border-white/5">
        <div className="wrap flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-3xl font-black text-white mb-2">Missing a Link?</h2>
            <p className="text-slate-400">Let us know and we&apos;ll add it to the directory.</p>
          </div>
          <Link
            href="/contact"
            className="px-10 py-4 bg-[#f0b429] hover:bg-[#d9a320] text-[#040d1a] font-black text-base rounded-xl transition-colors shrink-0"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </>
  );
}

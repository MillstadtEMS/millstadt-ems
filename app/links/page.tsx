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
      { label: "Southwestern Illinois EMS System", url: "https://www.bjc.org/locations/southwestern-illinois-ems-system", note: "Regional EMS medical oversight — BJC Memorial Hospital" },
      { label: "SWIC EMT Program", url: "https://www.swic.edu/academics/career-certificates/emergency-services/emergency-medical-technician/", note: "Southwestern Illinois College — EMT certification" },
      { label: "SWIC Paramedic Program", url: "https://www.swic.edu/academics/career-degrees/emergency-services/paramedic/", note: "Southwestern Illinois College — Paramedic certification" },
      { label: "Illinois Department of Public Health — EMS", url: "https://dph.illinois.gov/topics-services/emergency-preparedness-response/ems.html", note: "State EMS licensing and regulations" },
    ],
  },
  {
    category: "Millstadt Community",
    links: [
      { label: "Village of Millstadt", url: "https://www.villageofmillstadt.org/", note: "Village government and public resources" },
      { label: "Village of Millstadt — Municipal Code", url: "https://codelibrary.amlegal.com/codes/millstadt/latest/overview", note: "Millstadt village ordinances and municipal code" },
      { label: "Millstadt CCSD #160", url: "https://www.mccsd160.com/", note: "Community Consolidated School District #160" },
      { label: "St. James Catholic School", url: "https://www.stjmillstadt.org/st-james-school/", note: "Millstadt K–8 parochial school" },
    ],
  },
  {
    category: "Public Safety",
    links: [
      { label: "Illinois Emergency Management Agency (IEMA)", url: "https://iemaohs.illinois.gov/", note: "State emergency preparedness and response" },
      { label: "St. Clair County Emergency Management", url: "https://www.co.st-clair.il.us/departments/emergency-management-agency", note: "County-level emergency coordination" },
      { label: "National Weather Service — St. Louis", url: "https://www.weather.gov/lsx/", note: "Official weather alerts and forecasts for the Millstadt area" },
      { label: "Illinois State Police", url: "https://isp.illinois.gov/", note: "ISP Troop 8 MetroEast — Collinsville District" },
    ],
  },
  {
    category: "Billing & Insurance",
    links: [
      { label: "EMS Secure Pay — Pay Your Bill", url: "https://emsecurepay.emsbilling.com/", note: "Online ambulance bill payment portal" },
      { label: "Medicare — Ambulance Services", url: "https://www.medicare.gov/coverage/ambulance-services", note: "Medicare coverage information for ambulance transport" },
      { label: "Illinois Medicaid (HFS)", url: "https://hfs.illinois.gov/", note: "Illinois Department of Healthcare and Family Services" },
    ],
  },
];

export default function LinksPage() {
  return (
    <>
      {/* Page Header */}
      <section className="relative pt-16 pb-28 bg-[#040d1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        <div className="relative wrap">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Resources</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-8">
            Important Links
          </h1>
          <p className="text-slate-300 text-xl leading-relaxed max-w-2xl">
            Community resources, EMS education, and public safety links for Millstadt and the surrounding area.
          </p>
        </div>
      </section>

      {/* Link Groups */}
      <section className="py-28 bg-[#040d1a]">
        <div className="wrap">
          {linkGroups.map((group, gi) => (
            <div key={group.category}>
              {/* Top border separator between groups */}
              {gi > 0 && (
                <div className="flex items-center gap-4 mb-16 mt-4">
                  <span className="flex-1 h-px bg-gradient-to-r from-[#f0b429]/20 to-transparent" />
                  <span className="flex-1 h-px bg-gradient-to-l from-[#f0b429]/20 to-transparent" />
                </div>
              )}
              <div className="flex items-center gap-4 mb-10">
                <span className="h-px w-8 bg-[#f0b429]" />
                <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">{group.category}</span>
              </div>
              <div className="grid md:grid-cols-2 gap-5 mb-20">
                {group.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start justify-between gap-6 p-8 rounded-2xl bg-[#071428] border border-white/8 hover:border-[#f0b429]/30 transition-colors group"
                  >
                    <div>
                      <div className="text-white font-bold text-lg mb-2 group-hover:text-[#f0b429] transition-colors leading-snug">{link.label}</div>
                      <div className="text-slate-400 text-sm leading-relaxed">{link.note}</div>
                    </div>
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-slate-700 group-hover:text-[#f0b429] transition-colors shrink-0 mt-1">
                      <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#071428] border-t border-white/5">
        <div className="wrap flex flex-col items-center text-center gap-6">
          <h2 className="text-4xl font-black text-white">Missing a Link?</h2>
          <p className="text-slate-400 text-lg max-w-md leading-relaxed">
            Let us know and we&apos;ll add it to the directory.
          </p>
          <Link
            href="/contact"
            className="mt-6 flex items-center justify-center gap-3 px-16 py-7 bg-[#f0b429] hover:bg-[#d9a320] text-[#040d1a] font-black text-2xl rounded-2xl transition-colors min-w-[280px]"
          >
            Contact Us
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
          </Link>
        </div>
      </section>

      <div className="h-20 bg-[#040d1a]" />
    </>
  );
}

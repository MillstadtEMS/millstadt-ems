import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import EmbedSection from "../EmbedSection";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact Millstadt Ambulance Service — address, phone, non-emergency numbers, and local public safety contacts for Millstadt, Illinois.",
};

const localContacts = [
  { label: "Millstadt Police Department", number: "618-476-7250" },
  { label: "Millstadt Fire Protection District (Non-Emergency)", number: "618-476-1234" },
  { label: "St. Clair County Sheriff's Department", number: "618-277-3505" },
  { label: "Illinois State Police", number: "618-346-3990" },
  { label: "Southwestern Illinois EMS System", number: "618-257-5736" },
  { label: "Millstadt CCSD #160", number: "618-476-1803" },
  { label: "St. James Catholic School", number: "618-476-3510" },
];

export default function ContactPage() {
  return (
    <>
      {/* Page Header */}
      <section className="relative pt-16 pb-28 bg-[#040d1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        <div className="relative wrap">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Get in Touch</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-10">
            Contact Us
          </h1>
        </div>
      </section>

      {/* Emergency Banner */}
      <section className="bg-[#0a0f1f] border-y border-white/8">
        <div className="wrap py-12">
          <div className="flex flex-col sm:flex-row items-center gap-8 sm:gap-14">
            <div className="flex items-center gap-4 shrink-0">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-white font-black text-sm uppercase tracking-widest">Emergency</span>
            </div>
            <a href="tel:911" className="text-white font-black text-5xl tracking-wider hover:text-[#f0b429] transition-colors shrink-0">
              9-1-1
            </a>
            <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
              For any life-threatening emergency, call 9-1-1 immediately. Do not call the station directly for emergencies.
            </p>
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-24 bg-[#040d1a]" />

      {/* Main Contact Info */}
      <section className="pb-40 bg-[#040d1a]">
        <div className="wrap flex flex-col gap-8">

          {/* Station Contact */}
          <div className="p-10 rounded-2xl bg-[#071428] border border-white/8">
            <div className="flex items-center justify-between gap-4 mb-8 pb-6 border-b border-white/8">
              <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={26} height={26} style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 4px #f0b429)" }} />
              <h2 className="text-white font-black text-xl">Millstadt Ambulance Service</h2>
              <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={26} height={26} style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 4px #f0b429)" }} />
            </div>

            <ul className="flex flex-col gap-4">
              {/* Address */}
              <li className="flex items-center gap-5 px-6 py-5 bg-[#040d1a] border border-white/8 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-[#1a3a6e]/60 border border-[#2563eb]/20 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-[#f0b429]">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px] uppercase tracking-widest mb-1">Address</div>
                  <address className="text-slate-300 text-base not-italic">100 East Laurel Street, Millstadt, Illinois 62260</address>
                </div>
              </li>

              {/* Phone */}
              <li>
                <a href="tel:6184761201" className="flex items-center gap-5 px-6 py-5 bg-[#040d1a] border border-white/8 rounded-2xl hover:border-[#f0b429]/30 transition-colors group w-full">
                  <div className="w-10 h-10 rounded-xl bg-[#1a3a6e]/60 border border-[#2563eb]/20 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-[#f0b429]">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[10px] uppercase tracking-widest mb-1">Non-Emergency Phone</div>
                    <div className="text-slate-300 text-base font-semibold group-hover:text-[#f0b429] transition-colors">(618) 476-1201</div>
                  </div>
                </a>
              </li>

              {/* Email */}
              <li>
                <a href="mailto:millstadtems@gmail.com" className="flex items-center gap-5 px-6 py-5 bg-[#040d1a] border border-white/8 rounded-2xl hover:border-[#f0b429]/30 transition-colors group w-full">
                  <div className="w-10 h-10 rounded-xl bg-[#1a3a6e]/60 border border-[#2563eb]/20 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-[#f0b429]">
                      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[10px] uppercase tracking-widest mb-1">Email</div>
                    <div className="text-slate-300 text-base group-hover:text-[#f0b429] transition-colors">millstadtems@gmail.com</div>
                  </div>
                </a>
              </li>
            </ul>
          </div>

          {/* 24/7 Response */}
          <div className="p-16 rounded-2xl bg-[#071428] border border-white/8">
              <div className="flex items-center gap-3 mb-5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Always Available</span>
              </div>
              <h3 className="text-white font-black text-2xl mb-4">24-Hour Emergency Response</h3>
              <p className="text-slate-400 text-base leading-relaxed">
                Millstadt Ambulance Service operates 24 hours a day, 365 days a year. For all
                life-threatening emergencies, call 9-1-1. Our providers are on call around the clock.
              </p>
            </div>

          {/* Important Note */}
          <div className="p-16 rounded-2xl bg-[#071428] border border-[#f0b429]/20">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-2 h-2 rounded-full bg-[#f0b429] animate-pulse shrink-0" />
              <span className="text-[#f0b429] text-xs font-bold uppercase tracking-widest">Important</span>
            </div>
            <h3 className="text-white font-black text-2xl mb-4">We Come to You</h3>
            <p className="text-slate-400 text-base leading-relaxed">
              Our ambulance base is not always staffed in person — but our providers are on call 24/7
              and ready to respond at a moment&apos;s notice. If you need emergency assistance, call
              9-1-1 and we will come to you. Please do not drive to the station.
            </p>
          </div>

        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-16 bg-gradient-to-b from-[#040d1a] to-[#071428]" />

      {/* Local Emergency Contacts */}
      <section className="pb-40 bg-[#071428]">
        <div className="wrap">
          <div className="flex items-center gap-4 mb-8">
            <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={32} height={32} style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 4px #f0b429)" }} />
            <span className="text-[#f0b429] text-2xl font-black tracking-[0.15em] uppercase">Local Resources</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-16">Community Contacts</h2>
          <div className="flex flex-col gap-4">
            {localContacts.map((c) => (
              <a
                key={c.label}
                href={`tel:${c.number.replace(/-/g, "")}`}
                className="flex items-center justify-between gap-6 px-10 h-16 rounded-2xl bg-[#040d1a] border border-white/8 hover:border-[#f0b429]/25 transition-colors group"
              >
                <div className="text-white font-semibold text-base group-hover:text-[#f0b429] transition-colors">{c.label}</div>
                <div className="flex items-center gap-5 shrink-0">
                  <div className="text-slate-300 text-lg font-bold">{c.number}</div>
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-slate-700 group-hover:text-[#f0b429] transition-colors shrink-0">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-20 bg-gradient-to-b from-[#071428] to-[#040d1a]" />

      {/* Embed */}
      <EmbedSection />

      <div className="h-20 bg-[#040d1a]" />
    </>
  );
}

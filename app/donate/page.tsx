import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Donate",
  description:
    "Support Millstadt Ambulance Service with a donation via Venmo, cash, or check. Your contribution funds equipment, training, and community readiness.",
};

export default function DonatePage() {
  return (
    <>
      {/* Page Header */}
      <section className="relative pt-16 pb-28 bg-[#040d1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        <div className="relative wrap">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Community Support</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-10">
            Support Your<br />Local EMS
          </h1>
          <ul className="space-y-5 max-w-2xl">
            {[
              "Millstadt Ambulance Service is a community-based organization. Your donation directly funds the equipment, training, and readiness that protects Millstadt.",
              "Every dollar stays local — there is no administrative overhead. Your contribution goes to work immediately.",
            ].map((text) => (
              <li key={text} className="flex items-start gap-4">
                <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={20} height={20} className="shrink-0 mt-1" style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 3px #f0b429)" }} />
                <span className="text-slate-300 text-xl leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-24 bg-[#040d1a]" />

      {/* Venmo Donation */}
      <section className="pb-40 bg-[#040d1a]">
        <div className="wrap grid md:grid-cols-2 gap-20 items-center">
          {/* QR Code */}
          <div className="flex flex-col items-center">
            <div className="rounded-3xl overflow-hidden shadow-2xl shadow-black/50" style={{ background: "#fff" }}>
              <Image
                src="/images/millstadt-ems/venmo-qr.png"
                alt="Millstadt EMS Venmo QR Code — @Millstadt-Ambulance"
                width={320}
                height={340}
                className="block"
                style={{ borderRadius: "1.5rem" }}
              />
            </div>
            <div className="mt-8 text-center space-y-2">
              <div className="text-white font-black text-2xl">Millstadt-Ambulance</div>
              <div className="text-[#f0b429] font-bold text-lg">@Millstadt-Ambulance</div>
              <div className="text-slate-500 text-sm">Venmo · Scan or search to donate</div>
            </div>
          </div>

          {/* Info */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <span className="h-px w-8 bg-[#f0b429]" />
              <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">How to Donate</span>
            </div>
            <h2 className="text-4xl font-black text-white mb-10 leading-tight">
              Every Dollar<br />Stays Local
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed mb-12">
              Every dollar goes directly toward equipment, supplies, training, and resources that keep Millstadt safe.
            </p>

            <div className="space-y-5">
              {[
                { method: "Venmo", detail: "@Millstadt-Ambulance", icon: "V" },
                { method: "Check", detail: "Make payable to Millstadt Ambulance Service", icon: "✓" },
                { method: "Cash", detail: "Drop off at 100 E Laurel St, Millstadt, IL 62260", icon: "$" },
              ].map((m) => (
                <div key={m.method} className="flex items-center gap-6 p-8 bg-[#071428] border border-white/8 rounded-2xl">
                  <div className="w-12 h-12 rounded-xl bg-[#1a3a6e]/60 border border-[#2563eb]/20 flex items-center justify-center shrink-0">
                    <span className="text-[#f0b429] font-black text-lg">{m.icon}</span>
                  </div>
                  <div>
                    <div className="text-white font-bold text-base mb-1">{m.method}</div>
                    <div className="text-slate-500 text-sm">{m.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-[#040d1a]" />

      {/* What Donations Fund */}
      <section className="py-28 bg-[#071428]">
        <div className="wrap">
          <div className="flex items-center gap-3 mb-8">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Impact</span>
          </div>
          <h2 className="text-5xl font-black text-white mb-16">Where Your Donation Goes</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Equipment",
                desc: "Life-saving equipment, monitors, ventilators, and the tools our providers depend on.",
                icon: (
                  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
                  </svg>
                ),
              },
              {
                title: "Training",
                desc: "Continuing education, certifications, and clinical development for our EMS providers.",
                icon: (
                  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current">
                    <path d="M12 3L1 9l4 2.18V18l7 4 7-4v-6.82L23 9zm-1 13.99L6 14.45V11.24l5 2.73v3.02zm0-4.62L4.28 9 12 5.28 19.72 9 11 12.37z" />
                  </svg>
                ),
              },
              {
                title: "Fleet",
                desc: "Vehicle maintenance, upgrades, and the operational readiness of our ambulance units.",
                icon: (
                  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current">
                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z" />
                  </svg>
                ),
              },
              {
                title: "Community",
                desc: "Outreach programs, school visits, public safety education, and community events.",
                icon: (
                  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current">
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div key={item.title} className="p-10 rounded-2xl bg-[#040d1a] border border-white/8 hover:border-[#f0b429]/20 transition-colors">
                <div className="text-[#f0b429] mb-6">{item.icon}</div>
                <div className="text-white font-bold text-lg mb-4">{item.title}</div>
                <p className="text-slate-400 text-base leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-[#040d1a]" />

      {/* CTA */}
      <section className="pb-40 bg-[#040d1a]">
        <div className="wrap">
          <h2 className="text-4xl font-black text-white mb-4">Questions About Donating?</h2>
          <p className="text-slate-400 text-lg mb-10">Reach out to us directly — we appreciate every contribution.</p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-10 py-5 border border-white/15 hover:border-white/35 text-white font-semibold text-base rounded-2xl transition-colors hover:bg-white/5"
          >
            Contact Us
          </Link>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-[#040d1a]" />
    </>
  );
}

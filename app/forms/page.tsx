import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Forms",
  description:
    "Submit forms to Millstadt Ambulance Service — employment applications, ride-along requests, event requests, and birthday party requests.",
};

const forms = [
  {
    href: "/forms/ride-along",
    title: "Ride-Along / Volunteer Request",
    desc: "Request a ride-along for community service hours, medical school, PA/NP programs, or civilian observation.",
    badge: "Volunteer",
    badgeColor: "bg-emerald-950 text-emerald-400 border-emerald-800/40",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current">
        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z" />
      </svg>
    ),
  },
  {
    href: "/forms/event-request",
    title: "Event / Visit Request",
    desc: "Request an EMS appearance at a community event, safety demonstration, or school visit.",
    badge: "Community",
    badgeColor: "bg-[#f0b429]/10 text-[#f0b429] border-[#f0b429]/30",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current">
        <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
      </svg>
    ),
  },
  {
    href: "/forms/birthday",
    title: "Birthday Party Appearance Request",
    desc: "Request a Millstadt EMS ambulance and crew to come to your child's birthday party — no fee.",
    badge: "Fun",
    badgeColor: "bg-purple-950 text-purple-400 border-purple-800/40",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current">
        <path d="M12 6c1.11 0 2-.89 2-2 0-.35-.1-.68-.24-.97L12 0l-1.76 3.03c-.14.29-.24.62-.24.97 0 1.11.89 2 2 2zm4.6 9.99l-1.07-1.07-1.08 1.07c-1.3 1.3-3.58 1.31-4.89 0l-1.07-1.07-1.09 1.07C6.75 17.64 5.88 18 4.96 18c-.73 0-1.4-.23-1.96-.61V21c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-3.61c-.56.38-1.23.61-1.96.61-.92 0-1.79-.36-2.44-1.01zM18 9H6c-1.1 0-2 .89-2 2v2.45C4.64 13.8 5.28 14 5.96 14c.8 0 1.55-.31 2.11-.86l2.04-2.03 2.05 2.04c1.08 1.08 2.97 1.08 4.05 0l2.04-2.04 2.05 2.04c.56.55 1.31.86 2.11.86H22V11c0-1.11-.9-2-2-2h-2z" />
      </svg>
    ),
  },
  {
    href: "/forms/birthday-station",
    title: "Birthday Party at Our Station",
    desc: "Request to host your child's birthday party at the Millstadt EMS station. A small fee may apply.",
    badge: "Fun",
    badgeColor: "bg-purple-950 text-purple-400 border-purple-800/40",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    ),
  },
];

export default function FormsPage() {
  return (
    <>
      {/* Page Header */}
      <section className="relative pt-16 pb-24 bg-[#040d1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        <div className="relative wrap">
          <div className="flex items-center gap-3 mb-5">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.2em] uppercase">Requests &amp; Applications</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6">
            Forms
          </h1>
          <p className="text-slate-400 text-lg">Submit forms directly to Millstadt Ambulance Service.</p>
        </div>
      </section>

      {/* Form Cards */}
      <section className="py-24 bg-[#040d1a]">
        <div className="wrap">
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {forms.map((form, i) => (
              <Link
                key={form.href}
                href={form.href}
                className={`flex flex-col gap-5 p-14 rounded-2xl bg-[#071428] border border-white/8 hover:border-[#f0b429]/25 transition-all group hover:bg-[#071428]/80${i === forms.length - 1 && forms.length % 2 !== 0 ? " md:col-span-2 md:w-1/2 md:mx-auto" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="w-14 h-14 rounded-xl bg-[#1a3a6e]/60 border border-[#2563eb]/20 flex items-center justify-center shrink-0 text-[#f0b429] group-hover:border-[#2563eb]/40 transition-colors">
                    {form.icon}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${form.badgeColor}`}>
                    {form.badge}
                  </span>
                </div>
                <div>
                  <h2 className="text-white font-black text-xl mb-2 group-hover:text-[#f0b429] transition-colors">{form.title}</h2>
                  <p className="text-slate-400 text-sm leading-relaxed">{form.desc}</p>
                </div>
                <div className="flex items-center gap-2 text-[#f0b429] text-sm font-bold mt-auto">
                  Start Form
                  <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current group-hover:translate-x-1 transition-transform">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-[#040d1a]" />

      {/* Contact note */}
      <section className="py-16 bg-[#071428] border-t border-white/5">
        <div className="wrap flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-slate-400 text-sm">
            Questions about a form or submission? Contact us directly.
          </p>
          <Link
            href="/contact"
            className="px-8 py-4 border border-white/15 hover:border-white/35 text-white font-semibold text-sm rounded-xl transition-colors hover:bg-white/5 shrink-0"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </>
  );
}

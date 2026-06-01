import Image from "next/image";
import Link from "next/link";
import HolidayOverlay from "@/components/HolidayOverlay";
import HeroCarousel from "@/components/HeroCarousel";
import CallVolumeCounter from "@/components/CallVolumeCounter";
import CallStatsExtras from "@/components/CallStatsExtras";
import TopCallCategories from "@/components/TopCallCategories";
import DistrictMapStat from "@/components/DistrictMapStat";
import SectionDivider from "@/components/SectionDivider";
import { getContent } from "@/lib/db";

// Always SSR so ?preview=ve shows fresh draft content
export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const isPreview = params?.preview === "ve";

  const [
    eyebrow,
    titleLine1, titleLine2, titleLine3,
    subtitle, subtitle2,
    primaryBtnText, primaryBtnHref,
    secondaryBtnText, secondaryBtnHref,
    stat0Num, stat0Label,
    stat1Num, stat1Label,
    stat2Num, stat2Label,
    stat3Num, stat3Label,
  ] = await Promise.all([
    getContent("homepage.hero.eyebrow",          "Millstadt, Illinois · Est. 1980",             isPreview),
    getContent("homepage.hero.title.line1",       "Millstadt",                                   isPreview),
    getContent("homepage.hero.title.line2",       "Ambulance",                                   isPreview),
    getContent("homepage.hero.title.line3",       "Service",                                     isPreview),
    getContent("homepage.hero.subtitle",          "Advanced Life Support When it Matters Most.", isPreview),
    getContent("homepage.hero.subtitle2",         "24 hours a day, every day.",                  isPreview),
    getContent("homepage.hero.primaryBtn.text",   "Pay Your Bill",                               isPreview),
    getContent("homepage.hero.primaryBtn.href",   "https://emsecurepay.emsbilling.com/",         isPreview),
    getContent("homepage.hero.secondaryBtn.text", "Donate",                                      isPreview),
    getContent("homepage.hero.secondaryBtn.href", "/donate",                                     isPreview),
    getContent("homepage.stats.0.num",   "1980",               isPreview),
    getContent("homepage.stats.0.label", "Established",        isPreview),
    getContent("homepage.stats.1.num",   "ALS / BLS",          isPreview),
    getContent("homepage.stats.1.label", "Level of Care",      isPreview),
    getContent("homepage.stats.2.num",   "24 / 7",             isPreview),
    getContent("homepage.stats.2.label", "Emergency Response", isPreview),
    getContent("homepage.stats.3.num",   "Millstadt",          isPreview),
    getContent("homepage.stats.3.label", "District",           isPreview),
  ]);

  return (
    <>
      {/* ════════════════════════════════
          HERO
      ════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ marginTop: "-96px" }}>
        <HeroCarousel />
        <div className="absolute inset-0 bg-gradient-to-t from-[#040d1a] via-transparent to-transparent" style={{ zIndex: 2 }} />
        <HolidayOverlay />

        {/* ── Hero — single flex parent, 3 sections ── */}
        <div className="hero-content relative z-10 w-full" style={{ paddingTop: "96px" }}>

          {/* ── hero-top: headline, subtext, buttons ── */}
          <div className="hero-top w-full flex flex-col items-center text-center px-6 pt-8 md:pt-16">
            <div className="flex items-center justify-center gap-3 mb-6 sm:mb-10">
              <span className="h-px w-12 bg-[#f0b429]" />
              <span className="text-[#f0b429] text-xs font-bold tracking-[0.35em] uppercase">
                {eyebrow}
              </span>
              <span className="h-px w-12 bg-[#f0b429]" />
            </div>

            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-white leading-[0.88] tracking-tight mb-6 sm:mb-10">
              {titleLine1}<br />
              <span className="text-[#f0b429]">{titleLine2}</span><br />
              {titleLine3}
            </h1>

            <p
              className="text-white leading-relaxed max-w-2xl text-center"
              style={{
                fontSize: "clamp(1.375rem, 2.4vw, 2rem)",
                fontWeight: 600,
                textShadow: "0 2px 12px rgba(0,0,0,0.55)",
                marginBottom: 56,
              }}
            >
              {subtitle}<br />
              {subtitle2}
            </p>

            <div className="flex flex-wrap justify-center gap-5">
              <a
                href={primaryBtnHref}
                target="_blank"
                rel="noopener noreferrer"
                className="px-10 py-5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-black text-lg rounded-2xl transition-colors min-w-[200px]"
              >
                {primaryBtnText}
              </a>
              <Link
                href={secondaryBtnHref}
                className="px-10 py-5 border-2 border-[#f0b429]/60 hover:border-[#f0b429] text-[#f0b429] hover:bg-[#f0b429]/10 font-black text-lg rounded-2xl transition-colors min-w-[200px] text-center"
              >
                {secondaryBtnText}
              </Link>
            </div>
          </div>

          {/* Breathing room between CTAs and the (now-larger) call counter — inline style because Tailwind v4 spacing utilities resolve to 0 here */}
          <div style={{ height: 56 }} aria-hidden />

          {/* ── hero-middle: call volume counter ── */}
          <div className="hero-middle w-full flex flex-col items-center justify-center text-center">
            <CallVolumeCounter />
            {/* Monthly + projected year-end — renders nothing during SSR
                and only mounts after first paint, so it cannot trigger a
                hydration mismatch. */}
            <CallStatsExtras />
            {/* Top Call Categories tile — real ticker data, current
                month, hover/tap reveals the full ranking + disclaimer. */}
            <TopCallCategories />
          </div>

          {/* ── hero-bottom: stats bar ── */}
          <div className="hero-bottom w-full border-t border-white/5 border-b border-b-white/5 bg-[#040d1a]/80 backdrop-blur-sm">
            <div className="wrap py-8 grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5">
              {[
                { num: stat0Num, label: stat0Label },
                { num: stat1Num, label: stat1Label },
                { num: stat2Num, label: stat2Label },
              ].map((s) => (
                <div key={s.label} className="text-center px-6 py-2">
                  <div className="text-[#f0b429] font-black text-3xl tracking-tight">{s.num}</div>
                  <div className="text-slate-400 text-sm uppercase tracking-widest mt-2">{s.label}</div>
                </div>
              ))}
              {/* District tile is interactive — hover for a preview of the
                  service-area map, click for the full zoomable view. */}
              <DistrictMapStat num={stat3Num} label={stat3Label} />
            </div>
          </div>

        </div>
      </section>

      <SectionDivider />

      {/* ════════════════════════════════
          QUICK ACTION CARDS
      ════════════════════════════════ */}
      <section className="bg-[#040d1a]" style={{ paddingBottom: 16 }}>
        <div className="wrap flex justify-center">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 w-full max-w-4xl">
            {[
              {
                href: "/careers/apply",
                label: "Apply Now",
                sub: "Submit your application to join the Millstadt EMS team.",
                icon: (
                  <svg viewBox="0 0 24 24" className="w-9 h-9 fill-current">
                    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                  </svg>
                ),
              },
              {
                href: "/forms/ride-along",
                label: "Request Ride-Along",
                sub: "Medical students and civilians can request volunteer hours or a ride-along.",
                icon: (
                  <svg viewBox="0 0 24 24" className="w-9 h-9 fill-current">
                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z" />
                  </svg>
                ),
              },
              {
                href: "/forms/event-request",
                label: "Request an Event",
                sub: "Birthday parties, safety demos, and community visits.",
                icon: (
                  <svg viewBox="0 0 24 24" className="w-9 h-9 fill-current">
                    <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
                  </svg>
                ),
              },
              {
                href: "/community-education",
                label: "Community Education",
                sub: "Public safety outreach, school visits, and community programs.",
                icon: (
                  <svg viewBox="0 0 24 24" className="w-9 h-9 fill-current">
                    <path d="M12 3L1 9l4 2.18V18l7 4 7-4v-6.82L23 9zm-1 13.99L6 14.45V11.24l5 2.73v3.02zm0-4.62L4.28 9 12 5.28 19.72 9 11 12.37z" />
                  </svg>
                ),
              },
            ].map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className="group flex flex-col items-center text-center gap-10 pt-20 pb-12 px-10 rounded-2xl bg-[#071428] border border-white/8 hover:bg-[#0c1e3d] hover:border-[#f0b429]/50 transition-all duration-200 cursor-pointer"
              >
                <div className="w-20 h-20 min-w-[5rem] min-h-[5rem] rounded-2xl bg-[#1a3a6e]/70 border border-[#2563eb]/25 flex items-center justify-center self-center mx-auto text-[#f0b429] group-hover:border-[#2563eb]/60 group-hover:bg-[#1a3a6e] transition-all duration-200 mt-6">
                  {card.icon}
                </div>
                <div className="flex-1">
                  <div className="text-white font-black text-2xl leading-snug mb-3 group-hover:text-[#f0b429] transition-colors duration-200">
                    {card.label}
                  </div>
                  <div className="text-slate-400 text-lg leading-relaxed">
                    {card.sub}
                  </div>
                </div>
                <div className="flex items-center justify-center gap-6 w-full py-6 bg-[#f0b429] group-hover:bg-[#ffd45c] text-[#040d1a] font-black text-lg rounded-2xl transition-colors duration-200">
                  <span className="whitespace-nowrap">Get Started</span>
                  <svg viewBox="0 0 20 20" className="w-5 h-5 fill-current group-hover:translate-x-1 transition-transform duration-200">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ════════════════════════════════
          KIDS CLUB BANNER
      ════════════════════════════════ */}
      <section className="bg-[#040d1a]" style={{ paddingTop: 4, paddingBottom: 8 }}>
        <div className="wrap box-border">
          <Link
            href="/kids-club"
            style={{ padding: 10, gap: 10 }}
            className="group grid rounded-2xl border border-white/10 bg-[#071428] shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:border-[#f0b429]/45 focus:outline-none focus:ring-2 focus:ring-[#f0b429] focus:ring-offset-2 focus:ring-offset-[#040d1a] md:grid-cols-[auto_1fr_auto] md:items-center"
          >
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-[#f0b429]/40 bg-white md:h-28 md:w-28">
              <Image
                src="/kids-club/coloring/kids-club-logo.png"
                alt=""
                fill
                sizes="112px"
                className="object-contain p-1.5"
              />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-[0.22em] text-[#f0b429]">
                For Families
              </div>
              <h2 className="mt-2 text-2xl font-black leading-tight text-white md:text-3xl">
                Millstadt EMS Kids Club
              </h2>
              <p className="mt-2 max-w-2xl text-base font-medium leading-7 text-slate-400">
                Monthly safety activities, custom coloring pages, and family
                resources from Millstadt EMS.
              </p>
            </div>
            <div className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#f0b429] px-5 text-sm font-black uppercase tracking-[0.14em] text-[#040d1a] transition group-hover:bg-[#ffd45c] md:justify-self-end">
              Open Kids Club
              <svg viewBox="0 0 20 20" className="ml-3 h-4 w-4 fill-current transition group-hover:translate-x-1">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </Link>
        </div>
      </section>

      <SectionDivider variant="fadeDown" />

      {/* ════════════════════════════════
          WHO WE ARE — Preview
      ════════════════════════════════ */}
      <section className="bg-[#071428]" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div className="wrap">
          <div className="grid md:grid-cols-2 gap-20 items-center">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <span className="h-px w-8 bg-[#f0b429]" />
                <span className="text-[#f0b429] text-sm font-black tracking-[0.2em] uppercase">Who We Are</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-black text-white leading-[1.0] mb-10">
                Your Community&apos;s<br />Lifeline
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-6">
                Since 1980, Millstadt Ambulance Service has been there when it matters most. Our
                service delivers Advanced Life Support — the highest level of emergency
                care before the hospital.
              </p>
              <p className="text-slate-400 text-lg leading-relaxed mb-12">
                Serving Millstadt and surrounding communities, 24 hours a day, 7 days a week — no matter the call.
              </p>
              <Link
                href="/about"
                className="flex items-center justify-center gap-6 w-full py-6 bg-[#f0b429] hover:bg-[#d9a320] text-[#040d1a] font-black text-lg rounded-2xl transition-colors"
              >
                Learn About Us
                <svg viewBox="0 0 20 20" className="w-5 h-5 fill-current">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>
            <div>
              <div className="relative h-[500px] rounded-2xl overflow-hidden mb-5">
                <Image
                  src="/images/millstadt-ems/lifeline.jpg"
                  alt="Millstadt EMS on scene"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover object-top"
                />
              </div>
              <div className="flex gap-4">
                {[
                  { num: `${new Date().getFullYear() - 1980}+`, label: "Years",     color: "text-[#f0b429]" },
                  { num: "ALS",                                  label: "Licensed",  color: "text-[#2563eb]" },
                  { num: "24/7",                                 label: "On Call",   color: "text-slate-200" },
                ].map((m) => (
                  <div key={m.label} className="flex-1 p-5 bg-[#040d1a] border border-white/5 rounded-xl text-center">
                    <div className={`${m.color} font-black text-2xl`}>{m.num}</div>
                    <div className="text-slate-500 text-xs uppercase tracking-wider mt-1">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════
          COMMUNITY — Preview
      ════════════════════════════════ */}
      <SectionDivider variant="fadeUp" />
      <section className="bg-[#040d1a]" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div className="wrap">
          <div className="grid md:grid-cols-2 gap-20 items-center">
            <div className="relative h-[460px] rounded-2xl overflow-hidden">
              <Image
                src="/images/millstadt-ems/IMG_3130.jpeg"
                alt="Millstadt EMS Community Outreach"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-top"
              />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-8">
                <span className="h-px w-8 bg-[#f0b429]" />
                <span className="text-[#f0b429] text-sm font-black tracking-[0.2em] uppercase">In The Community</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-black text-white mb-10 leading-[1.0]">
                Building a Safer<br />Millstadt
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-12">
                From school visits to real-world safety demonstrations, we teach our community how to stay safe and act when it matters most.
              </p>
              <div className="flex flex-col gap-5">
                <Link
                  href="/community-education"
                  className="flex items-center justify-center gap-6 w-full py-6 bg-[#f0b429] hover:bg-[#d9a320] text-[#040d1a] font-black text-lg rounded-2xl transition-colors"
                >
                  Community Education
                </Link>
                <Link
                  href="/forms/event-request"
                  className="flex items-center justify-center gap-6 w-full py-6 border-2 border-white/20 hover:border-[#f0b429]/50 hover:text-[#f0b429] text-white font-black text-lg rounded-2xl transition-colors"
                >
                  Request a Visit
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════
          SUPPORT / DONATE CTA
      ════════════════════════════════ */}
      <SectionDivider variant="fadeDown" />
      <section className="bg-[#071428]" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div className="wrap">
          <div className="grid md:grid-cols-2 gap-20 items-center">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <span className="h-px w-8 bg-[#f0b429]" />
                <span className="text-[#f0b429] text-sm font-black tracking-[0.2em] uppercase">Support Us</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-black text-white mb-8 leading-[1.0]">
                Support Your<br />Local EMS
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-12">
                Millstadt Ambulance Service is a community-based service. Donations fund
                equipment, training, and the resources that keep your neighbors safe — day and night.
              </p>
              <div className="flex flex-col gap-5">
                <Link
                  href="/donate"
                  className="flex items-center justify-center gap-6 w-full py-6 bg-[#f0b429] hover:bg-[#d9a320] text-[#040d1a] font-black text-lg rounded-2xl transition-colors"
                >
                  Donate Now
                </Link>
                <Link
                  href="/contact"
                  className="flex items-center justify-center gap-6 w-full py-6 border-2 border-white/20 hover:border-[#f0b429]/50 hover:text-[#f0b429] text-white font-black text-lg rounded-2xl transition-colors"
                >
                  Contact Us
                </Link>
              </div>
            </div>
            <div className="relative h-[380px] rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
              <Image
                src="/images/millstadt-ems/pr.jpg"
                alt="Millstadt EMS community outreach with kids"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-[center_60%]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071428]/20 to-transparent" />
            </div>
          </div>
        </div>
      </section>
      </>
  );
}

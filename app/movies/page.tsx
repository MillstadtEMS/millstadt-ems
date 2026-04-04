import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Honorable but Broken: EMS in Crisis — Documentary",
  description:
    "Millstadt EMS spotlights 'Honorable but Broken' — a documentary that takes an unflinching look at the crisis facing emergency medical services across America.",
};

export default function MoviesPage() {
  return (
    <>
      {/* Page Header */}
      <section className="relative pt-16 pb-28 bg-[#040d1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        <div className="relative wrap">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Featured Documentary</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6">
            Honorable but Broken:<br />EMS in Crisis
          </h1>
          <p className="text-slate-400 text-xl max-w-2xl leading-relaxed">
            An unflinching look at the crisis facing emergency medical services in America — told by the men and women on the front lines.
          </p>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-24 bg-[#040d1a]" />

      {/* Video Embed */}
      <section className="pb-20 bg-[#040d1a]">
        <div className="wrap">
          <div className="rounded-2xl overflow-hidden border border-white/8 shadow-2xl shadow-black/60 aspect-video">
            <iframe
              src="https://www.youtube.com/embed/M7s1mI9_m-Y?autoplay=1"
              title="Honorable but Broken: EMS in Crisis"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{ border: 0, width: "100%", height: "100%" }}
            />
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-24 bg-[#040d1a]" />

      {/* Watch on Tubi */}
      <section className="pb-24 bg-[#040d1a]">
        <div className="wrap">
          <div className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase mb-4">Stream Free</div>
          <p className="text-slate-300 text-xl mb-10">Watch the full documentary on Tubi — free, no subscription required.</p>
          <div className="flex flex-col gap-4 max-w-sm">
            <Link
              href="https://tubitv.com/movies/100026394/honorable-but-broken-ems-in-crisis"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-4 w-full py-6 bg-[#f0b429] hover:bg-[#d9a320] text-[#040d1a] font-black text-lg rounded-2xl transition-colors"
            >
              Watch Full Documentary on Tubi — Free
            </Link>
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-16 bg-[#040d1a]" />

      {/* Synopsis */}
      <section className="py-28 bg-[#071428]">
        <div className="wrap">
          <div className="flex items-center gap-3 mb-8">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Synopsis</span>
          </div>
          <h2 className="text-5xl font-black text-white mb-16">The EMS Crisis in America</h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="flex items-start gap-5">
                <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={20} height={20} className="shrink-0 mt-1" style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 3px #f0b429)" }} />
                <p className="text-slate-300 text-lg leading-relaxed">
                  <em>Honorable but Broken</em> exposes the systemic failures threatening emergency medical services across the United States — underfunding, staffing shortages, burnout, and a broken reimbursement model that leaves providers and patients both paying the price.
                </p>
              </div>
              <div className="flex items-start gap-5">
                <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={20} height={20} className="shrink-0 mt-1" style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 3px #f0b429)" }} />
                <p className="text-slate-300 text-lg leading-relaxed">
                  The documentary follows EMTs and paramedics from agencies across the country as they navigate impossible working conditions — long shifts, inadequate pay, mental health struggles, and the weight of life-and-death responsibility that comes with every call.
                </p>
              </div>
              <div className="flex items-start gap-5">
                <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={20} height={20} className="shrink-0 mt-1" style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 3px #f0b429)" }} />
                <p className="text-slate-300 text-lg leading-relaxed">
                  Rural and volunteer agencies face the sharpest edge of the crisis — with some communities going hours without ambulance coverage. The film asks a hard question: when the system that saves lives is itself breaking down, who saves the system?
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex items-start gap-5">
                <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={20} height={20} className="shrink-0 mt-1" style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 3px #f0b429)" }} />
                <p className="text-slate-300 text-lg leading-relaxed">
                  Interviews with EMS directors, state legislators, national advocates, and frontline providers paint a picture of a profession that has long operated in the shadows of the healthcare system — honored in moments of crisis, forgotten the rest of the time.
                </p>
              </div>
              <div className="flex items-start gap-5">
                <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={20} height={20} className="shrink-0 mt-1" style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 3px #f0b429)" }} />
                <p className="text-slate-300 text-lg leading-relaxed">
                  At Millstadt Ambulance Service, we see this reality firsthand. We are proud to spotlight this film because the story it tells is the story of every community-based EMS agency — including ours — and every provider who shows up every day despite the odds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-[#040d1a]" />

      {/* Why It Matters */}
      <section className="pb-40 bg-[#040d1a]">
        <div className="wrap">
          <div className="flex items-center gap-3 mb-8">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Why It Matters</span>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                title: "Staffing Crisis",
                desc: "EMS agencies nationwide are struggling to recruit and retain qualified providers. Low wages and brutal working conditions are driving experienced personnel out of the field.",
              },
              {
                title: "Underfunding",
                desc: "EMS is the only component of the 911 system not guaranteed public funding. Many agencies depend entirely on billing — often collecting less than the cost of a single call.",
              },
              {
                title: "Provider Burnout",
                desc: "PTSD, depression, and suicide rates among EMS providers are significantly higher than the general population. The emotional toll of the job is rarely acknowledged or addressed.",
              },
            ].map((item) => (
              <div key={item.title} className="p-10 rounded-2xl bg-[#071428] border border-white/8 hover:border-[#f0b429]/20 transition-colors">
                <div className="text-white font-bold text-lg mb-4">{item.title}</div>
                <p className="text-slate-400 text-base leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-[#040d1a]" />
    </>
  );
}

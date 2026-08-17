import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { getTodayAroundMillstadt } from "@/lib/community/today";
import { PublicMetric, PublicPageHero } from "@/components/site/PublicChrome";
import SiteIcon from "@/components/site/SiteIcon";

export const metadata: Metadata = {
  title: "Today Around Millstadt",
  description:
    "A source-aware community dashboard for Millstadt EMS events, weather, sports, school events, flags, and sky features.",
};

const sourceRules = [
  "No fake scores, fake event notices, fake closures, or guessed flag status.",
  "Official and authorized sources come first.",
  "Unavailable data says unavailable instead of pretending everything is fine.",
  "Public safety notices keep the exact official wording when they are approved for public display.",
];

export default function TodayAroundMillstadtPage() {
  const today = getTodayAroundMillstadt();

  return (
    <div className="bg-[#040d1a] text-white">
      <PublicPageHero
        eyebrow="Community Preview"
        title="Today Around"
        accent="Millstadt"
        description="Official local links and public updates in one place. Items that are not available yet are clearly marked."
      >
        <PublicMetric label="Sports links" value={today.sports.length} tone="blue" />
        <PublicMetric label="Flag regions" value={today.flags.length} tone="red" />
        <PublicMetric label="Local schools" value={today.schools.length} tone="green" />
      </PublicPageHero>

      <section className="bg-[#040d1a] py-12">
        <div className="wrap">
          <div className="grid gap-4 lg:grid-cols-4">
            {sourceRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/10 bg-[#071428] p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[#f0b429]/30 bg-[#f0b429]/10 text-[#f0b429]">
                  <SiteIcon name="shield" className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold leading-6 text-slate-300">{rule}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="sports" className="scroll-mt-[150px] bg-[#071428] py-14">
        <div className="wrap">
          <SectionHeader
            eyebrow="Game Day"
            title="St. Louis sports"
            text="This slot is ready for official schedule data. Live scores stay unavailable until a licensed or authorized provider is configured."
          />
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {today.sports.map((item) => (
              <article key={item.team} className="rounded-2xl border border-white/10 bg-[#040d1a] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">{item.league}</div>
                    <h3 className="mt-3 text-2xl font-black leading-tight text-white">{item.team}</h3>
                  </div>
                  <StatusPill tone={item.status === "verified-data" ? "green" : "gold"}>
                    {item.status === "verified-data" ? "Verified data" : item.status === "source-link" ? "Official link" : "Setup required"}
                  </StatusPill>
                </div>
                <p className="mt-5 text-sm font-semibold leading-7 text-slate-300">{item.note}</p>
                <a
                  href={item.scheduleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${item.source} opens in a new tab`}
                  className="mt-6 inline-flex min-h-11 max-w-full flex-wrap items-center gap-2 rounded-xl border border-blue-300/35 px-4 py-2 text-left text-xs font-black uppercase tracking-[0.14em] text-blue-200 transition hover:border-blue-200 hover:bg-blue-300/10 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2 focus:ring-offset-[#040d1a]"
                >
                  <span className="min-w-0" style={{ overflowWrap: "anywhere" }}>{item.source}</span>
                  <SiteIcon name="external" className="h-4 w-4" />
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="schools" className="scroll-mt-[150px] bg-[#040d1a] py-14">
        <div className="wrap">
          <SectionHeader
            eyebrow="School Events"
            title="Local school sports and notices"
            text="School items will use official calendars, athletics feeds, or approved manual entries. Closures and safety notices will never come from rumors or social posts."
          />
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {today.schools.map((school) => (
              <article key={school.name} className="rounded-2xl border border-emerald-300/15 bg-[#071428] p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-300/10 text-emerald-200">
                  <SiteIcon name="education" className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-xl font-black leading-tight text-white">{school.name}</h3>
                <p className="mt-4 text-sm font-semibold leading-7 text-slate-300">{school.statusLabel}</p>
                <p className="mt-3 text-xs font-bold leading-6 text-slate-500">{school.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="flags" className="scroll-mt-[150px] bg-[#071428] py-14">
        <div className="wrap">
          <SectionHeader
            eyebrow="Civic Notice"
            title="Federal and Illinois flag status"
            text="The public display will show half-staff only when the federal or Illinois source is official and the reason, dates, scope, and review state are clear."
          />
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {today.flags.map((flag) => (
              <article key={flag.jurisdiction} className="rounded-2xl border border-rose-300/15 bg-[#040d1a] p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-rose-300">{flag.jurisdiction}</div>
                    <h3 className="mt-3 text-2xl font-black leading-tight text-white">{flag.state}</h3>
                  </div>
                  <StatusPill tone="red">Status unavailable</StatusPill>
                </div>
                <p className="mt-5 text-sm font-semibold leading-7 text-slate-300">{flag.note}</p>
                <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{flag.source}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="sky" className="scroll-mt-[150px] bg-[#040d1a] py-14">
        <div className="wrap">
          <SectionHeader
            eyebrow="Millstadt Sky"
            title="Preview: Millstadt sky"
            text="This preview shows the kinds of sky notices planned for Millstadt. Dated viewing details will appear only after timing, direction, visibility, and safety guidance are verified."
          />
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {today.sky.map((item) => (
              <article key={item.title} className="rounded-2xl border border-cyan-300/15 bg-[#071428] p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-200">
                  <SiteIcon name="spark" className="h-5 w-5" />
                </div>
                <div className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-cyan-300">{item.timing}</div>
                <h3 className="mt-3 text-2xl font-black leading-tight text-white">{item.title}</h3>
                <p className="mt-4 text-sm font-semibold leading-7 text-slate-300">{item.detail}</p>
                {item.safetyNote && (
                  <p className="mt-5 rounded-xl border border-[#f0b429]/20 bg-[#f0b429]/10 p-4 text-sm font-bold leading-6 text-[#f8d980]">
                    {item.safetyNote}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#071428] py-14">
        <div className="wrap">
          <div className="grid gap-6 rounded-2xl border border-[#f0b429]/25 bg-[#040d1a] p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.2em] text-[#f0b429]">Community calendar</div>
              <h2 className="mt-3 text-3xl font-black leading-tight text-white">Looking for actual Millstadt EMS events?</h2>
              <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-slate-300">
                The event calendar stays as the source for public appearances, classes, fundraisers, and community visits.
              </p>
            </div>
            <Link
              href="/events"
              className="inline-flex min-h-13 items-center justify-center gap-3 rounded-xl bg-[#f0b429] px-6 text-sm font-black uppercase tracking-[0.14em] text-[#040d1a] transition hover:bg-[#ffd45c] focus:outline-none focus:ring-2 focus:ring-[#f0b429] focus:ring-offset-2 focus:ring-offset-[#040d1a]"
            >
              Open events
              <SiteIcon name="external" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="max-w-4xl">
      <div className="text-xs font-black uppercase tracking-[0.24em] text-[#f0b429]">{eyebrow}</div>
      <h2 className="mt-4 text-balance text-4xl font-black leading-tight text-white md:text-5xl">{title}</h2>
      <p className="mt-5 text-lg font-semibold leading-8 text-slate-300">{text}</p>
    </div>
  );
}

function StatusPill({ tone, children }: { tone: "gold" | "green" | "red"; children: ReactNode }) {
  const className = {
    gold: "border-[#f0b429]/35 bg-[#f0b429]/10 text-[#f8d980]",
    green: "border-emerald-300/35 bg-emerald-300/10 text-emerald-200",
    red: "border-rose-300/35 bg-rose-300/10 text-rose-200",
  }[tone];

  return (
    <span className={`inline-flex min-h-8 items-center rounded-full border px-3 text-[10px] font-black uppercase tracking-[0.14em] ${className}`}>
      {children}
    </span>
  );
}

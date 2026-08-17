import Image from "next/image";
import Link from "next/link";
import LazyKidsGame from "@/components/kids/LazyKidsGame";
import { PARTNER_LINKS } from "@/lib/kids/activities";

export default function KidsClubGamesPage() {
  return (
    <main className="bg-[#f4f8fb] text-[#061121]">
      <section className="relative isolate overflow-hidden bg-[#030914] text-white">
        <Image
          src="/images/millstadt-ems/IMG_8516.jpeg"
          alt="Millstadt EMS ambulance at the community pool"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[55%_45%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,9,20,0.92)_0%,rgba(3,9,20,0.7)_50%,rgba(3,9,20,0.35)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030914]/85 via-transparent to-transparent" />

        <div className="wrap box-border relative z-10 py-16 md:py-24">
          <Link
            href="/kids-club"
            className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#f0b429] transition hover:text-[#ffd45c] focus:outline-none focus:ring-2 focus:ring-[#f0b429] focus:ring-offset-2 focus:ring-offset-[#030914]"
          >
            ← Kids Club
          </Link>
          <div className="mt-10 max-w-3xl">
            <div className="text-xs font-black uppercase tracking-[0.24em] text-[#f0b429]">
              Safety Games
            </div>
            <h1 className="mt-5 text-balance text-5xl font-black leading-[0.95] tracking-tight text-white md:text-7xl">
              More ways to practice safety.
            </h1>
            <p className="mt-6 max-w-2xl text-xl font-semibold leading-9 text-slate-200">
              Tap through the ambulance explorer, practice 911 decisions, and
              open extra grown-up approved safety resources.
            </p>
          </div>
        </div>
      </section>

      <LazyKidsGame game="ambulance" />

      <LazyKidsGame game="decisions" />

      <section style={{ paddingTop: 56, paddingBottom: 56 }}>
        <div className="wrap box-border">
          <div className="grid gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.24em] text-[#1b58c9]">
                Trusted Partners
              </div>
              <h2 className="mt-5 text-balance text-4xl font-black leading-tight text-[#061121] md:text-5xl">
                Hand-picked safety resources.
              </h2>
              <p className="mt-5 max-w-xl text-lg font-semibold leading-8 text-slate-700">
                Each link below opens in a new tab. We picked them because they
                line up with the same emergency basics kids learn at our
                station visits.
              </p>
              <div className="mt-8 rounded-2xl border border-[#061121]/10 bg-white p-6 shadow-lg shadow-slate-200/60">
                <div className="text-xs font-black uppercase tracking-[0.22em] text-[#1b58c9]">
                  Tip for Grown-Ups
                </div>
                <p className="mt-3 text-base font-semibold leading-7 text-slate-700">
                  Sit with your child for the first few minutes — ask what they
                  learned at the end. It sticks better when you talk it through
                  together.
                </p>
              </div>
            </div>

            <div className="grid gap-6">
              {PARTNER_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${link.name} opens in a new tab`}
                  className="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/70 transition hover:-translate-y-0.5 hover:border-[#1b58c9]/40 focus:outline-none focus:ring-2 focus:ring-[#1b58c9] focus:ring-offset-2 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex-1">
                    <div className="text-2xl font-black leading-tight text-[#061121]">
                      {link.name}
                    </div>
                    <p className="mt-3 text-base font-medium leading-7 text-slate-600">
                      {link.desc}
                    </p>
                  </div>
                  <span className="inline-flex h-12 shrink-0 items-center gap-2 self-start rounded-xl bg-[#061121] px-5 text-sm font-black uppercase tracking-[0.14em] text-white transition group-hover:bg-[#1b58c9] sm:self-center">
                    Open
                    <ExternalIcon className="h-4 w-4" />
                  </span>
                </a>
              ))}

              <Link
                href="/community-education"
                className="group flex flex-col gap-4 rounded-2xl border-2 border-[#061121] bg-[#061121] p-7 text-white shadow-xl shadow-slate-300/60 transition hover:-translate-y-0.5 hover:bg-[#1b58c9] hover:border-[#1b58c9] focus:outline-none focus:ring-2 focus:ring-[#f0b429] focus:ring-offset-2 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex-1">
                  <div className="text-xs font-black uppercase tracking-[0.22em] text-[#f0b429]">
                    Local Programs
                  </div>
                  <div className="mt-3 text-2xl font-black leading-tight text-white">
                    Millstadt EMS Community Education
                  </div>
                  <p className="mt-3 text-base font-medium leading-7 text-slate-300">
                    School visits, birthday visits, and safety talks — request
                    Millstadt EMS in person.
                  </p>
                </div>
                <span className="inline-flex h-12 shrink-0 items-center gap-2 self-start rounded-xl bg-[#f0b429] px-5 text-sm font-black uppercase tracking-[0.14em] text-[#061121] sm:self-center">
                  Visit
                  <ArrowRightIcon className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#061121] text-white" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <div className="wrap box-border">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.24em] text-[#f0b429]">
                Keep Exploring
              </div>
              <h2 className="mt-4 text-3xl font-black leading-tight text-white md:text-4xl">
                Want a coloring page or a monthly mission instead?
              </h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/kids-club/printables"
                className="inline-flex min-h-13 items-center justify-center rounded-xl bg-[#f0b429] px-6 text-sm font-black uppercase tracking-[0.14em] text-[#030914] transition hover:bg-[#ffd45c] focus:outline-none focus:ring-2 focus:ring-[#f0b429] focus:ring-offset-2 focus:ring-offset-[#061121]"
              >
                Printable Pages
              </Link>
              <Link
                href="/kids-club/activities"
                className="inline-flex min-h-13 items-center justify-center rounded-xl border-2 border-white/30 bg-white/5 px-6 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:border-[#f0b429] hover:bg-[#f0b429]/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#061121]"
              >
                Monthly Missions
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ExternalIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 4h6v6" />
      <path d="M20 4 10 14" />
      <path d="M20 14v6H4V4h6" />
    </svg>
  );
}

function ArrowRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </svg>
  );
}

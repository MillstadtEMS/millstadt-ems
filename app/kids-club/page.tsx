import Image from "next/image";
import Link from "next/link";

const featureCards = [
  {
    href: "/kids-club/activities",
    eyebrow: "Safety Missions",
    title: "24 EMS safety activities",
    text: "Age-track missions for 2-5 and 6-11 with useful safety concepts families can practice.",
    cta: "Open Missions",
    image: "/images/millstadt-ems/IMG_9307.jpeg",
  },
  {
    href: "/kids-club/printables",
    eyebrow: "Coloring Pages",
    title: "Print real Millstadt pages",
    text: "Custom ambulance, station, crew, and Kids Club pages with letter-size PDFs.",
    cta: "Open Printables",
    image: "/kids-club/coloring/whole-fleet.png",
  },
  {
    href: "/kids-club/games",
    eyebrow: "Safety Games",
    title: "More safety practice",
    text: "Extra games and videos for fire safety, emergencies, and family learning.",
    cta: "View Games",
    image: "/images/millstadt-ems/IMG_8516.jpeg",
  },
];

export default function KidsClubHubPage() {
  return (
    <main className="bg-[#030914] text-white">
      <section className="relative isolate overflow-hidden bg-[#030914]">
        <Image
          src="/images/millstadt-ems/pr.jpg"
          alt="Millstadt EMS visiting with local kids in front of an ambulance"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[55%_50%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#030914_0%,rgba(3,9,20,0.96)_38%,rgba(3,9,20,0.66)_70%,rgba(3,9,20,0.84)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,9,20,0.05),#030914_96%)]" />

        <div className="wrap box-border relative z-10 grid min-h-[760px] w-full min-w-0 max-w-full gap-14 overflow-hidden py-16 md:py-24 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:overflow-visible">
          <div
            className="box-border max-w-full min-w-0 lg:w-full lg:max-w-4xl"
            style={{ width: "min(100%, calc(100vw - 3rem))" }}
          >
            <div
              className="inline-flex max-w-full items-center gap-3 rounded-full border-2 border-[#22d3ee]/45 bg-[#030914]/85 px-5 py-3 shadow-2xl shadow-black/40 backdrop-blur sm:gap-4 sm:px-6"
              style={{
                fontFamily: "'Chalkboard SE', 'Comic Sans MS', 'Marker Felt', system-ui, sans-serif",
                letterSpacing: 0,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              <KidStarOfLife />
              <span className="text-[#fef3c7]">Millstadt EMS Youth Safety Program</span>
            </div>

            <div style={{ marginTop: 16 }}>
              <KidsClubWordmark />
            </div>

            <h2
              className="mt-7 text-2xl text-[#d7ff22] sm:text-3xl md:text-4xl"
              style={{
                fontFamily: "'Chalkboard SE', 'Comic Sans MS', 'Marker Felt', system-ui, sans-serif",
                fontWeight: 700,
                letterSpacing: 0,
              }}
            >
              Safety Missions for Local Kids
            </h2>

            <p className="mt-6 max-w-full text-xl font-semibold leading-9 text-slate-100 md:max-w-2xl md:text-2xl">
              Fun monthly safety missions, coloring pages, and easy emergency
              tips your family can practice together at home.
            </p>

            <div className="mt-10 flex max-w-full flex-col gap-4 sm:flex-row">
              <Link
                href="/kids-club/activities"
                className="box-border inline-flex min-h-14 w-full max-w-full items-center justify-center rounded-lg bg-[#f0b429] px-7 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-[#030914] shadow-[0_16px_36px_rgba(240,180,41,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ffd45c] focus:outline-none focus:ring-2 focus:ring-[#f0b429] focus:ring-offset-2 focus:ring-offset-[#030914] sm:w-auto"
              >
                Start This Month
              </Link>
              <Link
                href="/kids-club/printables"
                className="box-border inline-flex min-h-14 w-full max-w-full items-center justify-center gap-3 rounded-lg border border-white/25 bg-white/10 px-7 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-white backdrop-blur transition hover:-translate-y-0.5 hover:border-[#f0b429] hover:bg-[#f0b429]/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#030914] sm:w-auto"
              >
                Print Coloring Pages
                <PrintIcon className="h-5 w-5" />
              </Link>
            </div>
          </div>

          <div
            className="box-border relative mx-auto max-w-full min-w-0 lg:mr-0 lg:w-full lg:max-w-[560px]"
            style={{ width: "min(100%, calc(100vw - 3rem))" }}
          >
            <div className="rounded-lg border border-white/16 bg-[#071428]/82 p-5 shadow-2xl shadow-black/45 backdrop-blur-xl">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/15">
                <Image
                  src="/images/millstadt-ems/IMG_8516.jpeg"
                  alt="Millstadt EMS ambulance at the community pool"
                  fill
                  priority
                  sizes="(max-width: 1024px) 90vw, 520px"
                  className="object-cover object-center"
                />
              </div>
              <div className="mt-5 flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#030914] p-2">
                  <Image
                    src="/images/millstadt-ems/logo.png"
                    alt=""
                    fill
                    sizes="64px"
                    className="object-contain p-2"
                  />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-[#d7ff22]">
                    Made For Millstadt Families
                  </div>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-300">
                    Monthly safety missions, EMS coloring pages, and emergency
                    tips families can practice together.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#030914]" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div className="wrap box-border">
          <div
            className="mx-auto max-w-full text-center md:max-w-3xl"
            style={{ width: "min(100%, calc(100vw - 3rem))" }}
          >
            <div className="text-xs font-black uppercase tracking-[0.24em] text-[#f0b429]">
              Made For Millstadt Families
            </div>
            <h2 className="mt-6 text-3xl font-black leading-tight text-white sm:text-4xl md:text-6xl">
              Future Heroes Start Here.
            </h2>
            <p className="mt-6 text-lg font-medium leading-8 text-slate-400">
              Each month, kids can complete a new safety mission, learn what to
              do in an emergency, and become better prepared to help keep their
              family safe.
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {featureCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group flex min-h-[520px] flex-col overflow-hidden rounded-lg border border-white/12 bg-[#071428] shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:border-[#f0b429]/55 focus:outline-none focus:ring-2 focus:ring-[#f0b429] focus:ring-offset-2 focus:ring-offset-[#030914]"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[#0b1728]">
                  <Image
                    src={card.image}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071428] via-[#071428]/25 to-transparent" />
                </div>
                <div className="flex flex-1 flex-col p-8 md:p-9">
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f0b429]">
                    {card.eyebrow}
                  </div>
                  <h3 className="mt-5 text-3xl font-black leading-tight text-white sm:text-4xl">
                    {card.title}
                  </h3>
                  <p className="mt-5 text-lg font-medium leading-8 text-slate-300">
                    {card.text}
                  </p>
                  <div className="mt-auto pt-10">
                    <span className="inline-flex min-h-13 items-center rounded-lg border border-[#f0b429]/35 px-5 text-sm font-black uppercase tracking-[0.14em] text-[#f0b429] transition group-hover:bg-[#f0b429] group-hover:text-[#030914]">
                      {card.cta}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#030914]" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div className="wrap box-border">
          <div className="overflow-hidden rounded-lg border border-[#f0b429]/25 bg-[#071428]">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
              <div className="p-8 md:p-12">
                <div className="text-xs font-black uppercase tracking-[0.24em] text-[#f0b429]">
                  Bring It In
                </div>
                <h2 className="mt-5 max-w-2xl text-balance text-4xl font-black leading-tight text-white md:text-5xl">
                  Finished a mission or coloring sheet?
                </h2>
                <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-slate-400">
                  Bring it by the station. We love seeing what local kids are
                  learning.
                </p>
                <Link
                  href="/contact"
                  className="mt-8 inline-flex min-h-14 items-center rounded-lg bg-[#f0b429] px-7 py-4 text-sm font-black uppercase tracking-[0.16em] text-[#030914] transition hover:bg-[#ffd45c] focus:outline-none focus:ring-2 focus:ring-[#f0b429] focus:ring-offset-2 focus:ring-offset-[#071428]"
                >
                  Find Our Station
                </Link>
              </div>
              <div className="relative min-h-[340px]">
                <Image
                  src="/images/millstadt-ems/IMG_8392.jpeg"
                  alt="Millstadt EMS ambulance at night with fireworks overhead"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function KidsClubWordmark() {
  // Single compact line. Letters share one line-box; per-letter color via inline span.
  const letters = [
    { ch: "K", color: "#ff3d8b" },
    { ch: "I", color: "#a3e635" },
    { ch: "D", color: "#22d3ee" },
    { ch: "S", color: "#facc15" },
    { ch: " ", color: "" },
    { ch: "C", color: "#fb923c" },
    { ch: "L", color: "#f472b6" },
    { ch: "U", color: "#34d399" },
    { ch: "B", color: "#60a5fa" },
  ];
  return (
    <div
      aria-label="Millstadt EMS Kids Club"
      className="text-4xl sm:text-5xl md:text-6xl"
      style={{
        fontFamily: "'Chalkboard SE', 'Comic Sans MS', 'Marker Felt', system-ui, sans-serif",
        fontWeight: 900,
        lineHeight: 1,
        letterSpacing: 0,
        whiteSpace: "nowrap",
        display: "block",
      }}
    >
      <span className="sr-only">Millstadt EMS Kids Club</span>
      {letters.map((l, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            color: l.color || "transparent",
            WebkitTextStroke: l.color ? "2px rgba(3,9,20,0.55)" : "none",
            textShadow: l.color ? "0 4px 0 rgba(0,0,0,0.32), 0 8px 14px rgba(0,0,0,0.28)" : "none",
          }}
        >
          {l.ch === " " ? " " : l.ch}
        </span>
      ))}
    </div>
  );
}

function KidStarOfLife() {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
      }}
    >
      <svg viewBox="0 0 32 32" width="22" height="22">
        <g transform="translate(16 16)">
          <rect x="-3" y="-12" width="6" height="24" rx="1.6" fill="#22d3ee" />
          <rect x="-3" y="-12" width="6" height="24" rx="1.6" fill="#22d3ee" transform="rotate(60)" />
          <rect x="-3" y="-12" width="6" height="24" rx="1.6" fill="#22d3ee" transform="rotate(120)" />
          <circle r="3.2" fill="#fef3c7" />
        </g>
      </svg>
    </span>
  );
}

function PrintIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M6 3h12v5H6V3Zm12 14h1a3 3 0 0 0 3-3v-3a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v3a3 3 0 0 0 3 3h1v4h12v-4Zm-2 2H8v-5h8v5Zm3-6.75a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" />
    </svg>
  );
}

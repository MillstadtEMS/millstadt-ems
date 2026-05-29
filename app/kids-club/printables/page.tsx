import Image from "next/image";
import Link from "next/link";
import { COLORING_PAGES } from "@/lib/kids/activities";

export default function KidsClubPrintablesPage() {
  const [featured, ...rest] = COLORING_PAGES;
  // Sort so all landscapes (short) come first and the portraits (tall)
  // sit at the bottom — gives the grid a uniform look instead of a jagged
  // mix of aspect ratios.
  const sorted = [...rest].sort((a, b) => {
    if (a.orientation === b.orientation) return 0;
    return a.orientation === "landscape" ? -1 : 1;
  });

  return (
    <main className="bg-[#f4f8fb] text-[#061121]">
      <section className="relative isolate overflow-hidden bg-[#030914] text-white">
        <Image
          src="/images/millstadt-ems/pr.jpg"
          alt="Millstadt EMS crew with local kids in front of an ambulance"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[60%_45%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,9,20,0.88)_0%,rgba(3,9,20,0.6)_45%,rgba(3,9,20,0.2)_100%)]" />
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
              Color And Learn
            </div>
            <h1 className="mt-5 text-balance text-5xl font-black leading-[0.95] tracking-tight text-white md:text-7xl">
              Printable Pages
            </h1>
            <p className="mt-6 max-w-2xl text-xl font-semibold leading-9 text-slate-200">
              Pick one of our coloring book pages, print it at home, and bring
              it by the station — we&apos;d love to see how the crew looks in
              your colors.
            </p>
          </div>
        </div>
      </section>

      <section className="md:" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div className="wrap box-border">
          {featured && (
            <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.24em] text-[#1b58c9]">
                  Featured Printable
                </div>
                <h2 className="mt-5 text-balance text-4xl font-black leading-tight text-[#061121] md:text-6xl">
                  Start with the Millstadt EMS crest.
                </h2>
                <p className="mt-5 max-w-xl text-lg font-semibold leading-8 text-slate-700">
                  Print the crest page first, or scroll through the full set
                  below.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row" style={{ gap: 16 }}>
                  <a
                    href={`/kids-club/coloring/${featured.slug}.pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-[#061121] text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#1b58c9] focus:outline-none focus:ring-2 focus:ring-[#061121] focus:ring-offset-2"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 56, padding: "0 28px" }}
                  >
                    Print PDF
                    <PrintIcon style={{ width: 20, height: 20 }} />
                  </a>
                  <a
                    href={`/kids-club/coloring/${featured.slug}.png`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border-2 border-[#061121] bg-white text-sm font-black uppercase tracking-[0.14em] text-[#061121] transition hover:bg-[#d7ff22] focus:outline-none focus:ring-2 focus:ring-[#061121] focus:ring-offset-2"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 56, padding: "0 28px" }}
                  >
                    View Page
                  </a>
                </div>
              </div>

              <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-200/80 md:p-5">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-white">
                  <Image
                    src={`/kids-club/coloring/${featured.slug}.png`}
                    alt={featured.title}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 58vw"
                    className="object-contain p-3"
                  />
                </div>
                <div className="flex flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-2xl font-black text-[#061121]">{featured.title}</h3>
                  <span className="w-fit self-start rounded-full bg-[#f0b429] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#061121] sm:self-auto">
                    Page 1
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-20 border-t-2 border-[#061121]/10 pt-14">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.24em] text-[#1b58c9]">
                  Pick A Page
                </div>
                <h2 className="mt-4 text-4xl font-black leading-tight text-[#061121] md:text-5xl">
                  All printable pages
                </h2>
              </div>
              <Link
                href="/kids-club/activities"
                className="rounded-xl border-2 border-[#061121] bg-white text-sm font-black uppercase tracking-[0.14em] text-[#061121] transition hover:bg-[#f0b429] focus:outline-none focus:ring-2 focus:ring-[#061121] focus:ring-offset-2"
                style={{ display: "inline-flex", alignItems: "center", minHeight: 48, padding: "0 20px" }}
              >
                Monthly Missions
              </Link>
            </div>

            <div className="mt-10 grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
              {sorted.map((page, index) => (
                <article
                  key={page.slug}
                  className="flex flex-col rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/80"
                >
                  <div
                    className={`relative overflow-hidden rounded-[1.15rem] bg-white ${
                      page.orientation === "portrait" ? "aspect-[3/4]" : "aspect-[4/3]"
                    }`}
                  >
                    <Image
                      src={`/kids-club/coloring/${page.slug}.png`}
                      alt={page.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="object-contain p-3"
                    />
                    <span className="absolute right-4 top-4 grid h-12 w-12 place-items-center rounded-full bg-[#f0b429] text-lg font-black text-[#061121] shadow-lg shadow-white/70">
                      {index + 2}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col px-1 pb-1 pt-5">
                    <h3 className="text-2xl font-black leading-tight text-[#061121]">
                      {page.title}
                    </h3>
                    <div className="mt-6" style={{ display: "grid", gridTemplateColumns: "1fr 56px", gap: 12 }}>
                      <a
                        href={`/kids-club/coloring/${page.slug}.pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl bg-[#061121] text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#1b58c9] focus:outline-none focus:ring-2 focus:ring-[#061121] focus:ring-offset-2"
                        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 52, padding: "0 20px" }}
                      >
                        Print
                        <PrintIcon style={{ width: 16, height: 16 }} />
                      </a>
                      <a
                        href={`/kids-club/coloring/${page.slug}.png`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`View ${page.title}`}
                        className="rounded-xl border-2 border-[#061121] bg-white text-[#061121] transition hover:bg-[#d7ff22] focus:outline-none focus:ring-2 focus:ring-[#061121] focus:ring-offset-2"
                        style={{ display: "grid", placeItems: "center", minHeight: 52 }}
                      >
                        <EyeIcon style={{ width: 20, height: 20 }} />
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function PrintIcon({ className = "h-5 w-5", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" aria-hidden>
      <path d="M6 3h12v5H6V3Zm12 14h1a3 3 0 0 0 3-3v-3a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v3a3 3 0 0 0 3 3h1v4h12v-4Zm-2 2H8v-5h8v5Zm3-6.75a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" />
    </svg>
  );
}

function EyeIcon({ className = "h-5 w-5", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" aria-hidden>
      <path d="M12 5c5.2 0 9.35 4.1 10.75 7-1.4 2.9-5.55 7-10.75 7S2.65 14.9 1.25 12C2.65 9.1 6.8 5 12 5Zm0 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-2.2a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6Z" />
    </svg>
  );
}

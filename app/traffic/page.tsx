import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Traffic",
  description:
    "Live traffic conditions for Millstadt, Illinois and key St. Louis area bridges — Poplar Street, Jefferson Barracks, Stan Musial, Eads, MLK, and McKinley.",
};

const maps = [
  {
    label: "Millstadt",
    sublabel: "Local Area",
    src: "https://embed.waze.com/iframe?zoom=15&lat=38.460643&lon=-90.090448&ct=livemap",
    accent: "text-[#f0b429]",
    span: "lg:col-span-2",
  },
  {
    label: "Poplar Street Bridge",
    sublabel: "I-64 / US-40 Mississippi Crossing",
    src: "https://embed.waze.com/iframe?zoom=13&lat=38.609562&lon=-90.195805&ct=livemap",
    accent: "text-[#2563eb]",
    span: "",
  },
  {
    label: "Jefferson Barracks Bridge",
    sublabel: "South St. Louis Crossing",
    src: "https://embed.waze.com/iframe?zoom=13&lat=38.487054&lon=-90.299807&ct=livemap",
    accent: "text-[#2563eb]",
    span: "",
  },
  {
    label: "Downtown Bridges",
    sublabel: "Stan Musial · McKinley · Eads · MLK",
    src: "https://embed.waze.com/iframe?zoom=14&lat=38.648623&lon=-90.179691&ct=livemap",
    accent: "text-[#f0b429]",
    span: "lg:col-span-2",
  },
];

export default function TrafficPage() {
  return (
    <>
      {/* Page Header */}
      <section className="relative pt-16 pb-28 bg-[#040d1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        <div className="relative wrap">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Live · Powered by Waze</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6">
            Traffic
          </h1>
          <p className="text-slate-400 text-xl max-w-2xl leading-relaxed">
            Live traffic conditions for Millstadt and key St. Louis river crossings.
          </p>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-16 bg-[#040d1a]" />

      {/* Maps grid */}
      <section className="pb-40 bg-[#040d1a]">
        <div className="wrap">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {maps.map((m) => (
              <div
                key={m.label}
                className={`rounded-2xl bg-[#071428] border border-white/8 flex flex-col ${m.span}`}
              >
                {/* Card header */}
                <div className="px-8 py-6 border-b border-white/8 flex items-center justify-between gap-6">
                  <div>
                    <div className={`${m.accent} text-xs font-black tracking-[0.2em] uppercase mb-1.5`}>
                      {m.sublabel}
                    </div>
                    <h2 className="text-white font-black text-2xl">{m.label}</h2>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-400 text-[10px] font-black tracking-widest uppercase">Live</span>
                  </div>
                </div>

                {/* Waze iframe — taller aspect ratio */}
                <div className="relative w-full overflow-hidden rounded-b-2xl" style={{ paddingBottom: "62%" }}>
                  <iframe
                    src={m.src}
                    className="absolute inset-0 w-full h-full"
                    style={{ border: 0 }}
                    allowFullScreen
                    title={`${m.label} live traffic map`}
                    loading="lazy"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-20 bg-[#040d1a]" />
    </>
  );
}

import type { Metadata } from "next";
import WeatherClient from "./WeatherClient";

export const metadata: Metadata = {
  title: "Weather",
  description:
    "Live weather conditions, 7-day forecast, and NEXRAD radar for Millstadt, Illinois. Powered by the National Weather Service.",
};

export default function WeatherPage() {
  return (
    <>
      {/* Page Header */}
      <section className="relative pt-16 pb-28 bg-[#040d1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        <div className="relative wrap">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">National Weather Service</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6">
            Local Weather
          </h1>
          <p className="text-slate-400 text-xl max-w-xl leading-relaxed">
            Live conditions, forecast, and NEXRAD radar for Millstadt and St. Clair County, Illinois.
          </p>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-16 bg-[#040d1a]" />

      <WeatherClient />

      {/* ── VOID ── */}
      <div className="h-20 bg-[#040d1a]" />
    </>
  );
}

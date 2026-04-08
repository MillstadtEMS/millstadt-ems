import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Community Events",
  description:
    "Stay up to date with Millstadt Ambulance Service community events, public appearances, safety demonstrations, and local happenings.",
};

// ── SETUP INSTRUCTIONS ──────────────────────────────────────────────────────
// 1. Go to calendar.google.com and sign in with the Millstadt EMS Google account.
// 2. Open the calendar you want to display → Settings → "Integrate calendar".
// 3. Copy the "Calendar ID" (looks like: abc123@group.calendar.google.com).
// 4. Replace YOUR_CALENDAR_ID_HERE below with that ID.
// 5. To make events public: Settings → Access permissions → check "Make available to public".
// ────────────────────────────────────────────────────────────────────────────
const GOOGLE_CALENDAR_ID = "10235a6f36b714b6c4670bc575e228e67be3024e97feb44585a33e4171fecc86@group.calendar.google.com";
const CALENDAR_EMBED_URL = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(GOOGLE_CALENDAR_ID)}&ctz=America%2FChicago&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&mode=MONTH&bgcolor=%23040d1a&color=%23F0B429`;

export default function EventsPage() {
  return (
    <>
      {/* Page Header */}
      <section className="relative pt-16 pb-28 bg-[#040d1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        <div className="relative wrap">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Community</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-10">
            Community Events
          </h1>
          <div className="flex items-start gap-4 max-w-2xl">
            <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={20} height={20} className="shrink-0 mt-1" style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 3px #f0b429)" }} />
            <span className="text-slate-300 text-xl leading-relaxed">A live look at upcoming community events, public appearances, and local happenings in and around Millstadt.</span>
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-24 bg-[#040d1a]" />

      {/* Calendar */}
      <section className="pb-40 bg-[#040d1a]">
        <div className="wrap">
          <div className="flex items-center gap-4 mb-10">
            <Image src="/images/millstadt-ems/star-of-life.png" alt="" width={32} height={32} style={{ filter: "hue-rotate(180deg) saturate(2) brightness(1.1) drop-shadow(0 0 4px #f0b429)" }} />
            <span className="text-[#f0b429] text-2xl font-black tracking-[0.15em] uppercase">Event Calendar</span>
          </div>

          <div className="rounded-2xl overflow-hidden border border-white/8 shadow-2xl shadow-black/40">
            <iframe
              src={CALENDAR_EMBED_URL}
              style={{ border: 0 }}
              width="100%"
              height="700"
              title="Millstadt EMS Community Calendar"
            />
          </div>
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-[#040d1a]" />
    </>
  );
}

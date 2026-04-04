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
const GOOGLE_CALENDAR_ID = "memscommunityevents@gmail.com";
const CALENDAR_EMBED_URL = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(GOOGLE_CALENDAR_ID)}&ctz=America%2FChicago&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&mode=MONTH&bgcolor=%23040d1a&color=%23F0B429`;

export default function EventsPage() {
  const calendarReady = GOOGLE_CALENDAR_ID !== "YOUR_CALENDAR_ID_HERE";

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

          {calendarReady ? (
            <div className="rounded-2xl overflow-hidden border border-white/8 shadow-2xl shadow-black/40">
              <iframe
                src={CALENDAR_EMBED_URL}
                style={{ border: 0 }}
                width="100%"
                height="700"
                title="Millstadt EMS Community Calendar"
              />
            </div>
          ) : (
            <div className="rounded-2xl bg-[#071428] border border-white/8 p-20 flex flex-col items-center justify-center min-h-[500px] text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#1a3a6e]/60 border border-[#2563eb]/20 flex items-center justify-center mb-8">
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current text-[#f0b429]">
                  <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
                </svg>
              </div>
              <h3 className="text-white font-black text-3xl mb-4">Calendar Coming Soon</h3>
              <p className="text-slate-400 text-lg max-w-md leading-relaxed mb-3">
                The community calendar will be live here once the Google Calendar is connected.
              </p>
              <p className="text-slate-600 text-sm max-w-sm leading-relaxed">
                To set up: add your Google Calendar ID to <code className="text-slate-500">app/events/page.tsx</code> where it says <code className="text-slate-500">YOUR_CALENDAR_ID_HERE</code>.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── VOID ── */}
      <div className="h-40 bg-[#040d1a]" />
    </>
  );
}

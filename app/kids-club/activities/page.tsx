"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ACTIVITIES_BY_MONTH,
  MONTH_NAMES,
  type KidsActivity,
} from "@/lib/kids/activities";

export default function KidsClubActivitiesPage() {
  const currentMonth = new Date().getMonth();
  const [month, setMonth] = useState(currentMonth);
  const activities = useMemo(() => ACTIVITIES_BY_MONTH[month] ?? [], [month]);

  return (
    <main className="bg-[#f4f8fb] text-[#061121]">
      <section className="relative isolate overflow-hidden bg-[#030914] text-white">
        <Image
          src="/images/millstadt-ems/IMG_9307.jpeg"
          alt="Millstadt EMS crew with an ambulance"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#030914_0%,rgba(3,9,20,0.92)_48%,rgba(3,9,20,0.62)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030914] via-transparent to-transparent" />

        <div className="wrap box-border relative z-10 py-16 md:py-24">
          <Link
            href="/kids-club"
            className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#f0b429] transition hover:text-[#ffd45c] focus:outline-none focus:ring-2 focus:ring-[#f0b429] focus:ring-offset-2 focus:ring-offset-[#030914]"
          >
            ← Kids Club
          </Link>
          <div className="mt-10 max-w-3xl">
            <div className="text-xs font-black uppercase tracking-[0.24em] text-[#f0b429]">
              Monthly Rotation
            </div>
            <h1 className="mt-5 text-balance text-5xl font-black leading-[0.95] tracking-tight text-white md:text-7xl">
              Safety Missions
            </h1>
            <p className="mt-6 max-w-2xl text-xl font-semibold leading-9 text-slate-200">
              Two original EMS activities each month, written for families and
              built around real safety habits kids can practice at home.
            </p>
          </div>
        </div>
      </section>

      <section className="md:" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div className="wrap box-border">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
            <aside className="lg:sticky lg:top-36">
              <div className="rounded-[1.4rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 md:p-8">
                <div className="text-xs font-black uppercase tracking-[0.22em] text-[#1b58c9]">
                  Now Showing
                </div>
                <div className="mt-3 text-5xl font-black leading-none text-[#061121]">
                  {MONTH_NAMES[month]}
                </div>
                {month === currentMonth && (
                  <div className="mt-4 inline-flex rounded-full bg-[#f0b429] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#061121]">
                    Current Month
                  </div>
                )}

                <div className="mt-8 grid grid-cols-[3.5rem_1fr_3.5rem] gap-3">
                  <button
                    type="button"
                    onClick={() => setMonth((m) => (m + 11) % 12)}
                    aria-label="Previous month"
                    className="min-h-14 rounded-xl border border-slate-300 bg-white text-2xl font-black transition hover:border-[#f0b429] hover:bg-[#f0b429] focus:outline-none focus:ring-2 focus:ring-[#061121] focus:ring-offset-2"
                  >
                    ‹
                  </button>
                  <select
                    value={month}
                    onChange={(event) => setMonth(Number(event.target.value))}
                    className="min-h-14 rounded-xl border border-slate-300 bg-white px-5 text-center text-base font-black text-[#061121] outline-none focus:ring-2 focus:ring-[#061121] focus:ring-offset-2"
                  >
                    {MONTH_NAMES.map((name, index) => (
                      <option key={name} value={index}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setMonth((m) => (m + 1) % 12)}
                    aria-label="Next month"
                    className="min-h-14 rounded-xl border border-slate-300 bg-white text-2xl font-black transition hover:border-[#f0b429] hover:bg-[#f0b429] focus:outline-none focus:ring-2 focus:ring-[#061121] focus:ring-offset-2"
                  >
                    ›
                  </button>
                </div>

                <div className="mt-8 border-t border-[#061121]/15 pt-6">
                  <div className="text-sm font-black uppercase tracking-[0.16em] text-[#061121]">
                    Mission Plan
                  </div>
                  <ol className="mt-5 space-y-4">
                    {[
                      "Pick this month's mission.",
                      "Do it with a grown-up.",
                      "Bring it by the station.",
                    ].map((step, index) => (
                      <li key={step} className="flex items-center gap-4">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#061121] text-lg font-black text-[#f0b429]">
                          {index + 1}
                        </span>
                        <span className="text-base font-bold leading-6 text-slate-700">
                          {step}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="mt-8 rounded-[1.4rem] bg-[#061121] p-7 text-white shadow-xl shadow-slate-300/20">
                <div className="text-xs font-black uppercase tracking-[0.22em] text-[#f0b429]">
                  Print A Page
                </div>
                <p className="mt-3 text-base font-semibold leading-7 text-slate-300">
                  Print a Millstadt EMS coloring page after you finish your
                  mission.
                </p>
                <Link
                  href="/kids-club/printables"
                  className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-[#f0b429] px-5 text-sm font-black uppercase tracking-[0.14em] text-[#061121] transition hover:bg-[#ffd45c] focus:outline-none focus:ring-2 focus:ring-[#f0b429] focus:ring-offset-2 focus:ring-offset-[#061121]"
                >
                  Open Printables
                </Link>
              </div>
            </aside>

            <div className="space-y-8">
              {activities.map((activity, index) => (
                <MissionCard
                  key={activity.title}
                  activity={activity}
                  index={index}
                  accent={index === 0 ? "blue" : "gold"}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function MissionCard({
  activity,
  index,
  accent,
}: {
  activity: KidsActivity;
  index: number;
  accent: "blue" | "gold";
}) {
  const accentClass =
    accent === "blue"
      ? "bg-[#26c6ee] text-[#061121]"
      : "bg-[#f0b429] text-[#061121]";
  const borderClass = accent === "blue" ? "border-[#26c6ee]" : "border-[#f0b429]";

  return (
    <article className={`relative overflow-hidden rounded-[1.6rem] border-t-8 ${borderClass} bg-white p-7 shadow-2xl shadow-slate-200/70 sm:p-8 md:p-10 lg:p-12`}>
      <div className="mb-8 flex flex-col gap-5 border-b border-[#061121]/12 pb-7 sm:mb-9 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl font-black ${accentClass}`}>
            {index + 1}
          </div>
          <div className="inline-flex rounded-full bg-[#061121] px-5 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-white">
            Safety Mission
          </div>
        </div>
        <div className="inline-flex w-fit rounded-full border border-slate-300 bg-slate-50 px-5 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-[#061121]">
          {activity.ages}
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[0.82fr_1.18fr]">
        <div>
          <h2 className="text-balance text-3xl font-black leading-tight text-[#061121] sm:text-4xl md:text-5xl">
            {activity.title}
          </h2>
          <p className="mt-5 text-base font-semibold leading-7 text-slate-700 sm:text-lg sm:leading-8">
            {activity.blurb}
          </p>

          <div className="mt-8">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-[#1b58c9]">
              Supplies
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {activity.youNeed.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-black text-[#061121]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] bg-[#f4f8fb] p-5 sm:p-6 md:p-7">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-[#1b58c9]">
            Mission Steps
          </div>
          <ol className="mt-5 space-y-4">
            {activity.steps.map((step, stepIndex) => (
              <li key={step} className="grid grid-cols-[2.75rem_1fr] gap-4 sm:grid-cols-[3.25rem_1fr]">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#061121] text-base font-black text-white sm:h-12 sm:w-12 sm:text-lg">
                  {stepIndex + 1}
                </span>
                <span className="pt-1.5 text-base font-semibold leading-7 text-slate-800 sm:pt-2 sm:text-lg sm:leading-8">
                  {step}
                </span>
              </li>
            ))}
          </ol>
          {activity.sheet && (
            <a
              href={`/kids-club/activities/${activity.sheet}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex min-h-12 items-center rounded-xl bg-[#061121] px-5 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#1b58c9] focus:outline-none focus:ring-2 focus:ring-[#061121] focus:ring-offset-2"
            >
              Print Activity
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

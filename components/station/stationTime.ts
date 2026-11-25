"use client";

import { useSyncExternalStore } from "react";

// One shared clock for the station TV, ticking on the second boundary, in Central time (Millstadt).
// Older TV browsers without time-zone data fall back to the US Central rules computed here.

let second = 0;
let timer: number | undefined;
const listeners = new Set<() => void>();

function tick() {
  second = Math.floor(Date.now() / 1000);
  listeners.forEach((listener) => listener());
  timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    second = Math.floor(Date.now() / 1000);
    timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.clearTimeout(timer);
  };
}

/** The current Unix second (0 on the server and the first paint). */
export function useStationSecond() {
  return useSyncExternalStore(subscribe, () => second, () => 0);
}

export type CentralParts = {
  year: number; month: number; day: number; hour: number; minute: number; second: number;
  weekday: number; zone: "CST" | "CDT";
};

let intlOk: boolean | null = null;
const formatter = (() => {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago", year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23", weekday: "short", timeZoneName: "short",
    });
  } catch { return null; }
})();
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** US Central: CDT from 2 a.m. on the second Sunday in March to 2 a.m. on the first Sunday in November. */
function manualCentral(date: Date): CentralParts {
  const year = date.getUTCFullYear();
  const nthSunday = (month: number, n: number) => {
    const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
    return 1 + ((7 - first) % 7) + (n - 1) * 7;
  };
  const dstStart = Date.UTC(year, 2, nthSunday(2, 2), 8);   // 2 a.m. CST = 08:00 UTC
  const dstEnd = Date.UTC(year, 10, nthSunday(10, 1), 7);   // 2 a.m. CDT = 07:00 UTC
  const daylight = date.getTime() >= dstStart && date.getTime() < dstEnd;
  const local = new Date(date.getTime() - (daylight ? 5 : 6) * 3600_000);
  return {
    year: local.getUTCFullYear(), month: local.getUTCMonth() + 1, day: local.getUTCDate(),
    hour: local.getUTCHours(), minute: local.getUTCMinutes(), second: local.getUTCSeconds(),
    weekday: local.getUTCDay(), zone: daylight ? "CDT" : "CST",
  };
}

export function centralParts(date: Date): CentralParts {
  if (formatter && intlOk !== false) {
    try {
      const parts = formatter.formatToParts(date);
      const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
      const result: CentralParts = {
        year: Number(get("year")), month: Number(get("month")), day: Number(get("day")),
        hour: Number(get("hour")) % 24, minute: Number(get("minute")), second: Number(get("second")),
        weekday: weekdays.indexOf(get("weekday")), zone: get("timeZoneName").includes("D") ? "CDT" : "CST",
      };
      if (Object.values(result).every((v) => typeof v === "string" || Number.isFinite(v)) && result.weekday >= 0) {
        intlOk = true;
        return result;
      }
    } catch { /* fall through */ }
    intlOk = false;
  }
  return manualCentral(date);
}

export const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export type Holiday =
  | { kind: "countdown"; days: number; hours: number; minutes: number; seconds: number }
  | { kind: "christmas" }
  | { kind: "new-year"; days: number }
  | { kind: "happy-new-year" };

/** Counting down to midnight on Christmas morning in Millstadt (December is always CST, UTC-6). */
export function holidayAt(unixSecond: number): Holiday {
  const now = centralParts(new Date(unixSecond * 1000));
  if (now.month === 12 && now.day === 25) return { kind: "christmas" };
  if (now.month === 12 && now.day > 25) return { kind: "new-year", days: 32 - now.day };
  if (now.month === 1 && now.day === 1) return { kind: "happy-new-year" };
  const year = now.month === 1 ? now.year : now.year;
  const left = Math.max(0, Date.UTC(year, 11, 25, 6) / 1000 - unixSecond);
  return {
    kind: "countdown",
    days: Math.floor(left / 86400), hours: Math.floor(left / 3600) % 24,
    minutes: Math.floor(left / 60) % 60, seconds: left % 60,
  };
}

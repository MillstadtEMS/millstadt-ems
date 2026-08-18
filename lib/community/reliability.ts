import type { CommunityAlert, CommunityAlertState } from "@/lib/community/alerts";

export const CHICAGO_TIME_ZONE = "America/Chicago";
export const COMMUNITY_SOURCE_FRESHNESS_MS = 10 * 60 * 1000;
export const POSTGAME_WINDOW_MS = 2 * 60 * 60 * 1000;

export type ChicagoClock = {
  dateKey: string;
  hour: number;
};

export function chicagoClock(date: Date): ChicagoClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
  };
}

export function adjacentDateKey(dateKey: string, offset: -1 | 1) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const adjacent = new Date(Date.UTC(year, month - 1, day + offset, 12));
  return adjacent.toISOString().slice(0, 10);
}

export function chicagoLocalTimeToUtc(dateKey: string, hour: number, minute = 0) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const targetWallClock = Date.UTC(year, month - 1, day, hour, minute);
  let guess = targetWallClock;

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: CHICAGO_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(guess));
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value ?? 0);
    const representedWallClock = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second"),
    );
    guess += targetWallClock - representedWallClock;
  }

  return new Date(guess);
}

function localDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function calendarDateKey(date: Date, isFullDay: boolean) {
  return isFullDay ? localDateKey(date) : chicagoClock(date).dateKey;
}

export function normalizeCalendarInterval(start: Date, end: Date, isFullDay: boolean) {
  if (!isFullDay) return { start, end };
  return {
    start: chicagoLocalTimeToUtc(calendarDateKey(start, true), 0),
    end: chicagoLocalTimeToUtc(calendarDateKey(end, true), 0),
  };
}

export function scheduledDisplayEndsAt(start: Date, gameDateKey = chicagoClock(start).dateKey) {
  const localMidnight = chicagoLocalTimeToUtc(adjacentDateKey(gameDateKey, 1), 0);
  const twoHoursAfterStart = new Date(start.getTime() + POSTGAME_WINDOW_MS);
  return localMidnight > twoHoursAfterStart ? localMidnight : twoHoursAfterStart;
}

export function sportsDisplayWindow(options: {
  now: Date;
  start: Date;
  gameDateKey: string;
  state: Extract<CommunityAlertState, "upcoming" | "live" | "final">;
  completedAt?: Date;
}) {
  const { now, start, gameDateKey, state } = options;
  const clock = chicagoClock(now);
  const isGameDay = gameDateKey === clock.dateKey;
  const launched = isGameDay ? clock.hour >= 7 : start < now;

  if (state === "live") {
    return { visible: launched, endsAt: undefined };
  }

  if (state === "final") {
    if (!options.completedAt || Number.isNaN(options.completedAt.getTime())) {
      return { visible: false, endsAt: undefined };
    }
    const localMidnight = chicagoLocalTimeToUtc(adjacentDateKey(gameDateKey, 1), 0);
    const postgameEndsAt = new Date(options.completedAt.getTime() + POSTGAME_WINDOW_MS);
    const endsAt = localMidnight > postgameEndsAt ? localMidnight : postgameEndsAt;
    return { visible: launched && now < endsAt, endsAt };
  }

  const endsAt = scheduledDisplayEndsAt(start, gameDateKey);
  return { visible: isGameDay && launched && now < endsAt, endsAt };
}

function validTimestamp(value: string | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function pruneExpiredAlerts(
  alerts: CommunityAlert[],
  now = new Date(),
  freshnessMs = COMMUNITY_SOURCE_FRESHNESS_MS,
) {
  const nowMs = now.getTime();
  return alerts.filter((alert) => {
    const checkedAt = validTimestamp(alert.lastUpdatedAt ?? alert.checkedAt);
    if (checkedAt === null || checkedAt > nowMs + 60_000 || nowMs - checkedAt > freshnessMs) return false;

    if (!alert.endsAt) return true;
    const endsAt = validTimestamp(alert.endsAt);
    return endsAt !== null && endsAt > nowMs;
  });
}

export function communityVisibleGroupLimit(viewportWidth: number) {
  if (viewportWidth < 768) return 0;
  if (viewportWidth < 1024) return 1;
  if (viewportWidth < 1280) return 2;
  return 3;
}

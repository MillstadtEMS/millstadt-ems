import "server-only";

import { Observer, SearchLocalSolarEclipse } from "astronomy-engine";
import * as ical from "node-ical";
import { z } from "zod";
import {
  adjacentDateKey,
  calendarDateKey,
  CHICAGO_TIME_ZONE as CENTRAL_TIME_ZONE,
  chicagoClock as centralClock,
  chicagoLocalTimeToUtc as centralLocalTimeToUtc,
  normalizeCalendarInterval,
  pruneExpiredAlerts,
  scheduledDisplayEndsAt as gameDisplayEndsAt,
  sportsDisplayWindow,
} from "@/lib/community/reliability";
import {
  normalizeMlbSchedule,
  normalizeNhlScore,
  type NormalizedGameState,
} from "@/lib/community/sports";
import { getMcsScheduleSnapshot } from "@/lib/community/mcs-schedule";

const CARDINALS_TEAM_ID = 138;
const BLUES_ABBREVIATION = "STL";
const REQUEST_TIMEOUT_MS = 8_000;

const CARDINALS_SCHEDULE_URL = "https://www.mlb.com/cardinals/schedule";
const BLUES_SCHEDULE_URL = "https://www.nhl.com/blues/schedule";
const CITY_SCHEDULE_URL = "https://www.stlcitysc.com/schedule/matches";
const CITY_CALENDAR_URL =
  "https://calendar.google.com/calendar/ical/d9c0eaefc381af39120859813a5bbf438cd051dc133acd96b654c7fe5edfc9ed%40group.calendar.google.com/public/basic.ics";
const EMS_CALENDAR_URL =
  "https://calendar.google.com/calendar/ical/10235a6f36b714b6c4670bc575e228e67be3024e97feb44585a33e4171fecc86%40group.calendar.google.com/public/basic.ics";
const ST_JAMES_CALENDAR_URL =
  "https://calendar.google.com/calendar/ical/stjamesmillstadt.com_eisminfqo0hm62h6i592hj54ik%40group.calendar.google.com/public/basic.ics";
const ST_JAMES_SCHOOL_URL = "https://www.stjmillstadt.org/st-james-school/";
const BELLEVILLE_WEST_SPORTS_URL = "https://www.bwestathletics.org/";
const BELLEVILLE_WEST_FEED_URL = "https://manage-api.snap.app/";
const ASTRONOMY_ENGINE_URL = "https://github.com/cosinekitty/astronomy";
const MILLSTADT_OBSERVER = new Observer(38.4578, -89.9776, 160);

export type CommunityAlertKind = "sports" | "school" | "flag" | "sky" | "event";
export type CommunityAlertState = "upcoming" | "live" | "final" | "active";
export type CommunityAlertBrand =
  | "cardinals"
  | "blues"
  | "city-sc"
  | "millstadt-ccsd"
  | "st-james"
  | "belleville-west"
  | "sky-meteor"
  | "sky-eclipse"
  | "sky-conjunction"
  | "generic";

export type CommunityAlert = {
  id: string;
  kind: CommunityAlertKind;
  brand: CommunityAlertBrand;
  state: CommunityAlertState;
  priority: number;
  title: string;
  summary: string;
  detail?: string;
  startsAt?: string;
  endsAt?: string;
  sourceName: string;
  sourceUrl: string;
  checkedAt: string;
  gameStatus?: string;
  homeScore?: number;
  awayScore?: number;
  inning?: number;
  half?: "top" | "middle" | "bottom" | "end";
  period?: number;
  clock?: string;
  matchHalf?: string;
  matchTime?: string;
  lastUpdatedAt?: string;
  final?: boolean;
};

const snapScheduleSchema = z.object({
  data: z.object({
    manageOrganization: z.object({
      eventsForOrganization: z.object({
        list: z.array(
          z.object({
            eventId: z.number(),
            eventDate: z.string(),
            eventDateTime: z.string().nullish(),
            startTime: z.string().nullish(),
            place: z.string().nullish(),
            title: z.string().nullish(),
            location: z.string().nullish(),
            opponent: z.string().nullish(),
            gs: z.string().nullish(),
            cancellationStatus: z.string().nullish(),
            level: z.string().nullish(),
            programForEvent: z.object({
              sportName: z.string().nullish(),
              gender: z.string().nullish(),
              level: z.string().nullish(),
            }).nullish(),
          }),
        ),
      }),
    }),
  }),
});

const manualAlertSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["sports", "school", "flag", "sky", "event"]),
  brand: z.enum(["cardinals", "blues", "city-sc", "millstadt-ccsd", "st-james", "belleville-west", "sky-meteor", "sky-eclipse", "sky-conjunction", "generic"]).optional(),
  title: z.string().min(1),
  summary: z.string().min(1),
  detail: z.string().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  sourceName: z.string().min(1),
  sourceUrl: z.string().url(),
  verified: z.literal(true),
  priority: z.number().int().min(2).max(5).optional(),
});

const previousDateKey = (dateKey: string) => adjacentDateKey(dateKey, -1);

function formatCentralTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const military = new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  const familiar = new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return `${military} (${familiar})`;
}

function seriesLabel(gameType?: string) {
  if (gameType === "S") return "Spring training";
  if (gameType === "F" || gameType === "D" || gameType === "L" || gameType === "W") {
    return "Postseason";
  }
  return "Regular season";
}

async function fetchJson(
  url: string,
  init: {
    method?: "GET" | "POST";
    body?: string;
    headers?: Record<string, string>;
  } = {},
) {
  const response = await fetch(url, {
    method: init.method,
    body: init.body,
    headers: {
      Accept: "application/json",
      "User-Agent": "Millstadt EMS website (millstadtems.org)",
      ...init.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Source returned ${response.status}`);
  return response.json() as Promise<unknown>;
}

function gameIsVisibleToday(now: Date, gameStart: Date, gameDateKey = centralClock(gameStart).dateKey) {
  const clock = centralClock(now);
  const displayEndsAt = gameDisplayEndsAt(gameStart, gameDateKey);
  const isGameDay = gameDateKey === clock.dateKey;
  const isLateCarryover = gameDateKey !== clock.dateKey && gameStart < now && now < displayEndsAt;

  return {
    displayEndsAt,
    visible: (isGameDay && clock.hour >= 7 && now < displayEndsAt) || isLateCarryover,
  };
}

function dateKeyFromUsDate(value: string) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  return `${match[3]}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
}

function centralDateTime(dateKey: string, timeLabel: string | null | undefined) {
  const match = /^(\d{1,2}):(\d{2})\s*([AP]M)$/i.exec(timeLabel?.trim() ?? "");
  if (!match) return centralLocalTimeToUtc(dateKey, 0);

  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return centralLocalTimeToUtc(dateKey, hour, Number(match[2]));
}

function hasUsableTime(timeLabel: string | null | undefined) {
  return /^(\d{1,2}):(\d{2})\s*([AP]M)$/i.test(timeLabel?.trim() ?? "");
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/calendar",
      "User-Agent": "Millstadt EMS website (millstadtems.org)",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Source returned ${response.status}`);
  return response.text();
}

const observedFinals = new Map<string, Date>();

function completionTime(
  id: string,
  state: NormalizedGameState,
  providerCompletion: Date | undefined,
  gameStart: Date,
  observedAt: Date,
) {
  if (state !== "final") {
    observedFinals.delete(id);
    return undefined;
  }
  if (providerCompletion && !Number.isNaN(providerCompletion.getTime())) return providerCompletion;
  const conservativeFallback = new Date(gameStart.getTime() + 4 * 60 * 60 * 1000);
  const firstObservation = observedFinals.get(id)
    ?? (observedAt < conservativeFallback ? observedAt : conservativeFallback);
  observedFinals.set(id, firstObservation);
  return firstObservation;
}

function mlbProgress(state: NormalizedGameState, inning?: number, half?: CommunityAlert["half"]) {
  if (!inning) return undefined;
  if (state === "final") return inning > 9 ? `Final/${inning}` : "Final";
  const label = half === "top" ? "Top" : half === "bottom" ? "Bottom" : half === "middle" ? "Mid" : half === "end" ? "End" : undefined;
  return label ? `${label} ${inning}` : `Inning ${inning}`;
}

function nhlProgress(state: NormalizedGameState, period?: number, clock?: string, periodType?: string) {
  if (state === "final") return periodType && periodType !== "REG" ? `Final/${periodType}` : "Final";
  if (!period) return undefined;
  return [periodType && periodType !== "REG" ? periodType : `P${period}`, clock].filter(Boolean).join(" ");
}

async function getCardinalsAlerts(now: Date): Promise<CommunityAlert[]> {
  const clock = centralClock(now);
  const dates = [previousDateKey(clock.dateKey), clock.dateKey];
  const checkedAt = now.toISOString();
  const responses = await Promise.all(
    dates.map((date) =>
      fetchJson(
        `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${CARDINALS_TEAM_ID}&date=${date}&hydrate=team,linescore,gameInfo`,
      ),
    ),
  );

  return responses.flatMap((raw) => normalizeMlbSchedule(raw, checkedAt).flatMap((game) => {
    const completedAt = completionTime(`mlb-${game.id}`, game.state, game.completedAt, game.start, now);
    const window = sportsDisplayWindow({
      now,
      start: game.start,
      gameDateKey: game.gameDateKey,
      state: game.state,
      completedAt,
    });
    if (!window.visible) return [];

    const cardinalsAreHome = game.homeTeam.id === CARDINALS_TEAM_ID;
    const opponent = cardinalsAreHome ? game.awayTeam.name : game.homeTeam.name;
    const matchup = cardinalsAreHome ? `vs. ${opponent}` : `at ${opponent}`;
    const cardinalsScore = cardinalsAreHome ? game.homeTeam.score : game.awayTeam.score;
    const opponentScore = cardinalsAreHome ? game.awayTeam.score : game.homeTeam.score;
    const progress = mlbProgress(game.state, game.inning, game.half);
    const title = game.state === "live"
      ? "Cardinals Live"
      : game.state === "final"
        ? "Cardinals Final"
        : game.isChanged
          ? `Cardinals ${game.gameStatus}`
          : "Cardinals Game Day";
    const summary =
      game.state !== "upcoming" && cardinalsScore !== undefined && opponentScore !== undefined
        ? `${matchup} | STL ${cardinalsScore}, ${opponent} ${opponentScore}${progress ? ` | ${progress}` : ""}`
        : `${matchup} | First pitch ${formatCentralTime(game.start)}`;
    const detail = [seriesLabel(game.gameType), game.venue ? `at ${game.venue}` : undefined, game.gameStatus]
      .filter(Boolean)
      .join(" | ");

    return [{
      id: `mlb-${game.id}`,
      kind: "sports" as const,
      brand: "cardinals" as const,
      state: game.state,
      priority: game.state === "live" ? 3 : 4,
      title,
      summary,
      detail,
      startsAt: game.start.toISOString(),
      endsAt: window.endsAt?.toISOString(),
      sourceName: "Major League Baseball",
      sourceUrl: CARDINALS_SCHEDULE_URL,
      checkedAt,
      gameStatus: game.gameStatus,
      homeScore: game.homeTeam.score,
      awayScore: game.awayTeam.score,
      inning: game.inning,
      half: game.half,
      lastUpdatedAt: game.lastUpdatedAt,
      final: game.final,
    }];
  }));
}

async function getBluesAlerts(now: Date): Promise<CommunityAlert[]> {
  const clock = centralClock(now);
  const dates = [previousDateKey(clock.dateKey), clock.dateKey];
  const checkedAt = now.toISOString();
  const responses = await Promise.all(
    dates.map((date) => fetchJson(`https://api-web.nhle.com/v1/score/${date}`)),
  );

  return responses.flatMap((raw) => normalizeNhlScore(raw, checkedAt).flatMap((game) => {
    const bluesAreAway = game.awayTeam.abbreviation === BLUES_ABBREVIATION;
    const bluesAreHome = game.homeTeam.abbreviation === BLUES_ABBREVIATION;
    if (!bluesAreAway && !bluesAreHome) return [];

    const completedAt = completionTime(`nhl-${game.id}`, game.state, game.completedAt, game.start, now);
    const window = sportsDisplayWindow({
      now,
      start: game.start,
      gameDateKey: game.gameDateKey,
      state: game.state,
      completedAt,
    });
    if (!window.visible) return [];

    const opponent = bluesAreHome ? game.awayTeam.name : game.homeTeam.name;
    const matchup = bluesAreHome ? `vs. ${opponent}` : `at ${opponent}`;
    const bluesScore = bluesAreHome ? game.homeTeam.score : game.awayTeam.score;
    const opponentScore = bluesAreHome ? game.awayTeam.score : game.homeTeam.score;
    const progress = nhlProgress(game.state, game.period, game.clock, game.periodType);
    const title = game.state === "live"
      ? "Blues Live"
      : game.state === "final"
        ? "Blues Final"
        : game.isChanged
          ? "Blues Schedule Update"
          : "Blues Game Day";
    const summary =
      game.state !== "upcoming" && bluesScore !== undefined && opponentScore !== undefined
        ? `${matchup} | STL ${bluesScore}, ${opponent} ${opponentScore}${progress ? ` | ${progress}` : ""}`
        : `${matchup} | Puck drop ${formatCentralTime(game.start)}`;
    const detail = [game.venue, game.gameStatus].filter(Boolean).join(" | ") || undefined;

    return [{
      id: `nhl-${game.id}`,
      kind: "sports" as const,
      brand: "blues" as const,
      state: game.state,
      priority: game.state === "live" ? 3 : 4,
      title,
      summary,
      detail,
      startsAt: game.start.toISOString(),
      endsAt: window.endsAt?.toISOString(),
      sourceName: "National Hockey League",
      sourceUrl: BLUES_SCHEDULE_URL,
      checkedAt,
      gameStatus: game.gameStatus,
      homeScore: game.homeTeam.score,
      awayScore: game.awayTeam.score,
      period: game.period,
      clock: game.clock,
      lastUpdatedAt: game.lastUpdatedAt,
      final: game.final,
    }];
  }));
}

async function getMillstadtSchoolAlerts(now: Date): Promise<CommunityAlert[]> {
  const snapshot = await getMcsScheduleSnapshot();
  const checkedAt = now.toISOString();
  return snapshot.events.flatMap((event) => {
    const gameStart = new Date(event.startsAt);
    if (Number.isNaN(gameStart.getTime())) return [];

    const { displayEndsAt, visible } = gameIsVisibleToday(now, gameStart, event.dateKey);
    if (!visible) return [];

    return [{
      id: `mcs-${event.id}`,
      kind: "school" as const,
      brand: "millstadt-ccsd" as const,
      state: gameStart <= now ? "active" as const : "upcoming" as const,
      priority: 4,
      title: "MCS School Event",
      summary: `${event.label} | ${event.timeLabel ?? "Time not listed"}`,
      detail: `Schedule from ${snapshot.sourceTitle}`,
      startsAt: gameStart.toISOString(),
      endsAt: displayEndsAt.toISOString(),
      sourceName: "Millstadt CCSD Student Announcements",
      sourceUrl: snapshot.sourceUrl,
      checkedAt,
    }];
  });
}

const BELLEVILLE_WEST_QUERY = `
  query GetMainCalendar($filter: ManageEventListFilter) {
    manageOrganization {
      eventsForOrganization(filter: $filter) {
        list {
          eventId
          eventDate
          eventDateTime
          startTime
          place
          title
          location
          opponent
          gs
          cancellationStatus
          level
          programForEvent { sportName gender level }
        }
      }
    }
  }
`;

async function getBellevilleWestAlerts(now: Date): Promise<CommunityAlert[]> {
  const clock = centralClock(now);
  const startDate = clock.hour < 5 ? previousDateKey(clock.dateKey) : clock.dateKey;
  const raw = await fetchJson(BELLEVILLE_WEST_FEED_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      manage_organization_id: "bwestathletics",
    },
    body: JSON.stringify({
      query: BELLEVILLE_WEST_QUERY,
      variables: {
        filter: {
          where: { startDate, endDate: clock.dateKey },
          orderBy: { event_date: "asc" },
        },
      },
    }),
  });
  const parsed = snapScheduleSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Belleville West schedule response did not match the expected shape");

  const checkedAt = now.toISOString();
  return parsed.data.data.manageOrganization.eventsForOrganization.list.flatMap((event) => {
    if (event.gs !== "G" && event.gs !== "T") return [];
    const dateKey = dateKeyFromUsDate(event.eventDate);
    if (!dateKey) return [];

    const gameStart = centralDateTime(dateKey, event.startTime);
    const { displayEndsAt, visible } = gameIsVisibleToday(now, gameStart);
    if (!visible) return [];

    const sport = event.programForEvent?.sportName?.trim() || event.title?.trim() || "Athletics";
    const level = event.programForEvent?.level?.trim() || event.level?.trim();
    const opponent = event.opponent?.trim();
    const locationType = event.place?.trim().toUpperCase();
    const matchup = opponent
      ? `${locationType === "A" ? "at" : locationType === "H" ? "vs." : "with"} ${opponent}`
      : event.title?.trim() || "scheduled event";
    const isCanceled = Boolean(event.cancellationStatus && event.cancellationStatus !== "0");
    const timeLabel = hasUsableTime(event.startTime) ? formatCentralTime(gameStart) : "Time TBA";
    const eventLabel = [sport, level].filter(Boolean).join(" - ");

    return [{
      id: `bwest-${event.eventId}-${dateKey}`,
      kind: "school" as const,
      brand: "belleville-west" as const,
      state: gameStart <= now ? "active" as const : "upcoming" as const,
      priority: 4,
      title: isCanceled ? "Belleville West Schedule Update" : "Belleville West Game Day",
      summary: `${isCanceled ? "Canceled: " : ""}${eventLabel} ${matchup} | ${timeLabel}`,
      detail: event.location?.trim() || undefined,
      startsAt: gameStart.toISOString(),
      endsAt: displayEndsAt.toISOString(),
      sourceName: "Belleville West Athletics",
      sourceUrl: BELLEVILLE_WEST_SPORTS_URL,
      checkedAt,
    }];
  });
}

function getSolarEclipseAlerts(now: Date): CommunityAlert[] {
  const clock = centralClock(now);
  const searchStart = centralLocalTimeToUtc(previousDateKey(clock.dateKey), 0);
  const eclipse = SearchLocalSolarEclipse(searchStart, MILLSTADT_OBSERVER);
  const begin = eclipse.partial_begin.time.date;
  const peak = eclipse.peak.time.date;
  const end = eclipse.partial_end.time.date;
  const visibleAltitude = Math.max(
    eclipse.partial_begin.altitude,
    eclipse.peak.altitude,
    eclipse.partial_end.altitude,
  );

  if (centralClock(peak).dateKey !== clock.dateKey) return [];
  if (clock.hour < 7 || now >= end || visibleAltitude <= 0) return [];

  const kind = `${eclipse.kind.charAt(0).toUpperCase()}${eclipse.kind.slice(1)}`;
  const obscuration = `${Math.round(eclipse.obscuration * 100)}% maximum obscuration`;

  return [{
    id: `solar-eclipse-${peak.toISOString()}`,
    kind: "sky",
    brand: "sky-eclipse",
    state: now >= begin ? "active" : "upcoming",
    priority: 5,
    title: `${kind} Solar Eclipse`,
    summary: `Visible from Millstadt | Peak ${formatCentralTime(peak)}`,
    detail: `Begins ${formatCentralTime(begin)} | Ends ${formatCentralTime(end)} | ${obscuration}. Use certified solar-viewing protection; ordinary sunglasses are not safe.`,
    startsAt: begin.toISOString(),
    endsAt: end.toISOString(),
    sourceName: "Astronomy Engine local calculation",
    sourceUrl: ASTRONOMY_ENGINE_URL,
    checkedAt: now.toISOString(),
  }];
}

function calendarText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && "val" in value) {
    const val = (value as { val?: unknown }).val;
    return typeof val === "string" ? val.trim() : "";
  }
  return "";
}

async function getCalendarAlerts(
  now: Date,
  options: {
    calendarUrl: string;
    kind: "sports" | "school" | "event";
    brand: CommunityAlertBrand;
    title: (summary: string) => string;
    sourceName: string;
    sourceUrl: string;
    include?: (summary: string) => boolean;
    gameDay?: boolean;
  },
): Promise<CommunityAlert[]> {
  const clock = centralClock(now);

  const parsed = ical.sync.parseICS(await fetchText(options.calendarUrl));
  const checkedAt = now.toISOString();
  const alerts: CommunityAlert[] = [];

  for (const component of Object.values(parsed)) {
    if (!component || component.type !== "VEVENT" || !component.start) continue;

    const instances = component.rrule
      ? ical.expandRecurringEvent(component, {
          from: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          to: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          expandOngoing: true,
        })
      : [{
          start: component.start,
          end: component.end ?? component.start,
          summary: component.summary ?? "",
          isFullDay: component.datetype === "date",
          isRecurring: false,
          isOverride: false,
          event: component,
        }];

    for (const instance of instances) {
      const interval = normalizeCalendarInterval(instance.start, instance.end, instance.isFullDay);
      const start = interval.start;
      const end = interval.end;
      const startDateKey = calendarDateKey(instance.start, instance.isFullDay);
      const displayEndsAt = options.kind === "sports" || options.gameDay ? gameDisplayEndsAt(start) : end;
      const isCurrentDate = startDateKey === clock.dateKey;
      const isLateCarryover = startDateKey !== clock.dateKey && start < now && now < displayEndsAt;
      if (!isCurrentDate && !isLateCarryover) continue;
      if (isCurrentDate && clock.hour < 7) continue;
      if (displayEndsAt.getTime() < now.getTime()) continue;

      const summary = calendarText(instance.summary);
      if (!summary) continue;
      if (options.include && !options.include(summary)) continue;
      const location = calendarText(instance.event.location);
      const timeLabel = instance.isFullDay ? "Today" : formatCentralTime(start);

      alerts.push({
        id: `${options.kind}-${calendarText(instance.event.uid) || start.getTime()}-${start.getTime()}`,
        kind: options.kind,
        brand: options.brand,
        state: options.kind === "sports" ? "upcoming" : start.getTime() <= now.getTime() ? "active" : "upcoming",
        priority: 4,
        title: options.title(summary),
        summary: `${summary} | ${timeLabel}`,
        detail: location || undefined,
        startsAt: start.toISOString(),
        endsAt: displayEndsAt.toISOString(),
        sourceName: options.sourceName,
        sourceUrl: options.sourceUrl,
        checkedAt,
        ...(options.kind === "sports" ? {
          gameStatus: "scheduled",
          lastUpdatedAt: checkedAt,
          final: false,
        } : {}),
      });
    }
  }

  return alerts;
}

function getManualAlerts(now: Date): CommunityAlert[] {
  const raw = process.env.PUBLIC_COMMUNITY_ALERTS_JSON;
  if (!raw) return [];

  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return [];
  }

  const parsed = z.array(manualAlertSchema).safeParse(decoded);
  if (!parsed.success) return [];

  const clock = centralClock(now);
  return parsed.data.flatMap((item) => {
    const start = new Date(item.startsAt);
    const end = new Date(item.endsAt);
    const active = start.getTime() <= now.getTime() && end.getTime() >= now.getTime();
    const upcomingToday = centralClock(start).dateKey === clock.dateKey && clock.hour >= 7 && start > now;
    if (!active && !upcomingToday) return [];

    return [{
      id: `manual-${item.id}`,
      kind: item.kind,
      brand: item.brand ?? "generic",
      state: active ? "active" as const : "upcoming" as const,
      priority: item.priority ?? (item.kind === "flag" ? 2 : item.kind === "sky" ? 5 : 4),
      title: item.title,
      summary: item.summary,
      detail: item.detail,
      startsAt: item.startsAt,
      endsAt: item.endsAt,
      sourceName: item.sourceName,
      sourceUrl: item.sourceUrl,
      checkedAt: now.toISOString(),
    }];
  });
}

async function settledAlerts(promise: Promise<CommunityAlert[]>) {
  try {
    return await promise;
  } catch (error) {
    console.warn("Community alert source unavailable", error instanceof Error ? error.message : error);
    return [];
  }
}

export async function getActiveCommunityAlerts(now = new Date()): Promise<CommunityAlert[]> {
  const [cardinals, blues, city, millstadtSchool, stJames, bellevilleWest, solarEclipse, emsEvents] = await Promise.all([
    settledAlerts(getCardinalsAlerts(now)),
    settledAlerts(getBluesAlerts(now)),
    settledAlerts(
      getCalendarAlerts(now, {
        calendarUrl: CITY_CALENDAR_URL,
        kind: "sports",
        brand: "city-sc",
        title: () => "CITY Match Day",
        sourceName: "St. Louis CITY SC",
        sourceUrl: CITY_SCHEDULE_URL,
      }),
    ),
    settledAlerts(getMillstadtSchoolAlerts(now)),
    settledAlerts(
      getCalendarAlerts(now, {
        calendarUrl: ST_JAMES_CALENDAR_URL,
        kind: "school",
        brand: "st-james",
        title: () => "St. James Game Day",
        sourceName: "St. James School Calendar",
        sourceUrl: ST_JAMES_SCHOOL_URL,
        gameDay: true,
        include: (summary) =>
          /\b(basketball|volleyball|soccer|baseball|softball|track|cross country|golf|wrestling)\b/i.test(summary),
      }),
    ),
    settledAlerts(getBellevilleWestAlerts(now)),
    settledAlerts(Promise.resolve().then(() => getSolarEclipseAlerts(now))),
    settledAlerts(
      getCalendarAlerts(now, {
        calendarUrl: EMS_CALENDAR_URL,
        kind: "event",
        brand: "generic",
        title: (summary) => summary,
        sourceName: "Millstadt EMS Community Calendar",
        sourceUrl: "/events",
      }),
    ),
  ]);

  const alerts = [
    ...getManualAlerts(now),
    ...cardinals,
    ...blues,
    ...city,
    ...millstadtSchool,
    ...stJames,
    ...bellevilleWest,
    ...solarEclipse,
    ...emsEvents,
  ];
  const unique = new Map(alerts.map((alert) => [alert.id, alert]));

  return pruneExpiredAlerts([...unique.values()], now)
    .sort((left, right) => {
      if (left.priority !== right.priority) return left.priority - right.priority;
      return (left.startsAt ?? "").localeCompare(right.startsAt ?? "");
    })
    .slice(0, 40);
}

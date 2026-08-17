import "server-only";

import { Observer, SearchLocalSolarEclipse } from "astronomy-engine";
import * as ical from "node-ical";
import { z } from "zod";

const CENTRAL_TIME_ZONE = "America/Chicago";
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
const MCS_SPORTS_URL = "https://www.mccsd160.com/athletics";
const MCS_SPORTS_FEED_URL =
  "https://thrillshare-cmsv2.services.thrillshare.com/api/v4/o/1744/cms/scores_schedules?section_ids=35716&page_size=200";
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
};

const mlbSchema = z.object({
  dates: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      games: z.array(
        z.object({
          gamePk: z.number(),
          gameDate: z.string(),
          gameType: z.string().optional(),
          status: z.object({
            abstractGameState: z.string(),
            detailedState: z.string(),
          }),
          teams: z.object({
            away: z.object({
              score: z.number().optional(),
              team: z.object({ id: z.number(), name: z.string() }),
            }),
            home: z.object({
              score: z.number().optional(),
              team: z.object({ id: z.number(), name: z.string() }),
            }),
          }),
          venue: z.object({ name: z.string() }).optional(),
        }),
      ),
    }),
  ),
});

const nhlSchema = z.object({
  games: z.array(
    z.object({
      id: z.number(),
      gameDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      startTimeUTC: z.string(),
      gameState: z.string(),
      gameScheduleState: z.string().optional(),
      venue: z.object({ default: z.string() }).optional(),
      awayTeam: z.object({
        abbrev: z.string(),
        score: z.number().optional(),
        name: z.object({ default: z.string() }),
      }),
      homeTeam: z.object({
        abbrev: z.string(),
        score: z.number().optional(),
        name: z.object({ default: z.string() }),
      }),
    }),
  ),
});

const thrillshareScheduleSchema = z.object({
  scores_schedules: z.array(
    z.object({
      id: z.number(),
      formatted_date: z.string(),
      away_team: z.string().nullish(),
      home_team: z.string().nullish(),
      title: z.string().nullish(),
      place: z.string().nullish(),
      address: z.string().nullish(),
      filter_name: z.string().nullish(),
    }),
  ),
});

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

type CentralClock = {
  dateKey: string;
  hour: number;
};

function centralClock(date: Date): CentralClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TIME_ZONE,
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

function previousDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const previous = new Date(Date.UTC(year, month - 1, day - 1, 12));
  return previous.toISOString().slice(0, 10);
}

function nextDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1, 12));
  return next.toISOString().slice(0, 10);
}

function centralLocalTimeToUtc(dateKey: string, hour: number, minute = 0) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const targetWallClock = Date.UTC(year, month - 1, day, hour, minute);
  let guess = targetWallClock;

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: CENTRAL_TIME_ZONE,
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

function gameDisplayEndsAt(start: Date, gameDateKey = centralClock(start).dateKey) {
  const localMidnight = centralLocalTimeToUtc(nextDateKey(gameDateKey), 0);
  const twoHoursAfterStart = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return localMidnight > twoHoursAfterStart ? localMidnight : twoHoursAfterStart;
}

function formatCentralTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
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
    next: { revalidate: 300 },
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
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Source returned ${response.status}`);
  return response.text();
}

async function getCardinalsAlerts(now: Date): Promise<CommunityAlert[]> {
  const clock = centralClock(now);
  const dates = clock.hour < 5 ? [previousDateKey(clock.dateKey), clock.dateKey] : [clock.dateKey];
  const checkedAt = now.toISOString();
  const responses = await Promise.all(
    dates.map((date) =>
      fetchJson(
        `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${CARDINALS_TEAM_ID}&date=${date}&hydrate=team,linescore`,
      ),
    ),
  );

  return responses.flatMap((raw) => {
    const parsed = mlbSchema.safeParse(raw);
    if (!parsed.success) throw new Error("MLB schedule response did not match the expected shape");

    return parsed.data.dates.flatMap((scheduleDate) => scheduleDate.games.flatMap((game) => {
      const gameStart = new Date(game.gameDate);
      const gameDateKey = scheduleDate.date;
      const displayEndsAt = gameDisplayEndsAt(gameStart, gameDateKey);
      const abstractState = game.status.abstractGameState.toLowerCase();
      const detailedState = game.status.detailedState;
      const detailedLower = detailedState.toLowerCase();
      const isLive = abstractState === "live";
      const isFinal = abstractState === "final";
      const isChanged = ["postponed", "cancelled", "canceled", "delayed", "suspended"].some((word) =>
        detailedLower.includes(word),
      );
      const isGameDay = gameDateKey === clock.dateKey;
      const isLateCarryover = gameDateKey !== clock.dateKey && gameStart < now && now < displayEndsAt;
      if (!isGameDay && !isLateCarryover) return [];
      if (isGameDay && clock.hour < 7) return [];
      if (now >= displayEndsAt) return [];

      const cardinalsAreHome = game.teams.home.team.id === CARDINALS_TEAM_ID;
      const opponent = cardinalsAreHome ? game.teams.away.team.name : game.teams.home.team.name;
      const matchup = cardinalsAreHome ? `vs. ${opponent}` : `at ${opponent}`;
      const cardinalsScore = cardinalsAreHome ? game.teams.home.score : game.teams.away.score;
      const opponentScore = cardinalsAreHome ? game.teams.away.score : game.teams.home.score;
      const state: CommunityAlertState = isLive ? "live" : isFinal ? "final" : "upcoming";
      const title = isLive
        ? "Cardinals Live"
        : isFinal
          ? "Cardinals Final"
          : isChanged
            ? `Cardinals ${detailedState}`
            : "Cardinals Game Day";
      const summary =
        (isLive || isFinal) && cardinalsScore !== undefined && opponentScore !== undefined
          ? `${matchup} | STL ${cardinalsScore}, ${opponent} ${opponentScore}`
          : `${matchup} | First pitch ${formatCentralTime(game.gameDate)}`;

      return [{
        id: `mlb-${game.gamePk}`,
        kind: "sports" as const,
        brand: "cardinals" as const,
        state,
        priority: isLive ? 3 : 4,
        title,
        summary,
        detail: `${seriesLabel(game.gameType)}${game.venue?.name ? ` at ${game.venue.name}` : ""}`,
        startsAt: gameStart.toISOString(),
        endsAt: displayEndsAt.toISOString(),
        sourceName: "Major League Baseball",
        sourceUrl: CARDINALS_SCHEDULE_URL,
        checkedAt,
      }];
    }));
  });
}

async function getBluesAlerts(now: Date): Promise<CommunityAlert[]> {
  const clock = centralClock(now);
  const dates = clock.hour < 5 ? [previousDateKey(clock.dateKey), clock.dateKey] : [clock.dateKey];
  const checkedAt = now.toISOString();
  const responses = await Promise.all(
    dates.map((date) => fetchJson(`https://api-web.nhle.com/v1/score/${date}`)),
  );

  return responses.flatMap((raw) => {
    const parsed = nhlSchema.safeParse(raw);
    if (!parsed.success) throw new Error("NHL schedule response did not match the expected shape");

    return parsed.data.games.flatMap((game) => {
      const gameStart = new Date(game.startTimeUTC);
      const gameDateKey = game.gameDate;
      const displayEndsAt = gameDisplayEndsAt(gameStart, gameDateKey);
      const bluesAreAway = game.awayTeam.abbrev === BLUES_ABBREVIATION;
      const bluesAreHome = game.homeTeam.abbrev === BLUES_ABBREVIATION;
      if (!bluesAreAway && !bluesAreHome) return [];

      const stateCode = game.gameState.toUpperCase();
      const isLive = stateCode === "LIVE" || stateCode === "CRIT";
      const isFinal = stateCode === "OFF" || stateCode === "FINAL";
      const scheduleState = game.gameScheduleState?.toLowerCase() ?? "";
      const isChanged = scheduleState !== "" && scheduleState !== "ok";
      const isGameDay = gameDateKey === clock.dateKey;
      const isLateCarryover = gameDateKey !== clock.dateKey && gameStart < now && now < displayEndsAt;
      if (!isGameDay && !isLateCarryover) return [];
      if (isGameDay && clock.hour < 7) return [];
      if (now >= displayEndsAt) return [];

      const opponent = bluesAreHome ? game.awayTeam.name.default : game.homeTeam.name.default;
      const matchup = bluesAreHome ? `vs. ${opponent}` : `at ${opponent}`;
      const bluesScore = bluesAreHome ? game.homeTeam.score : game.awayTeam.score;
      const opponentScore = bluesAreHome ? game.awayTeam.score : game.homeTeam.score;
      const state: CommunityAlertState = isLive ? "live" : isFinal ? "final" : "upcoming";
      const title = isLive ? "Blues Live" : isFinal ? "Blues Final" : isChanged ? "Blues Schedule Update" : "Blues Game Day";
      const summary =
        (isLive || isFinal) && bluesScore !== undefined && opponentScore !== undefined
          ? `${matchup} | STL ${bluesScore}, ${opponent} ${opponentScore}`
          : `${matchup} | Puck drop ${formatCentralTime(game.startTimeUTC)}`;

      return [{
        id: `nhl-${game.id}`,
        kind: "sports" as const,
        brand: "blues" as const,
        state,
        priority: isLive ? 3 : 4,
        title,
        summary,
        detail: game.venue?.default,
        startsAt: gameStart.toISOString(),
        endsAt: displayEndsAt.toISOString(),
        sourceName: "National Hockey League",
        sourceUrl: BLUES_SCHEDULE_URL,
        checkedAt,
      }];
    });
  });
}

async function getMillstadtSchoolAlerts(now: Date): Promise<CommunityAlert[]> {
  const parsed = thrillshareScheduleSchema.safeParse(await fetchJson(MCS_SPORTS_FEED_URL));
  if (!parsed.success) throw new Error("Millstadt CCSD schedule response did not match the expected shape");

  const checkedAt = now.toISOString();
  return parsed.data.scores_schedules.flatMap((event) => {
    const gameStart = new Date(event.formatted_date);
    if (Number.isNaN(gameStart.getTime())) return [];

    const { displayEndsAt, visible } = gameIsVisibleToday(now, gameStart);
    if (!visible) return [];

    const away = event.away_team?.trim() ?? "";
    const home = event.home_team?.trim() ?? "";
    const sport = event.filter_name?.trim() || "School athletics";
    const millstadtIsHome = /\bMCS\b/i.test(home);
    const millstadtIsAway = /\bMCS\b/i.test(away);
    const matchup = millstadtIsHome && away
      ? `vs. ${away}`
      : millstadtIsAway && home
        ? `at ${home}`
        : event.title?.trim() || [away, home].filter(Boolean).join(" vs. ") || "School event";

    return [{
      id: `mcs-${event.id}`,
      kind: "school" as const,
      brand: "millstadt-ccsd" as const,
      state: gameStart <= now ? "active" as const : "upcoming" as const,
      priority: 4,
      title: "Millstadt School Game Day",
      summary: `${sport} ${matchup} | ${formatCentralTime(gameStart)}`,
      detail: event.address?.trim() || event.place?.trim() || undefined,
      startsAt: gameStart.toISOString(),
      endsAt: displayEndsAt.toISOString(),
      sourceName: "Millstadt CCSD Athletics",
      sourceUrl: MCS_SPORTS_URL,
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
    const timeLabel = hasUsableTime(event.startTime) ? event.startTime!.trim() : "Time TBA";
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
      const start = new Date(instance.start);
      const end = new Date(instance.end);
      const startDateKey = centralClock(start).dateKey;
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
        state: start.getTime() <= now.getTime() ? "active" : "upcoming",
        priority: 4,
        title: options.title(summary),
        summary: `${summary} | ${timeLabel}`,
        detail: location || undefined,
        startsAt: start.toISOString(),
        endsAt: displayEndsAt.toISOString(),
        sourceName: options.sourceName,
        sourceUrl: options.sourceUrl,
        checkedAt,
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

  return [...unique.values()]
    .sort((left, right) => {
      if (left.priority !== right.priority) return left.priority - right.priority;
      return (left.startsAt ?? "").localeCompare(right.startsAt ?? "");
    })
    .slice(0, 40);
}

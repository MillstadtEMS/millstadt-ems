import { z } from "zod";
import { chicagoClock } from "./reliability";

export type NormalizedGameState = "upcoming" | "live" | "final";
export type MlbInningHalf = "top" | "middle" | "bottom" | "end";

export type NormalizedMlbGame = {
  id: number;
  start: Date;
  gameDateKey: string;
  gameType?: string;
  state: NormalizedGameState;
  gameStatus: string;
  isChanged: boolean;
  awayTeam: { id: number; name: string; score?: number };
  homeTeam: { id: number; name: string; score?: number };
  venue?: string;
  inning?: number;
  half?: MlbInningHalf;
  lastUpdatedAt: string;
  completedAt?: Date;
  final: boolean;
};

export type NormalizedNhlGame = {
  id: number;
  start: Date;
  gameDateKey: string;
  state: NormalizedGameState;
  gameStatus: string;
  isChanged: boolean;
  awayTeam: { abbreviation: string; name: string; score?: number };
  homeTeam: { abbreviation: string; name: string; score?: number };
  venue?: string;
  period?: number;
  periodType?: string;
  clock?: string;
  lastUpdatedAt: string;
  completedAt?: Date;
  final: boolean;
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
          linescore: z.object({
            currentInning: z.number().int().positive().optional(),
            inningState: z.string().optional(),
          }).optional(),
          gameInfo: z.object({
            gameDurationMinutes: z.number().int().positive().optional(),
            firstPitch: z.string().optional(),
          }).optional(),
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
      periodDescriptor: z.object({
        number: z.number().int().positive(),
        periodType: z.string().optional(),
      }).optional(),
      clock: z.object({
        timeRemaining: z.string(),
      }).optional(),
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

function normalizedMlbHalf(value: string | undefined): MlbInningHalf | undefined {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "top" || normalized === "middle" || normalized === "bottom" || normalized === "end") {
    return normalized;
  }
  return undefined;
}

function mlbCompletion(game: z.infer<typeof mlbSchema>["dates"][number]["games"][number]) {
  const duration = game.gameInfo?.gameDurationMinutes;
  if (!duration) return undefined;
  const firstPitch = new Date(game.gameInfo?.firstPitch ?? game.gameDate);
  if (Number.isNaN(firstPitch.getTime())) return undefined;
  return new Date(firstPitch.getTime() + duration * 60 * 1000);
}

export function normalizeMlbSchedule(raw: unknown, lastUpdatedAt: string): NormalizedMlbGame[] {
  const parsed = mlbSchema.safeParse(raw);
  if (!parsed.success) throw new Error("MLB schedule response did not match the expected shape");

  return parsed.data.dates.flatMap((scheduleDate) => scheduleDate.games.flatMap((game) => {
    const start = new Date(game.gameDate);
    if (Number.isNaN(start.getTime())) return [];
    const abstractState = game.status.abstractGameState.toLowerCase();
    const state: NormalizedGameState = abstractState === "live"
      ? "live"
      : abstractState === "final"
        ? "final"
        : "upcoming";
    const detail = game.status.detailedState.toLowerCase();

    return [{
      id: game.gamePk,
      start,
      gameDateKey: chicagoClock(start).dateKey,
      gameType: game.gameType,
      state,
      gameStatus: game.status.detailedState,
      isChanged: ["postponed", "cancelled", "canceled", "delayed", "suspended"].some((word) => detail.includes(word)),
      awayTeam: { ...game.teams.away.team, score: game.teams.away.score },
      homeTeam: { ...game.teams.home.team, score: game.teams.home.score },
      venue: game.venue?.name,
      inning: state === "upcoming" ? undefined : game.linescore?.currentInning,
      half: state === "upcoming" ? undefined : normalizedMlbHalf(game.linescore?.inningState),
      lastUpdatedAt,
      completedAt: state === "final" ? mlbCompletion(game) : undefined,
      final: state === "final",
    }];
  }));
}

export function normalizeNhlScore(raw: unknown, lastUpdatedAt: string): NormalizedNhlGame[] {
  const parsed = nhlSchema.safeParse(raw);
  if (!parsed.success) throw new Error("NHL score response did not match the expected shape");

  return parsed.data.games.flatMap((game) => {
    const start = new Date(game.startTimeUTC);
    if (Number.isNaN(start.getTime())) return [];
    const stateCode = game.gameState.toUpperCase();
    const state: NormalizedGameState = stateCode === "LIVE" || stateCode === "CRIT"
      ? "live"
      : stateCode === "OFF" || stateCode === "FINAL"
        ? "final"
        : "upcoming";
    const scheduleState = game.gameScheduleState?.trim() ?? "";
    const isChanged = scheduleState !== "" && scheduleState.toLowerCase() !== "ok";

    return [{
      id: game.id,
      start,
      gameDateKey: chicagoClock(start).dateKey,
      state,
      gameStatus: isChanged ? scheduleState : game.gameState,
      isChanged,
      awayTeam: {
        abbreviation: game.awayTeam.abbrev,
        name: game.awayTeam.name.default,
        score: game.awayTeam.score,
      },
      homeTeam: {
        abbreviation: game.homeTeam.abbrev,
        name: game.homeTeam.name.default,
        score: game.homeTeam.score,
      },
      venue: game.venue?.default,
      period: state === "upcoming" ? undefined : game.periodDescriptor?.number,
      periodType: state === "upcoming" ? undefined : game.periodDescriptor?.periodType,
      clock: state === "upcoming" ? undefined : game.clock?.timeRemaining,
      lastUpdatedAt,
      completedAt: undefined,
      final: state === "final",
    }];
  });
}

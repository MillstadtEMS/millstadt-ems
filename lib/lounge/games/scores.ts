/**
 * Cross-game leaderboards. Each row records one completed game session.
 * Keyed by employee id (joined for display) so the board uses real names
 * — no nickname collection needed inside the lounge.
 */
import { randomUUID } from "crypto";
import { sql } from "../db";

export interface GameScoreRow {
  id: string;
  game: string;
  level: string | null;
  player: { id: string; firstName: string; lastName: string; photoUrl: string | null };
  score: number;
  /** Free-form details JSON (questions answered, accuracy, etc.). */
  details: Record<string, unknown>;
  createdAt: string;
}

let schemaEnsured = false;
async function ensureSchema() {
  if (schemaEnsured) return;
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS lounge_game_scores (
      id           TEXT PRIMARY KEY,
      player_id    TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
      game         TEXT NOT NULL,
      level        TEXT,
      score        INTEGER NOT NULL DEFAULT 0,
      details      JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS lounge_game_scores_board_idx ON lounge_game_scores (game, level, score DESC)`;
  await db`CREATE INDEX IF NOT EXISTS lounge_game_scores_player_idx ON lounge_game_scores (player_id, created_at DESC)`;
  schemaEnsured = true;
}

export interface RecordScoreInput {
  playerId: string;
  game: string;
  level?: string | null;
  score: number;
  details?: Record<string, unknown>;
}

export async function recordScore(input: RecordScoreInput): Promise<void> {
  await ensureSchema();
  const db = sql();
  const id = randomUUID();
  await db`
    INSERT INTO lounge_game_scores (id, player_id, game, level, score, details)
    VALUES (${id}, ${input.playerId}, ${input.game}, ${input.level ?? null},
            ${Math.round(input.score)}, ${JSON.stringify(input.details ?? {})}::jsonb)
  `;
}

interface DbRow {
  id: string;
  player_id: string;
  game: string;
  level: string | null;
  score: number;
  details: Record<string, unknown> | null;
  created_at: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
}

function rowToScore(r: DbRow): GameScoreRow {
  return {
    id: r.id,
    game: r.game,
    level: r.level,
    player: { id: r.player_id, firstName: r.first_name, lastName: r.last_name, photoUrl: r.photo_url },
    score: r.score,
    details: r.details ?? {},
    createdAt: r.created_at,
  };
}

/**
 * Returns the per-player best score on (game, level), sorted highest
 * first. Limit defaults to 25.
 */
export async function topScores(game: string, level: string | null, limit = 25): Promise<GameScoreRow[]> {
  await ensureSchema();
  const db = sql();
  const rows = level
    ? (await db`
        SELECT DISTINCT ON (s.player_id)
          s.id, s.player_id, s.game, s.level, s.score, s.details, s.created_at,
          e.first_name, e.last_name, e.photo_url
        FROM lounge_game_scores s
        JOIN lounge_employees e ON e.id = s.player_id
        WHERE s.game = ${game} AND s.level = ${level}
        ORDER BY s.player_id, s.score DESC
      `) as unknown as DbRow[]
    : (await db`
        SELECT DISTINCT ON (s.player_id)
          s.id, s.player_id, s.game, s.level, s.score, s.details, s.created_at,
          e.first_name, e.last_name, e.photo_url
        FROM lounge_game_scores s
        JOIN lounge_employees e ON e.id = s.player_id
        WHERE s.game = ${game}
        ORDER BY s.player_id, s.score DESC
      `) as unknown as DbRow[];
  rows.sort((a, b) => b.score - a.score);
  return rows.slice(0, Math.max(1, Math.min(200, limit))).map(rowToScore);
}

export async function myBestScore(playerId: string, game: string, level: string | null): Promise<number> {
  await ensureSchema();
  const db = sql();
  const rows = level
    ? (await db`SELECT MAX(score)::int AS best FROM lounge_game_scores WHERE player_id = ${playerId} AND game = ${game} AND level = ${level}`) as unknown as { best: number | null }[]
    : (await db`SELECT MAX(score)::int AS best FROM lounge_game_scores WHERE player_id = ${playerId} AND game = ${game}`) as unknown as { best: number | null }[];
  return rows[0]?.best ?? 0;
}

import { readFile } from "fs/promises";
import path from "path";
import { list } from "@vercel/blob";
import { ensureBoardSchema, sql, type BoardUser } from "./db";

export const BOARD_WORKBOOK_BLOB_PATH = "board-workbook/current.xlsx";
export const BOARD_WORKBOOK_VIEW_BLOB_PATH = "board-workbook/current.json";
export const BOARD_WORKBOOK_PUBLIC_PATH = "/board/referendum/current.xlsx";
export const BOARD_WORKBOOK_VIEW_PUBLIC_PATH = "/board/referendum/current.json";

const BOARD_WORKBOOK_VIEW_LOCAL_PATH = path.join(process.cwd(), "public", "board", "referendum", "current.json");

export interface BoardWorkbookCell {
  id: string;
  address: string;
  text: string;
  isNumber: boolean;
  isFormula: boolean;
  formula?: string;
  fill?: string;
  darkFill: boolean;
  colSpan?: number;
  rowSpan?: number;
}

export interface BoardWorkbookScenario {
  key: string;
  label: string;
}

export interface BoardWorkbookScenarioCellOverride {
  text: string;
  isNumber: boolean;
}

export type BoardWorkbookScenarioOverrides = Record<
  string,
  Record<string, Record<string, BoardWorkbookScenarioCellOverride>>
>;

export interface BoardWorkbookSheet {
  name: string;
  columns: Array<{ label: string; width?: number }>;
  rows: BoardWorkbookCell[][];
  totalRows: number;
  totalCols: number;
  truncated: boolean;
}

export interface BoardWorkbookView {
  sourceName: string;
  downloadUrl: string;
  updatedAt: string | null;
  size: number | null;
  sheets: BoardWorkbookSheet[];
  scenarios?: BoardWorkbookScenario[];
  defaultScenarioKey?: string | null;
  scenarioOverrides?: BoardWorkbookScenarioOverrides;
}

export type BoardWorkbookAudience = "ems_board" | "fire_board";

export interface BoardWorkbookVisibilitySettings {
  emsBoard: string[];
  fireBoard: string[];
  updatedAt: string | null;
  updatedByName: string | null;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function canManageBoardWorkbook(user: BoardUser | null): user is BoardUser {
  if (!user || !user.isActive || user.isDevLogin) return false;

  const username = normalize(user.username);
  if (username === "kjames" || username === "jwagner") return true;

  const email = normalize(user.email);
  if (email === "kenneth.james@millstadtems.org" || email === "joe.wagner@millstadtems.org" || email === "millstadtems@gmail.com") {
    return true;
  }

  const first = normalize(user.firstName);
  const last = normalize(user.lastName);
  return (first === "kenneth" && last === "james") || (first === "joe" && last === "wagner");
}

export function audienceForBoardUser(user: BoardUser): BoardWorkbookAudience {
  return user.role === "fire_board" ? "fire_board" : "ems_board";
}

function parseSheetNames(value: unknown): string[] | null {
  let raw: unknown = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = raw.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  if (!Array.isArray(raw)) return null;
  return raw.filter((item): item is string => typeof item === "string");
}

function normalizeSheetNames(value: unknown, allSheetNames: string[], defaultToAll: boolean): string[] {
  const parsed = parseSheetNames(value);
  if (!parsed) return defaultToAll ? [...allSheetNames] : [];
  const allowed = new Set(allSheetNames);
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const sheet of parsed) {
    if (!allowed.has(sheet) || seen.has(sheet)) continue;
    seen.add(sheet);
    normalized.push(sheet);
  }
  return normalized;
}

let visibilityReady = false;

async function ensureBoardWorkbookVisibilitySchema(): Promise<void> {
  if (visibilityReady) return;
  await ensureBoardSchema();
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS board_workbook_visibility (
      audience        TEXT PRIMARY KEY,
      sheet_names     JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_by      UUID,
      updated_by_name TEXT,
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  visibilityReady = true;
}

export async function getBoardWorkbookVisibilitySettings(allSheetNames: string[]): Promise<BoardWorkbookVisibilitySettings> {
  await ensureBoardWorkbookVisibilitySchema();
  const db = sql();
  const rows = (await db`
    SELECT audience, sheet_names, updated_by_name, updated_at
    FROM board_workbook_visibility
    WHERE audience IN ('ems_board', 'fire_board')
  `) as Record<string, unknown>[];
  const byAudience = new Map(rows.map((row) => [String(row.audience), row]));
  const touched = rows
    .map((row) => row.updated_at instanceof Date ? row.updated_at.toISOString() : (row.updated_at ? String(row.updated_at) : null))
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;
  const updatedByName = rows.find((row) => row.updated_by_name)?.updated_by_name;

  return {
    emsBoard: byAudience.has("ems_board")
      ? normalizeSheetNames(byAudience.get("ems_board")?.sheet_names, allSheetNames, false)
      : [...allSheetNames],
    fireBoard: byAudience.has("fire_board")
      ? normalizeSheetNames(byAudience.get("fire_board")?.sheet_names, allSheetNames, false)
      : [...allSheetNames],
    updatedAt: touched,
    updatedByName: updatedByName ? String(updatedByName) : null,
  };
}

export async function setBoardWorkbookVisibilitySettings(
  settings: Pick<BoardWorkbookVisibilitySettings, "emsBoard" | "fireBoard">,
  allSheetNames: string[],
  updatedBy: BoardUser,
): Promise<BoardWorkbookVisibilitySettings> {
  await ensureBoardWorkbookVisibilitySchema();
  const db = sql();
  const emsBoard = normalizeSheetNames(settings.emsBoard, allSheetNames, false);
  const fireBoard = normalizeSheetNames(settings.fireBoard, allSheetNames, false);
  const updatedByName = `${updatedBy.firstName} ${updatedBy.lastName}`;
  for (const [audience, sheetNames] of [["ems_board", emsBoard], ["fire_board", fireBoard]] as const) {
    await db`
      INSERT INTO board_workbook_visibility (audience, sheet_names, updated_by, updated_by_name, updated_at)
      VALUES (${audience}, ${JSON.stringify(sheetNames)}::jsonb, ${updatedBy.id}, ${updatedByName}, NOW())
      ON CONFLICT (audience) DO UPDATE SET
        sheet_names = EXCLUDED.sheet_names,
        updated_by = EXCLUDED.updated_by,
        updated_by_name = EXCLUDED.updated_by_name,
        updated_at = NOW()
    `;
  }
  return getBoardWorkbookVisibilitySettings(allSheetNames);
}

export function filterWorkbookForAudience(
  workbook: BoardWorkbookView,
  audience: BoardWorkbookAudience,
  settings: BoardWorkbookVisibilitySettings,
): BoardWorkbookView {
  const selected = audience === "fire_board" ? settings.fireBoard : settings.emsBoard;
  const allowed = new Set(selected);
  return {
    ...workbook,
    sheets: workbook.sheets.filter((sheet) => allowed.has(sheet.name)),
  };
}

function isWorkbookView(value: unknown): value is BoardWorkbookView {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BoardWorkbookView>;
  return typeof candidate.sourceName === "string" && Array.isArray(candidate.sheets);
}

async function loadBlobWorkbookView(): Promise<BoardWorkbookView | null> {
  try {
    const { blobs } = await list({ prefix: "board-workbook/" });
    const exact = blobs.find((blob) => blob.pathname === BOARD_WORKBOOK_VIEW_BLOB_PATH);
    if (!exact) return null;

    const response = await fetch(exact.url, { cache: "no-store" });
    if (!response.ok) return null;

    const view = await response.json();
    return isWorkbookView(view) ? view : null;
  } catch {
    return null;
  }
}

async function loadLocalWorkbookView(): Promise<BoardWorkbookView> {
  const raw = await readFile(BOARD_WORKBOOK_VIEW_LOCAL_PATH, "utf8");
  const view = JSON.parse(raw) as unknown;
  if (!isWorkbookView(view)) throw new Error("Board workbook view snapshot is invalid.");
  return view;
}

export async function getCurrentBoardWorkbookView(): Promise<BoardWorkbookView> {
  return (await loadBlobWorkbookView()) ?? (await loadLocalWorkbookView());
}

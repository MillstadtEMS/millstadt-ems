/**
 * Tiny key/value settings store for the CAD ticker (Neon Postgres).
 * Currently holds the public hover-box field visibility config.
 */

import { sql } from "@/lib/neon";
import {
  DEFAULT_HOVER_SETTINGS,
  normalizeHoverSettings,
  type HoverFieldSettings,
} from "./hoverSettings";

let ready = false;

async function ensureSettingsSchema(): Promise<void> {
  if (ready) return;
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS cad_settings (
      key        TEXT PRIMARY KEY,
      value      JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  ready = true;
}

const HOVER_KEY = "hover_fields";

export async function getHoverSettings(): Promise<HoverFieldSettings> {
  await ensureSettingsSchema();
  const db = sql();
  const rows = (await db`SELECT value FROM cad_settings WHERE key = ${HOVER_KEY} LIMIT 1`) as unknown as { value: unknown }[];
  if (!rows.length) return DEFAULT_HOVER_SETTINGS;
  return normalizeHoverSettings(rows[0].value);
}

export async function setHoverSettings(input: unknown): Promise<HoverFieldSettings> {
  await ensureSettingsSchema();
  const db = sql();
  const norm = normalizeHoverSettings(input);
  await db`
    INSERT INTO cad_settings (key, value) VALUES (${HOVER_KEY}, ${JSON.stringify(norm)}::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
  return norm;
}

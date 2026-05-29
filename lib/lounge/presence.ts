/**
 * Lightweight in-DB presence. The client posts a heartbeat every ~30s
 * on real activity (cursor move / keyboard / touch within the last
 * 5 minutes) and we stamp last_activity_at on the employee row. The
 * server treats anyone with last_activity_at within the past 5 minutes
 * as "online now".
 */
import { sql } from "./db";

const ONLINE_WINDOW_MS = 5 * 60 * 1000;
let columnsEnsured = false;
async function ensureColumns() {
  if (columnsEnsured) return;
  const db = sql();
  await db`ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ`;
  columnsEnsured = true;
}

export async function recordHeartbeat(employeeId: string): Promise<void> {
  await ensureColumns();
  const db = sql();
  await db`UPDATE lounge_employees SET last_activity_at = NOW() WHERE id = ${employeeId}`;
}

export interface PresenceEntry {
  id: string;
  online: boolean;
  lastActivityAt: string | null;
}

export async function listPresence(): Promise<PresenceEntry[]> {
  await ensureColumns();
  const db = sql();
  const rows = (await db`
    SELECT id, last_activity_at FROM lounge_employees WHERE is_active = TRUE
  `) as unknown as { id: string; last_activity_at: string | null }[];
  const now = Date.now();
  return rows.map((r) => ({
    id: r.id,
    online: r.last_activity_at ? now - new Date(r.last_activity_at).getTime() < ONLINE_WINDOW_MS : false,
    lastActivityAt: r.last_activity_at,
  }));
}

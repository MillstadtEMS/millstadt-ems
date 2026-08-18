import { createHash } from "node:crypto";
import { sql } from "@/lib/neon";

type StoredResponse = {
  status: number;
  body: unknown;
};

export type InventoryIdempotencyClaim =
  | { outcome: "claimed" }
  | { outcome: "replay"; response: StoredResponse }
  | { outcome: "conflict" }
  | { outcome: "in-progress" };

declare global {
  var __millstadtInventoryIdempotencySchema: Promise<void> | undefined;
}

async function ensureSchema() {
  globalThis.__millstadtInventoryIdempotencySchema ??= (async () => {
    const db = sql();
    await db`
      CREATE TABLE IF NOT EXISTS inventory_idempotency_keys (
        actor_id      TEXT NOT NULL,
        mutation_scope TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        request_hash  TEXT NOT NULL,
        response_json JSONB,
        status_code   INTEGER,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at  TIMESTAMPTZ,
        PRIMARY KEY (actor_id, mutation_scope, idempotency_key)
      )
    `;
    await db`
      CREATE INDEX IF NOT EXISTS inventory_idempotency_created_idx
      ON inventory_idempotency_keys (created_at DESC)
    `;
  })();
  return globalThis.__millstadtInventoryIdempotencySchema;
}

export function inventoryRequestHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function claimInventoryMutation(input: {
  actorId: string;
  scope: string;
  key: string;
  requestHash: string;
}): Promise<InventoryIdempotencyClaim> {
  await ensureSchema();
  const db = sql();
  const inserted = (await db`
    INSERT INTO inventory_idempotency_keys (
      actor_id, mutation_scope, idempotency_key, request_hash
    )
    VALUES (${input.actorId}, ${input.scope}, ${input.key}, ${input.requestHash})
    ON CONFLICT DO NOTHING
    RETURNING idempotency_key
  `) as unknown as Array<{ idempotency_key: string }>;
  if (inserted.length === 1) return { outcome: "claimed" };

  const rows = (await db`
    SELECT request_hash, response_json, status_code
    FROM inventory_idempotency_keys
    WHERE actor_id = ${input.actorId}
      AND mutation_scope = ${input.scope}
      AND idempotency_key = ${input.key}
    LIMIT 1
  `) as unknown as Array<{
    request_hash: string;
    response_json: unknown;
    status_code: number | null;
  }>;
  const row = rows[0];
  if (!row || row.request_hash !== input.requestHash) return { outcome: "conflict" };
  if (row.status_code == null || row.response_json == null) return { outcome: "in-progress" };
  return {
    outcome: "replay",
    response: { status: Number(row.status_code), body: row.response_json },
  };
}

export async function completeInventoryMutation(input: {
  actorId: string;
  scope: string;
  key: string;
  status: number;
  body: unknown;
}) {
  await ensureSchema();
  const db = sql();
  const responseJson = JSON.stringify(input.body);
  await db`
    UPDATE inventory_idempotency_keys
    SET response_json = ${responseJson}::jsonb,
        status_code = ${input.status},
        completed_at = NOW()
    WHERE actor_id = ${input.actorId}
      AND mutation_scope = ${input.scope}
      AND idempotency_key = ${input.key}
  `;
}

export async function abandonInventoryMutation(input: {
  actorId: string;
  scope: string;
  key: string;
}) {
  await ensureSchema();
  const db = sql();
  await db`
    DELETE FROM inventory_idempotency_keys
    WHERE actor_id = ${input.actorId}
      AND mutation_scope = ${input.scope}
      AND idempotency_key = ${input.key}
      AND completed_at IS NULL
  `;
}

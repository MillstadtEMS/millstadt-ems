import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";
import { sql } from "@/lib/neon";
import { requestIp } from "./http";

type AuditEntry = {
  actorType: "employee" | "board" | "administrator" | "system";
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  outcome: "allowed" | "denied" | "completed" | "failed";
  req?: NextRequest;
  detail?: Record<string, string | number | boolean | null>;
};

declare global {
  var __millstadtSecurityAuditSchema: Promise<void> | undefined;
}

function auditKey() {
  return (
    process.env.SECURITY_AUDIT_KEY ||
    process.env.ANALYTICS_HASH_KEY ||
    process.env.LOUNGE_ENCRYPTION_KEY ||
    (process.env.NODE_ENV === "production" ? "" : "development-only-audit-key")
  );
}

function ipDigest(req?: NextRequest) {
  if (!req) return null;
  const key = auditKey();
  if (!key) return null;
  return createHmac("sha256", key).update(requestIp(req)).digest("hex");
}

async function ensureSchema() {
  globalThis.__millstadtSecurityAuditSchema ??= (async () => {
    const db = sql();
    await db`
      CREATE TABLE IF NOT EXISTS security_audit_events (
        id            BIGSERIAL PRIMARY KEY,
        occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        actor_type    TEXT NOT NULL,
        actor_id      TEXT,
        action        TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id   TEXT,
        outcome       TEXT NOT NULL,
        route         TEXT,
        ip_digest     TEXT,
        detail        JSONB NOT NULL DEFAULT '{}'::jsonb
      )
    `;
    await db`CREATE INDEX IF NOT EXISTS security_audit_events_resource_idx ON security_audit_events (resource_type, resource_id, occurred_at DESC)`;
    await db`CREATE INDEX IF NOT EXISTS security_audit_events_actor_idx ON security_audit_events (actor_type, actor_id, occurred_at DESC)`;
  })();
  return globalThis.__millstadtSecurityAuditSchema;
}

export async function recordSecurityAudit(entry: AuditEntry) {
  if (!process.env.DATABASE_URL) return;
  try {
    await ensureSchema();
    const db = sql();
    await db`
      INSERT INTO security_audit_events
        (actor_type, actor_id, action, resource_type, resource_id, outcome, route, ip_digest, detail)
      VALUES
        (${entry.actorType}, ${entry.actorId ?? null}, ${entry.action}, ${entry.resourceType},
         ${entry.resourceId ?? null}, ${entry.outcome}, ${entry.req?.nextUrl.pathname ?? null},
         ${ipDigest(entry.req)}, ${JSON.stringify(entry.detail ?? {})}::jsonb)
    `;
  } catch (error) {
    globalThis.__millstadtSecurityAuditSchema = undefined;
    console.error("[security] audit write failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      action: entry.action,
      resourceType: entry.resourceType,
    });
  }
}

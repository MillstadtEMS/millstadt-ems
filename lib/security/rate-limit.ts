import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";
import { sql } from "@/lib/neon";
import { requestIp } from "./http";

type LimitOptions = {
  limit: number;
  windowMs: number;
  blockMs?: number;
  discriminator?: string;
};

type LimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type MemoryEntry = { count: number; resetAt: number; blockedUntil: number };

declare global {
  var __millstadtSecurityRateLimits: Map<string, MemoryEntry> | undefined;
  var __millstadtSecurityRateLimitSchema: Promise<void> | undefined;
}

function signingKey() {
  const configured =
    process.env.SECURITY_RATE_LIMIT_KEY ||
    process.env.ANALYTICS_HASH_KEY ||
    process.env.LOUNGE_ENCRYPTION_KEY;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("A security rate-limit key is required in production.");
  }
  return "development-only-rate-limit-key";
}

function opaqueKey(req: NextRequest, bucket: string, discriminator = "") {
  return createHmac("sha256", signingKey())
    .update(`${bucket}\n${requestIp(req)}\n${discriminator.trim().toLowerCase()}`)
    .digest("hex");
}

async function ensureSchema() {
  globalThis.__millstadtSecurityRateLimitSchema ??= (async () => {
    const db = sql();
    await db`
      CREATE TABLE IF NOT EXISTS security_rate_limits (
        bucket_key        TEXT PRIMARY KEY,
        request_count     INTEGER NOT NULL,
        window_started_at TIMESTAMPTZ NOT NULL,
        blocked_until     TIMESTAMPTZ,
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
  })();
  return globalThis.__millstadtSecurityRateLimitSchema;
}

function memoryLimit(key: string, options: LimitOptions): LimitResult {
  globalThis.__millstadtSecurityRateLimits ??= new Map();
  const now = Date.now();
  const blockMs = options.blockMs ?? options.windowMs;
  const previous = globalThis.__millstadtSecurityRateLimits.get(key);
  const entry = !previous || previous.resetAt <= now
    ? { count: 0, resetAt: now + options.windowMs, blockedUntil: 0 }
    : previous;

  if (entry.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.blockedUntil - now) / 1000)),
    };
  }

  entry.count += 1;
  if (entry.count > options.limit) entry.blockedUntil = now + blockMs;
  globalThis.__millstadtSecurityRateLimits.set(key, entry);

  if (globalThis.__millstadtSecurityRateLimits.size > 5_000) {
    for (const [candidate, value] of globalThis.__millstadtSecurityRateLimits) {
      if (value.resetAt <= now && value.blockedUntil <= now) {
        globalThis.__millstadtSecurityRateLimits.delete(candidate);
      }
    }
  }

  return {
    allowed: entry.count <= options.limit,
    remaining: Math.max(0, options.limit - entry.count),
    retryAfterSeconds: entry.count <= options.limit
      ? 0
      : Math.max(1, Math.ceil((entry.blockedUntil - now) / 1000)),
  };
}

export async function checkRateLimit(
  req: NextRequest,
  bucket: string,
  options: LimitOptions,
): Promise<LimitResult> {
  const key = opaqueKey(req, bucket, options.discriminator);
  if (!process.env.DATABASE_URL) return memoryLimit(key, options);

  try {
    await ensureSchema();
    const db = sql();
    const blockMs = options.blockMs ?? options.windowMs;
    const rows = (await db`
      INSERT INTO security_rate_limits
        (bucket_key, request_count, window_started_at, blocked_until, updated_at)
      VALUES (${key}, 1, NOW(), NULL, NOW())
      ON CONFLICT (bucket_key) DO UPDATE SET
        request_count = CASE
          WHEN security_rate_limits.window_started_at <= NOW() - (${options.windowMs} * INTERVAL '1 millisecond')
            THEN 1
          ELSE security_rate_limits.request_count + 1
        END,
        window_started_at = CASE
          WHEN security_rate_limits.window_started_at <= NOW() - (${options.windowMs} * INTERVAL '1 millisecond')
            THEN NOW()
          ELSE security_rate_limits.window_started_at
        END,
        blocked_until = CASE
          WHEN security_rate_limits.blocked_until > NOW()
            THEN security_rate_limits.blocked_until
          WHEN security_rate_limits.window_started_at <= NOW() - (${options.windowMs} * INTERVAL '1 millisecond')
            THEN NULL
          WHEN security_rate_limits.request_count + 1 > ${options.limit}
            THEN NOW() + (${blockMs} * INTERVAL '1 millisecond')
          ELSE NULL
        END,
        updated_at = NOW()
      RETURNING request_count, blocked_until
    `) as unknown as Array<{ request_count: number; blocked_until: string | Date | null }>;
    const row = rows[0];
    const blockedUntil = row?.blocked_until ? new Date(row.blocked_until).getTime() : 0;
    const now = Date.now();
    const allowed = Number(row?.request_count ?? 1) <= options.limit && blockedUntil <= now;
    return {
      allowed,
      remaining: Math.max(0, options.limit - Number(row?.request_count ?? 1)),
      retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((blockedUntil - now) / 1000)),
    };
  } catch (error) {
    globalThis.__millstadtSecurityRateLimitSchema = undefined;
    console.error("[security] durable rate limiter unavailable", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return memoryLimit(key, options);
  }
}

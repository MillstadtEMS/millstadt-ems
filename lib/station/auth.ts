// The station TV (/station) is for the crew, so it sits behind a shared password, server-side only
// (the same pattern as the inventory password): an admin can change it in Admin > Station TV, where
// it is stored scrypt-hashed in site_content; until then the STATION_PASSWORD setting is used. The
// password never reaches the browser, the page or any API response.
//
// A TV signs in once. Its session cookie is httpOnly and lasts STATION_SESSION_DAYS; the station page
// renews it every day, so a TV that stays on stays signed in. Changing the password signs every TV
// out (the session signature includes it).

import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { neon } from "@neondatabase/serverless";

export const STATION_COOKIE = "mems_station";
export const STATION_SESSION_DAYS = 120;
export const STATION_SESSION_SECONDS = STATION_SESSION_DAYS * 24 * 60 * 60;
export const STATION_PASSWORD_MIN_LENGTH = 8;
const PASSWORD_KEY = "station_password_hash";

function database() {
  const url = process.env.DATABASE_URL;
  return url ? neon(url) : null;
}

let tableReady: Promise<void> | null = null;
async function ensureTable(db: NonNullable<ReturnType<typeof database>>) {
  tableReady ??= (async () => {
    await db`
      CREATE TABLE IF NOT EXISTS site_content (
        key         TEXT PRIMARY KEY,
        live_value  TEXT NOT NULL DEFAULT '',
        draft_value TEXT,
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `;
  })().catch((error) => { tableReady = null; throw error; });
  return tableReady;
}

/** The admin-set password hash, or null (none set, no database, or the database is unreachable). */
async function storedHash(): Promise<string | null> {
  const db = database();
  if (!db) return null;
  try {
    await ensureTable(db);
    const rows = (await db`SELECT live_value FROM site_content WHERE key = ${PASSWORD_KEY}`) as Array<{ live_value: string }>;
    return rows[0]?.live_value || null;
  } catch (error) {
    console.error("[station] password store unavailable", { name: error instanceof Error ? error.name : "UnknownError" });
    return null;
  }
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function matchesHash(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash || !/^[a-f0-9]+$/.test(hash)) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function configuredPassword(): string | null {
  const value = process.env.STATION_PASSWORD;
  return value && value.length >= 1 ? value : null;
}

export type StationPasswordSource = "admin" | "setting" | "unset";

/** Where the password currently comes from (never the password itself). */
export async function stationPasswordSource(): Promise<StationPasswordSource> {
  if (await storedHash()) return "admin";
  return configuredPassword() ? "setting" : "unset";
}

export function stationPasswordCanChange(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function verifyStationPassword(input: unknown): Promise<boolean> {
  if (typeof input !== "string" || !input || input.length > 256) return false;
  const stored = await storedHash();
  if (stored) return matchesHash(input, stored);
  const configured = configuredPassword();
  if (!configured) return false;
  // Compare fixed-length digests in constant time.
  const digest = (value: string) => createHmac("sha256", "millstadt-station-password").update(value).digest();
  return timingSafeEqual(digest(input), digest(configured));
}

/** Save a new password (admin only; the caller checks). Every signed-in TV is signed out. */
export async function changeStationPassword(newPassword: string): Promise<"saved" | "no-database"> {
  const db = database();
  if (!db) return "no-database";
  await ensureTable(db);
  const hash = hashPassword(newPassword);
  await db`
    INSERT INTO site_content (key, live_value, updated_at)
    VALUES (${PASSWORD_KEY}, ${hash}, NOW())
    ON CONFLICT (key) DO UPDATE SET live_value = ${hash}, updated_at = NOW()
  `;
  return "saved";
}

// ── Sessions ──────────────────────────────────────────────────────────────────────────────────────
// token = <expires (unix seconds)>.<nonce>.<signature>; the key mixes an optional server secret with
// the current password material, so a password change invalidates every session.

async function sessionKey(): Promise<Buffer | null> {
  const stored = await storedHash();
  const configured = configuredPassword();
  if (!stored && !configured) return null;
  return createHash("sha256")
    .update("millstadt-station-session-v1\n")
    .update(process.env.STATION_SESSION_KEY ?? "")
    .update("\n")
    .update(stored ? `admin:${stored}` : `setting:${configured}`)
    .digest();
}

function sign(key: Buffer, payload: string) {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export async function createStationSession(now = Date.now()): Promise<string | null> {
  const key = await sessionKey();
  if (!key) return null;
  const payload = `${Math.floor(now / 1000) + STATION_SESSION_SECONDS}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${sign(key, payload)}`;
}

export async function verifyStationSession(token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token || !/^\d{10}\.[a-f0-9]{32}\.[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const [expires, nonce, mac] = token.split(".");
  const remaining = Number(expires) - Math.floor(now / 1000);
  if (remaining <= 0 || remaining > STATION_SESSION_SECONDS) return false;
  const key = await sessionKey();
  if (!key) return false;
  const expected = Buffer.from(sign(key, `${expires}.${nonce}`));
  const actual = Buffer.from(mac);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function isStationAuthed(): Promise<boolean> {
  try {
    const jar = await cookies();
    return await verifyStationSession(jar.get(STATION_COOKIE)?.value);
  } catch {
    return false;
  }
}

export function stationCookieOptions(secure: boolean) {
  return { httpOnly: true, secure, sameSite: "lax" as const, path: "/", maxAge: STATION_SESSION_SECONDS };
}

// ── Requests ──────────────────────────────────────────────────────────────────────────────────────

/** Same-origin for a form post. TV browsers that predate the Origin and Sec-Fetch-Site headers fall
 *  back to the Referer; one that sends none of them is allowed (signing a TV into a Christmas
 *  dashboard is the worst a forged post could do). */
export function stationSameOrigin(headers: Headers, url: URL): boolean {
  const host = headers.get("host")?.trim() || url.host;
  const fetchSite = headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return false;
  const source = headers.get("origin") ?? headers.get("referer");
  if (!source || source === "null") return !headers.get("origin");
  try {
    return new URL(source).host === host;
  } catch {
    return false;
  }
}

// The station page's own preview switches survive the sign-in round trip; nothing else does.
const keptParams: Record<string, RegExp> = {
  preview: /^ve$/,
  "station-fast": /^1$/,
  "station-debug": /^1$/,
  "season-preview": /^[a-z-]{3,20}$/,
  "snow-preview": /^[0-3]$/,
};

/** Only /station itself (with its preview switches) is a valid place to return to after signing in. */
export function safeStationPath(value: unknown): string {
  if (typeof value !== "string" || value.length > 300) return "/station";
  try {
    const url = new URL(value, "https://station.invalid");
    if (url.origin !== "https://station.invalid" || url.pathname !== "/station") return "/station";
    const query = new URLSearchParams();
    for (const [name, pattern] of Object.entries(keptParams)) {
      const param = url.searchParams.get(name);
      if (param && pattern.test(param)) query.set(name, param);
    }
    const search = query.toString();
    return search ? `/station?${search}` : "/station";
  } catch {
    return "/station";
  }
}

/** Local headless review only: ?station-review=1 opens the station without signing in when the dev
 *  server runs with STATION_REVIEW_BYPASS=1 on localhost. A production build never honors it. */
export function stationReviewBypass(query: Record<string, string | string[] | undefined>, host: string | null): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.STATION_REVIEW_BYPASS !== "1" || query["station-review"] !== "1") return false;
  const hostname = (host ?? "").replace(/:\d+$/, "");
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

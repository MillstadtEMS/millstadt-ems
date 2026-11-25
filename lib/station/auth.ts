import "server-only";

// The station TV (/station) is for the crew, so it sits behind one shared password, server-side only
// (the inventory password's pattern, lib/inventory/auth): stored scrypt-hashed ("salt:hash") in
// site_content under station_password_hash, seeded from the STATION_PASSWORD setting on first use and
// changeable by admins in Admin > Station TV. With no database (local development) the setting is
// compared directly. The password and its hash never reach the browser, the page or any API response.
//
// A TV signs in once. Its session cookie is httpOnly and lasts STATION_SESSION_DAYS; the station page
// renews it every day, so a TV that stays on stays signed in. The session signature is keyed by the
// stored hash, so changing the password signs every TV out. Anyone signed in to the Employee Lounge
// is let in too.

import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { sql } from "@/lib/neon";
import { currentEmployee } from "@/lib/lounge/auth";

export const STATION_COOKIE = "mems_station";
export const STATION_SESSION_DAYS = 120;
export const STATION_SESSION_SECONDS = STATION_SESSION_DAYS * 24 * 60 * 60;
export const STATION_PASSWORD_MIN_LENGTH = 8;
export const STATION_PASSWORD_MAX_LENGTH = 256;
const PASSWORD_KEY = "station_password_hash";

// ── The password ──────────────────────────────────────────────────────────────────────────────────

let tableReady: Promise<void> | null = null;
function ensureTable() {
  tableReady ??= (async () => {
    await sql()`
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

const validHash = (value: string) => /^[a-f0-9]{32}:[a-f0-9]{128}$/.test(value);

// The last hash this server read, so a brief database outage doesn't sign every TV out.
let lastGood: string | null = null;

/** The stored hash: a string, null (none stored yet), or undefined (the database didn't answer). */
async function readStoredHash(): Promise<string | null | undefined> {
  try {
    await ensureTable();
    const rows = (await sql()`SELECT live_value FROM site_content WHERE key = ${PASSWORD_KEY}`) as Array<{ live_value: string }>;
    const value = rows[0]?.live_value ?? "";
    lastGood = validHash(value) ? value : null;
    return lastGood;
  } catch (error) {
    console.error("[station] password store unavailable", { name: error instanceof Error ? error.name : "UnknownError" });
    return lastGood ?? undefined;
  }
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function matchesHash(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function configuredPassword(): string | null {
  const value = process.env.STATION_PASSWORD;
  return value && value.length <= STATION_PASSWORD_MAX_LENGTH ? value : null;
}

type Material =
  | { kind: "stored"; hash: string }
  | { kind: "setting"; value: string }
  | { kind: "unset" }
  | { kind: "unavailable" };

/** What the password is checked against right now (seeding the store from the setting on first use). */
async function passwordMaterial(): Promise<Material> {
  const configured = configuredPassword();
  if (!process.env.DATABASE_URL) return configured ? { kind: "setting", value: configured } : { kind: "unset" };
  const stored = await readStoredHash();
  if (stored === undefined) return { kind: "unavailable" };
  if (stored) return { kind: "stored", hash: stored };
  if (!configured) return { kind: "unset" };
  try {
    // First use: store the setting's hash, unless another request just did.
    const hash = hashPassword(configured);
    await sql()`
      INSERT INTO site_content (key, live_value, updated_at) VALUES (${PASSWORD_KEY}, ${hash}, NOW())
      ON CONFLICT (key) DO UPDATE SET live_value = EXCLUDED.live_value, updated_at = NOW()
      WHERE site_content.live_value = ''
    `;
    const seeded = await readStoredHash();
    if (seeded) return { kind: "stored", hash: seeded };
  } catch (error) {
    console.error("[station] could not store the station password", { name: error instanceof Error ? error.name : "UnknownError" });
  }
  return { kind: "setting", value: configured };
}

export type StationPasswordStatus = "set" | "unset" | "unavailable";

/** Whether a password is in place (never the password itself). */
export async function stationPasswordStatus(): Promise<StationPasswordStatus> {
  const material = await passwordMaterial();
  return material.kind === "unset" ? "unset" : material.kind === "unavailable" ? "unavailable" : "set";
}

/** Admins can change it only where it's stored (production, with a database). */
export function stationPasswordCanChange(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function verifyStationPassword(input: unknown): Promise<boolean> {
  if (typeof input !== "string" || !input || input.length > STATION_PASSWORD_MAX_LENGTH) return false;
  const material = await passwordMaterial();
  if (material.kind === "stored") return matchesHash(input, material.hash);
  if (material.kind !== "setting") return false;
  // Fixed-length digests, compared in constant time.
  const digest = (value: string) => createHmac("sha256", "millstadt-station-password").update(value).digest();
  return timingSafeEqual(digest(input), digest(material.value));
}

/** Save a new password (the caller has checked the admin). Every signed-in TV is signed out. */
export async function changeStationPassword(newPassword: string): Promise<"saved" | "no-database"> {
  if (!process.env.DATABASE_URL) return "no-database";
  await ensureTable();
  const hash = hashPassword(newPassword);
  await sql()`
    INSERT INTO site_content (key, live_value, updated_at)
    VALUES (${PASSWORD_KEY}, ${hash}, NOW())
    ON CONFLICT (key) DO UPDATE SET live_value = ${hash}, updated_at = NOW()
  `;
  lastGood = hash;
  return "saved";
}

// ── Sessions ──────────────────────────────────────────────────────────────────────────────────────
// token = <expires (unix seconds)>.<nonce>.<signature>; the key mixes an optional server secret with
// the password material, so a password change invalidates every session.

async function sessionKey(material?: Material): Promise<Buffer | null> {
  const current = material ?? await passwordMaterial();
  if (current.kind !== "stored" && current.kind !== "setting") return null;
  return createHash("sha256")
    .update("millstadt-station-session-v1\n")
    .update(process.env.STATION_SESSION_KEY ?? "")
    .update("\n")
    .update(current.kind === "stored" ? `stored:${current.hash}` : `setting:${current.value}`)
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

type SessionCheck = "valid" | "invalid" | "unavailable";

async function checkSession(token: string | undefined, now = Date.now()): Promise<SessionCheck> {
  if (!token || !/^\d{10}\.[a-f0-9]{32}\.[A-Za-z0-9_-]{43}$/.test(token)) return "invalid";
  const [expires, nonce, mac] = token.split(".");
  const remaining = Number(expires) - Math.floor(now / 1000);
  if (remaining <= 0 || remaining > STATION_SESSION_SECONDS) return "invalid";
  const material = await passwordMaterial();
  if (material.kind === "unavailable") return "unavailable";
  const key = await sessionKey(material);
  if (!key) return "invalid";
  const expected = Buffer.from(sign(key, `${expires}.${nonce}`));
  const actual = Buffer.from(mac);
  return actual.length === expected.length && timingSafeEqual(actual, expected) ? "valid" : "invalid";
}

export async function verifyStationSession(token: string | undefined, now = Date.now()): Promise<boolean> {
  return (await checkSession(token, now)) === "valid";
}

async function loungeSsoAllows(): Promise<boolean> {
  try {
    const employee = await currentEmployee();
    return Boolean(employee?.isActive);
  } catch {
    return false;
  }
}

/** signed-in: a valid station session or a Lounge sign-in; unavailable: the password store didn't
 *  answer (the TV should try again shortly, not fall back to the sign-in screen). */
export type StationAuthState = "signed-in" | "signed-out" | "unavailable";

export async function stationAuthState(): Promise<StationAuthState> {
  let session: SessionCheck = "invalid";
  try {
    const jar = await cookies();
    session = await checkSession(jar.get(STATION_COOKIE)?.value);
  } catch {
    session = "invalid";
  }
  if (session === "valid") return "signed-in";
  if (await loungeSsoAllows()) return "signed-in";
  return session === "unavailable" ? "unavailable" : "signed-out";
}

export async function isStationAuthed(): Promise<boolean> {
  return (await stationAuthState()) === "signed-in";
}

export function stationCookieOptions(secure: boolean) {
  return { httpOnly: true, secure, sameSite: "lax" as const, path: "/", maxAge: STATION_SESSION_SECONDS };
}

/** Secure cookies in production, and on any HTTPS request. */
export function wantsSecureCookie(protocol: string, forwardedProto: string | null): boolean {
  return process.env.NODE_ENV === "production" || protocol === "https:" || forwardedProto === "https";
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
 *  server runs with STATION_REVIEW_BYPASS=1 and the request is to localhost. A production build never
 *  honors it. */
export function stationReviewBypass(query: Record<string, string | string[] | undefined>, host: string | null): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.STATION_REVIEW_BYPASS !== "1" || query["station-review"] !== "1") return false;
  const hostname = (host ?? "").replace(/:\d+$/, "");
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

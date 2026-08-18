import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import {
  LOUNGE_COOKIE_NAME,
  verifySessionToken as verifyLoungeSessionToken,
  type LoungeEmployee,
} from "@/lib/lounge/auth";

const COOKIE = "mas_truckcheck";
const AUDIENCE = "truckcheck";
const MAX_AGE = 60 * 15;

type TruckCheckSessionClaims = {
  sub: string;
  aud: typeof AUDIENCE;
  iat: number;
  exp: number;
  nonce: string;
  sv: string;
};

function sessionKey(): string {
  const configured = process.env.TRUCKCHECK_SESSION_SECRET || process.env.TRUCKCHECK_PASSWORD;
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("TRUCKCHECK_SESSION_SECRET is not configured");
  }
  return configured ?? "development-only-truckcheck-secret";
}

function sign(value: string): string {
  return createHmac("sha256", sessionKey()).update(value).digest("base64url");
}

function sessionVersion(loungeSessionToken: string): string {
  return createHmac("sha256", sessionKey())
    .update(`lounge-session\n${loungeSessionToken}`)
    .digest("base64url");
}

function equalText(left: string, right: string): boolean {
  const actual = Buffer.from(left);
  const expected = Buffer.from(right);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function makeSessionToken(
  employeeId: string,
  loungeSessionToken: string,
  options: { now?: number; nonce?: string } = {},
): string {
  const issuedAt = options.now ?? Date.now();
  const claims: TruckCheckSessionClaims = {
    sub: employeeId,
    aud: AUDIENCE,
    iat: issuedAt,
    exp: issuedAt + MAX_AGE * 1000,
    nonce: options.nonce ?? randomBytes(18).toString("base64url"),
    sv: sessionVersion(loungeSessionToken),
  };
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(
  token: string,
  loungeSessionToken: string,
  now = Date.now(),
): TruckCheckSessionClaims | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!payload || !signature || !equalText(signature, sign(payload))) return null;

  let claims: Partial<TruckCheckSessionClaims>;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<TruckCheckSessionClaims>;
  } catch {
    return null;
  }
  if (
    typeof claims.sub !== "string"
    || claims.sub.length < 1
    || claims.sub.length > 128
    || claims.aud !== AUDIENCE
    || typeof claims.iat !== "number"
    || typeof claims.exp !== "number"
    || typeof claims.nonce !== "string"
    || !/^[A-Za-z0-9_-]{16,128}$/.test(claims.nonce)
    || typeof claims.sv !== "string"
    || claims.iat > now + 60_000
    || claims.exp <= now
    || claims.exp - claims.iat !== MAX_AGE * 1000
    || !equalText(claims.sv, sessionVersion(loungeSessionToken))
  ) {
    return null;
  }
  return claims as TruckCheckSessionClaims;
}

export async function authenticateTruckCheckSession(
  truckCheckToken: string,
  loungeSessionToken: string,
  verifyLounge: (token: string) => Promise<LoungeEmployee | null> = verifyLoungeSessionToken,
  now = Date.now(),
): Promise<LoungeEmployee | null> {
  const claims = verifySessionToken(truckCheckToken, loungeSessionToken, now);
  if (!claims) return null;
  const employee = await verifyLounge(loungeSessionToken);
  if (!employee?.isActive || employee.id !== claims.sub) return null;
  return employee;
}

export async function currentTruckCheckEmployee(): Promise<LoungeEmployee | null> {
  try {
    const jar = await cookies();
    const truckCheckToken = jar.get(COOKIE)?.value;
    const loungeSessionToken = jar.get(LOUNGE_COOKIE_NAME)?.value;
    if (!truckCheckToken || !loungeSessionToken) return null;
    return await authenticateTruckCheckSession(truckCheckToken, loungeSessionToken);
  } catch {
    return null;
  }
}

export async function isTruckCheckAuthed(): Promise<boolean> {
  return Boolean(await currentTruckCheckEmployee());
}

export function sessionCookieOptions(token: string) {
  return {
    name: COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: MAX_AGE,
    path: "/",
  };
}

export const COOKIE_NAME = COOKIE;

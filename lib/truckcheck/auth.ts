import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { currentEmployee } from "@/lib/lounge/auth";

const COOKIE = "mas_truckcheck";
const MAX_AGE = 60 * 60 * 12;

function sign(value: string): string {
  const configured = process.env.TRUCKCHECK_PASSWORD;
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("TRUCKCHECK_PASSWORD is not configured");
  }
  const secret = configured ?? "development-only-truckcheck-secret";
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function makeSessionToken(): string {
  const ts = Date.now().toString();
  return `${ts}.${sign(ts)}`;
}

export function verifySessionToken(token: string): boolean {
  const [ts, sig] = token.split(".");
  if (!ts || !sig) return false;
  const issuedAt = Number(ts);
  const age = Date.now() - issuedAt;
  if (!Number.isFinite(issuedAt) || age < -60_000 || age > MAX_AGE * 1000) return false;
  const actual = Buffer.from(sig, "hex");
  const expected = Buffer.from(sign(ts), "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function isTruckCheckAuthed(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token && verifySessionToken(token)) return true;
  // Lounge SSO bridge: any active lounge employee can submit truck checks.
  try {
    const emp = await currentEmployee();
    return !!emp && emp.isActive;
  } catch {
    return false;
  }
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

import { createHmac } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "mas_truckcheck";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days — phones stay logged in

function sign(value: string): string {
  const secret = process.env.TRUCKCHECK_PASSWORD ?? "changeme-truckcheck";
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function makeSessionToken(): string {
  const ts = Date.now().toString();
  return `${ts}.${sign(ts)}`;
}

export function verifySessionToken(token: string): boolean {
  const [ts, sig] = token.split(".");
  if (!ts || !sig) return false;
  if (Date.now() - Number(ts) > MAX_AGE * 1000) return false;
  return sign(ts) === sig;
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

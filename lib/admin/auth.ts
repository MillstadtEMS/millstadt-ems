import { createHmac } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "mas_admin";
const MAX_AGE = 60 * 60 * 8; // 8 hours

function sign(value: string): string {
  const secret = process.env.ADMIN_PASSWORD ?? "changeme";
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function makeSessionToken(): string {
  const ts = Date.now().toString();
  return `${ts}.${sign(ts)}`;
}

export function verifySessionToken(token: string): boolean {
  const [ts, sig] = token.split(".");
  if (!ts || !sig) return false;
  // Expire after 8 hours
  if (Date.now() - Number(ts) > MAX_AGE * 1000) return false;
  return sign(ts) === sig;
}

export async function isAdminAuthed(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return false;
  return verifySessionToken(token);
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

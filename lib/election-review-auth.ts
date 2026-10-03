import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const REVIEW_COOKIE = "mems_election_review";
export const REVIEW_SECONDS = 8 * 60 * 60;
export function electionIsPublic() { return process.env.ELECTION_REVIEW_PUBLIC === "true"; }
export function safeReviewPath(value: unknown): string {
  if (typeof value !== "string") return "/election-information";
  // Only known pages; no externally supplied host, arbitrary path or hash.
  try {
    const url = new URL(value, "https://review.invalid");
    if (url.origin !== "https://review.invalid" || !["/election-information", "/election-information/address-directory", "/ems-tax-calculator"].includes(url.pathname)) return "/election-information";
    const pin = url.searchParams.get("address");
    return url.pathname + (pin && /^\d{11}$/.test(pin) ? `?address=${pin}` : "");
  } catch { return "/election-information"; }
}
export function reviewConfigured() {
  return Boolean(process.env.ELECTION_REVIEW_PASSWORD_HASH && (process.env.ELECTION_REVIEW_SESSION_KEY?.length ?? 0) >= 32);
}
export function verifyReviewPassword(password: unknown): boolean {
  if (!reviewConfigured() || typeof password !== "string" || password.length > 256) return false;
  const [salt, expected] = process.env.ELECTION_REVIEW_PASSWORD_HASH!.split(":");
  if (!/^[a-f0-9]{32}$/.test(salt ?? "") || !/^[a-f0-9]{64}$/.test(expected ?? "")) return false;
  return timingSafeEqual(scryptSync(password, salt, 32), Buffer.from(expected, "hex"));
}
function signature(payload: string) { return createHmac("sha256", process.env.ELECTION_REVIEW_SESSION_KEY!).update(payload).digest("base64url"); }
export function createReviewToken(now = Date.now()): string {
  if (!reviewConfigured()) throw new Error("Election review is not configured.");
  const payload = `${Math.floor(now / 1000) + REVIEW_SECONDS}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${signature(payload)}`;
}
export function verifyReviewToken(token: string | undefined, now = Date.now()): boolean {
  if (!reviewConfigured() || !token || !/^\d{10}\.[a-f0-9]{32}\.[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const [expiry, nonce, mac] = token.split(".");
  const remaining = Number(expiry) - Math.floor(now / 1000);
  if (remaining <= 0 || remaining > REVIEW_SECONDS) return false;
  return timingSafeEqual(Buffer.from(mac), Buffer.from(signature(`${expiry}.${nonce}`)));
}

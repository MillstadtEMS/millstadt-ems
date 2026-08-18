import { createHmac, timingSafeEqual } from "node:crypto";

export const VISUAL_EDITOR_COOKIE = "ve_session";
export const VISUAL_EDITOR_COOKIE_TTL = 60 * 60 * 8;

function visualEditorSecret() {
  const secret = process.env.VE_SECRET;
  if (!secret) throw new Error("VE_SECRET is not configured");
  return secret;
}

export function makeVisualEditorToken() {
  const payload = `ve:${Date.now()}`;
  const signature = createHmac("sha256", visualEditorSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

export function verifyVisualEditorToken(token: string) {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon < 0) return false;
    const payload = decoded.slice(0, lastColon);
    const signature = decoded.slice(lastColon + 1);
    const timestampMatch = payload.match(/^ve:(\d{13})$/);
    if (!timestampMatch) return false;
    const issuedAt = Number(timestampMatch[1]);
    const age = Date.now() - issuedAt;
    if (!Number.isFinite(issuedAt) || age < -60_000 || age > VISUAL_EDITOR_COOKIE_TTL * 1_000) {
      return false;
    }
    const expected = createHmac("sha256", visualEditorSecret()).update(payload).digest("hex");
    const actualBytes = Buffer.from(signature);
    const expectedBytes = Buffer.from(expected);
    return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
  } catch {
    return false;
  }
}

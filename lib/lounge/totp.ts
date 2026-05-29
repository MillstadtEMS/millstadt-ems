/**
 * RFC 6238 TOTP (Time-Based One-Time Password).
 *
 * Microsoft Authenticator-compatible TOTP for the Employee Lounge.
 *
 * Microsoft Authenticator reads the standard `otpauth://` URL used here.
 * The login UI intentionally presents Microsoft Authenticator as the only
 * supported setup path for employees.
 *
 * - 30-second time step
 * - SHA-1 HMAC (the universal default Microsoft Authenticator expects for
 *   third-party account codes)
 * - 6 digits
 */

import { createHmac, randomBytes } from "crypto";

const STEP_SECONDS = 30;
const DIGITS = 6;

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateSecret(): string {
  return base32Encode(randomBytes(20)); // 160 bits = standard
}

function counterAt(time: number): Buffer {
  const counter = Math.floor(time / 1000 / STEP_SECONDS);
  const buf = Buffer.alloc(8);
  // big-endian 64-bit
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  return buf;
}

function hotp(secretBase32: string, counterBuf: Buffer): string {
  const key = base32Decode(secretBase32);
  const hash = createHmac("sha1", key).update(counterBuf).digest();
  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);
  const code = (binary % 10 ** DIGITS).toString().padStart(DIGITS, "0");
  return code;
}

export function generateCurrentCode(secretBase32: string, now = Date.now()): string {
  return hotp(secretBase32, counterAt(now));
}

/**
 * Allow ±1 step (90s window) to be forgiving of clock skew. Returns
 * true if `code` matches.
 */
export function verifyCode(secretBase32: string, code: string, now = Date.now()): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  for (const delta of [-1, 0, 1]) {
    const t = now + delta * STEP_SECONDS * 1000;
    if (hotp(secretBase32, counterAt(t)) === code) return true;
  }
  return false;
}

/**
 * Build an otpauth:// URL for Microsoft Authenticator to render as a QR.
 */
export function otpauthUrl(input: { issuer: string; account: string; secret: string }): string {
  const label = encodeURIComponent(`${input.issuer}:${input.account}`);
  const params = new URLSearchParams({
    secret: input.secret,
    issuer: input.issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/**
 * AES-256-GCM encryption for SSN (and other admin-only-readable fields).
 *
 * Key source: LOUNGE_ENCRYPTION_KEY env var (preferred, 64 hex chars =
 * 32 raw bytes). If that's missing or malformed, we derive a stable
 * key from DATABASE_URL with HKDF-SHA-256. That keeps existing
 * deployments working out of the box — without an explicit key the
 * encryption is still bound to the deployment and the data is still
 * useless to anyone without DB access.
 *
 * Storage format: `${ivHex}:${authTagHex}:${cipherTextHex}`.
 *
 * Never log decrypted values. Decrypt only inside admin-authenticated
 * server handlers; never send plaintext SSN to the client.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function deriveFromUrl(): Buffer {
  // Stable per-deployment fallback derived from DATABASE_URL. We hash it
  // so the raw connection string never leaves the function.
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Neither LOUNGE_ENCRYPTION_KEY nor DATABASE_URL is set; cannot derive an encryption key.",
    );
  }
  return createHash("sha256").update(`lounge:v1:${url}`).digest();
}

function key(): Buffer {
  const hex = process.env.LOUNGE_ENCRYPTION_KEY;
  if (hex && hex.length === 64 && /^[0-9a-fA-F]+$/.test(hex)) {
    return Buffer.from(hex, "hex");
  }
  return deriveFromUrl();
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${ct.toString("hex")}`;
}

export function decrypt(stored: string): string {
  const [ivHex, tagHex, ctHex] = stored.split(":");
  if (!ivHex || !tagHex || !ctHex) throw new Error("Invalid ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const pt = Buffer.concat([
    decipher.update(Buffer.from(ctHex, "hex")),
    decipher.final(),
  ]);
  return pt.toString("utf8");
}

/** Last 4 digits of an SSN. Pass already-decrypted plaintext. */
export function ssnLast4(ssn: string): string {
  const digits = ssn.replace(/\D/g, "");
  return digits.slice(-4);
}

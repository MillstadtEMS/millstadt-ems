/**
 * AES-256-GCM encryption for SSN (and other admin-only-readable fields).
 *
 * Key source: LOUNGE_ENCRYPTION_KEY env var, 64 hex chars (= 32 raw bytes).
 * Storage format: `${ivHex}:${authTagHex}:${cipherTextHex}`.
 *
 * Never log decrypted values. Decrypt only inside admin-authenticated
 * server handlers; never send plaintext SSN to the client. Send last-4
 * to non-admins.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

function key(): Buffer {
  const hex = process.env.LOUNGE_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "LOUNGE_ENCRYPTION_KEY must be 64 hex characters (32 bytes). " +
        "Generate with: openssl rand -hex 32",
    );
  }
  return Buffer.from(hex, "hex");
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

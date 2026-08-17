import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "crypto";

function hashKey() {
  const source = process.env.ANALYTICS_HASH_KEY || "";
  return source ? createHash("sha256").update(source).digest() : null;
}

function encryptionKey() {
  const source = process.env.ANALYTICS_SECURITY_ENCRYPTION_KEY ?? "";
  return source ? createHash("sha256").update(source).digest() : null;
}

export function pseudonymousHash(value: string) {
  const key = hashKey();
  if (!key) return null;
  return createHmac("sha256", key).update(value).digest("hex");
}

export function encryptSecurityIdentifier(value: string | null) {
  const key = encryptionKey();
  if (!key || !value) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${ciphertext.toString("base64url")}`;
}

export function decryptSecurityIdentifier(value: string | null) {
  const key = encryptionKey();
  if (!key || !value) return null;
  const [version, ivText, tagText, cipherText] = value.split(":");
  if (version !== "v1" || !ivText || !tagText || !cipherText) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivText, "base64url"));
    decipher.setAuthTag(Buffer.from(tagText, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(cipherText, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

export function tokenHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

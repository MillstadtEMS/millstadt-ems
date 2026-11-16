import {
  createHash,
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";

export const PORTAL_PATH = "/ten-eight";
export const PORTAL_COOKIE = "__Secure-ten_eight_portal";
export const SESSION_SECONDS = 8 * 60 * 60;
const HASH_PATTERN = /^scrypt-v1\$([A-Za-z0-9_-]{22})\$([A-Za-z0-9_-]{43})$/;
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export type PortalConfig = { passwordHash: string; sessionSecret: string };
export type PortalSession = {
  kind: "portal";
  nonce: string;
  issued: number;
  expires: number;
  credential: string;
};

export function portalConfig(
  env: Record<string, string | undefined> = process.env,
): PortalConfig | null {
  const passwordHash = env.TEN_EIGHT_PORTAL_PASSWORD_HASH || "";
  const sessionSecret = env.TEN_EIGHT_PORTAL_SESSION_SECRET || "";
  const hash = passwordHash.match(HASH_PATTERN);
  if (
    !hash ||
    Buffer.from(hash[1], "base64url").toString("base64url") !== hash[1] ||
    Buffer.from(hash[2], "base64url").toString("base64url") !== hash[2] ||
    !/^[A-Za-z0-9_-]{43,128}$/.test(sessionSecret)
  )
    return null;
  return { passwordHash, sessionSecret };
}

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 32, SCRYPT, (error, value) =>
      error ? reject(error) : resolve(value),
    );
  });
}

export async function hashPortalPassword(password: string): Promise<string> {
  if (password.length < 8 || Buffer.byteLength(password) > 1024)
    throw new Error(
      "Use a portal password of at least 8 characters and at most 1,024 bytes.",
    );
  const salt = randomBytes(16);
  return `scrypt-v1$${salt.toString("base64url")}$${(await derive(password, salt)).toString("base64url")}`;
}

export async function verifyPortalPassword(
  password: string,
  config: PortalConfig,
): Promise<boolean> {
  const match = config.passwordHash.match(HASH_PATTERN);
  if (!match || !password || Buffer.byteLength(password) > 1024) return false;
  const actual = await derive(password, Buffer.from(match[1], "base64url"));
  return timingSafeEqual(actual, Buffer.from(match[2], "base64url"));
}

const credentialVersion = (config: PortalConfig) =>
  createHash("sha256").update(config.passwordHash).digest("base64url");
function sign(value: object, config: PortalConfig): string {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  const signature = createHmac("sha256", config.sessionSecret)
    .update(`ten-eight-portal-v1:${payload}`)
    .digest("base64url");
  return `${payload}.${signature}`;
}
function decode(
  value: string,
  config: PortalConfig,
): Record<string, unknown> | null {
  if (
    value.length > 16000 ||
    !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(value)
  )
    return null;
  const [payload, signature] = value.split(".");
  const expected = createHmac("sha256", config.sessionSecret)
    .update(`ten-eight-portal-v1:${payload}`)
    .digest();
  const supplied = Buffer.from(signature, "base64url");
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  )
    return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function issuePortalSession(
  config: PortalConfig,
  now = Date.now(),
): string {
  return sign(
    {
      kind: "portal",
      nonce: randomBytes(24).toString("base64url"),
      issued: now,
      expires: now + SESSION_SECONDS * 1000,
      credential: credentialVersion(config),
    },
    config,
  );
}
export function verifyPortalSession(
  value: string,
  config: PortalConfig,
  now = Date.now(),
): PortalSession | null {
  const decoded = decode(value, config);
  if (
    !decoded ||
    decoded.kind !== "portal" ||
    typeof decoded.nonce !== "string" ||
    !/^[A-Za-z0-9_-]{32}$/.test(decoded.nonce) ||
    typeof decoded.issued !== "number" ||
    decoded.issued > now ||
    typeof decoded.expires !== "number" ||
    decoded.expires <= now ||
    decoded.expires !== decoded.issued + SESSION_SECONDS * 1000 ||
    decoded.credential !== credentialVersion(config)
  )
    return null;
  return decoded as PortalSession;
}

// Only tokens returned by a positively identified public-demo login may cross
// this proxy. The envelope is bound to this browser's portal session; arbitrary
// existing website/private-workspace bearer tokens are never forwarded.
export function wrapDemoToken(
  token: string,
  session: PortalSession,
  config: PortalConfig,
): string {
  return sign(
    {
      kind: "public-demo-token",
      token,
      nonce: session.nonce,
      expires: session.expires,
    },
    config,
  );
}
export function unwrapDemoToken(
  value: string,
  session: PortalSession,
  config: PortalConfig,
  now = Date.now(),
): string | null {
  const decoded = decode(value, config);
  return decoded?.kind === "public-demo-token" &&
    decoded.nonce === session.nonce &&
    decoded.expires === session.expires &&
    session.expires > now &&
    typeof decoded.token === "string" &&
    decoded.token.length <= 4096 &&
    /^[A-Za-z0-9._~+/-]+=*$/.test(decoded.token)
    ? decoded.token
    : null;
}
export function sessionCookie(value: string): string {
  return `${PORTAL_COOKIE}=${value}; Path=${PORTAL_PATH}; Max-Age=${value ? SESSION_SECONDS : 0}; HttpOnly; Secure; SameSite=Strict`;
}
export function requestSession(
  request: Request,
  config: PortalConfig,
  now = Date.now(),
): PortalSession | null {
  const entries = (request.headers.get("cookie") || "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${PORTAL_COOKIE}=`));
  if (entries.length !== 1) return null;
  return verifyPortalSession(
    entries[0].slice(PORTAL_COOKIE.length + 1),
    config,
    now,
  );
}

import { createHash, timingSafeEqual } from "node:crypto";

export const REVALIDATABLE_PATHS = [
  "/",
  "/about",
  "/leadership",
  "/testimonials",
  "/bulletin",
  "/community-education",
  "/fleet",
  "/careers",
  "/events",
  "/gallery",
] as const;

const REVALIDATABLE_PATH_SET = new Set<string>(REVALIDATABLE_PATHS);

export function hasValidBearerSecret(authorization: string | null, configuredSecret: string | undefined) {
  if (!configuredSecret || configuredSecret.trim().length === 0 || !authorization?.startsWith("Bearer ")) {
    return false;
  }

  const suppliedSecret = authorization.slice("Bearer ".length);
  if (!suppliedSecret) return false;

  const expectedDigest = createHash("sha256").update(configuredSecret).digest();
  const suppliedDigest = createHash("sha256").update(suppliedSecret).digest();
  return timingSafeEqual(expectedDigest, suppliedDigest);
}

export type RevalidationPathSelection =
  | { ok: true; paths: string[] }
  | { ok: false; error: string };

export function selectRevalidationPaths(input: unknown): RevalidationPathSelection {
  if (input === undefined) {
    return { ok: true, paths: [...REVALIDATABLE_PATHS] };
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Invalid revalidation request." };
  }

  const record = input as Record<string, unknown>;
  if (Object.keys(record).some((key) => key !== "paths")) {
    return { ok: false, error: "Invalid revalidation request." };
  }
  if (!Array.isArray(record.paths) || record.paths.length === 0 || record.paths.length > REVALIDATABLE_PATHS.length) {
    return { ok: false, error: "At least one allowed path is required." };
  }

  const paths = [...new Set(record.paths)];
  if (paths.some((path) => typeof path !== "string" || !REVALIDATABLE_PATH_SET.has(path))) {
    return { ok: false, error: "One or more revalidation paths are not allowed." };
  }
  return { ok: true, paths: paths as string[] };
}

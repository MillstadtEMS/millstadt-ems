const PROTECTED_PATH_PREFIXES = [
  "/admin",
  "/api",
  "/board",
  "/lounge",
  "/truckcheck",
  "/financials-information-hub",
];

export function isSafePublicPath(value: string) {
  if (!value.startsWith("/") || value.length > 160 || value.includes("?") || value.includes("#")) {
    return false;
  }
  return !PROTECTED_PATH_PREFIXES.some(
    (prefix) => value === prefix || value.startsWith(prefix + "/"),
  );
}

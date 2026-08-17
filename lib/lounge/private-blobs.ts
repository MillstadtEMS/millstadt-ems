const PREFIX = "private-blob:v1:";

export function privateBlobReference(pathname: string) {
  const normalized = pathname.replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) throw new Error("Invalid private blob pathname");
  return `${PREFIX}${Buffer.from(normalized, "utf8").toString("base64url")}`;
}

export function privateBlobPath(reference: string) {
  if (!reference.startsWith(PREFIX)) return null;
  try {
    const pathname = Buffer.from(reference.slice(PREFIX.length), "base64url").toString("utf8");
    if (!pathname || pathname.startsWith("/") || pathname.includes("..")) return null;
    return pathname;
  } catch {
    return null;
  }
}

export function privateIncidentBlobUrl(reference: string) {
  if (!privateBlobPath(reference)) return reference;
  return `/api/lounge/incidents/blob?ref=${encodeURIComponent(reference)}`;
}

export function privateLoungeBlobUrl(reference: string | null) {
  if (!reference || !privateBlobPath(reference)) return reference;
  return `/api/lounge/files?ref=${encodeURIComponent(reference)}`;
}

export function privateLoungeBlobAbsoluteUrl(reference: string) {
  const url = privateLoungeBlobUrl(reference) ?? reference;
  if (!url.startsWith("/")) return url;
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://millstadtems.org";
  return new URL(url, origin).toString();
}

export function privateBlobDeleteTarget(value: string) {
  return privateBlobPath(value) ?? value;
}

export function privateIncidentBlobReference(value: string) {
  if (privateBlobPath(value)) return value;
  try {
    const parsed = new URL(value, "https://local.invalid");
    if (parsed.pathname !== "/api/lounge/incidents/blob") return null;
    const reference = parsed.searchParams.get("ref") ?? "";
    return privateBlobPath(reference) ? reference : null;
  } catch {
    return null;
  }
}

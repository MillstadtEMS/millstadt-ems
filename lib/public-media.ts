export const PUBLIC_MEDIA_COLLECTIONS = ["hero", "gallery"] as const;

export type PublicMediaCollection = (typeof PUBLIC_MEDIA_COLLECTIONS)[number];

export interface PublicMediaItem {
  url: string;
  altText: string;
  brightness: number;
}

export function isPublicMediaCollection(value: string | null): value is PublicMediaCollection {
  return value !== null && PUBLIC_MEDIA_COLLECTIONS.some((collection) => collection === value);
}

function isApprovedPublicUrl(value: string) {
  if (value.startsWith("/images/") && !value.includes("..") && !value.includes("\\")) return true;

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export function toPublicMediaItems(value: unknown): PublicMediaItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Record<string, unknown>;
    if (candidate.published === false) return [];
    const url = typeof candidate.url === "string" ? candidate.url.trim() : "";
    if (!url || !isApprovedPublicUrl(url)) return [];

    const rawBrightness = typeof candidate.brightness === "number" ? candidate.brightness : 0.45;
    const brightness = Number.isFinite(rawBrightness)
      ? Math.min(1, Math.max(0, rawBrightness))
      : 0.45;

    return [{
      url,
      altText: typeof candidate.altText === "string" ? candidate.altText.trim() : "",
      brightness,
    }];
  });
}

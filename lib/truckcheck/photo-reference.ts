import { privateBlobPath } from "@/lib/lounge/private-blobs";

export function isPrivateTruckPhotoUrl(value: string, requestOrigin: string) {
  try {
    const expectedOrigin = new URL(requestOrigin).origin;
    const url = new URL(value);
    const pathname = privateBlobPath(url.searchParams.get("ref") ?? "");
    return url.origin === expectedOrigin &&
      url.pathname === "/api/truckcheck/photo" &&
      Boolean(pathname?.startsWith("truckcheck/photos/"));
  } catch {
    return false;
  }
}

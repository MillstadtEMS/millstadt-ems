import { NextRequest, NextResponse } from "next/server";
import { getGalleryImages } from "@/lib/db";
import { isPublicMediaCollection, toPublicMediaItems } from "@/lib/public-media";

export const runtime = "nodejs";

const PUBLIC_CACHE_CONTROL = "public, max-age=60, s-maxage=300, stale-while-revalidate=300";

export async function GET(request: NextRequest) {
  const collection = request.nextUrl.searchParams.get("collection");
  if (!isPublicMediaCollection(collection)) {
    return NextResponse.json(
      { error: "collection must be hero or gallery" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const images = toPublicMediaItems(await getGalleryImages(collection));
    return NextResponse.json(images, {
      headers: { "Cache-Control": PUBLIC_CACHE_CONTROL },
    });
  } catch {
    return NextResponse.json(
      { error: "Public media is temporarily unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

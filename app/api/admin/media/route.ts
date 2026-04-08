import { NextRequest, NextResponse } from "next/server";
import {
  getAllManagedImages,
  setManagedImage,
  deleteManagedImage,
  getGalleryImages,
  addGalleryImage,
  deleteGalleryImage,
} from "@/lib/db";

export const runtime = "nodejs";

// GET /api/admin/media — returns named slots + gallery collections
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const collection = searchParams.get("collection");
  if (collection) {
    const images = await getGalleryImages(collection);
    return NextResponse.json(images);
  }
  const named = await getAllManagedImages();
  return NextResponse.json(named);
}

// POST /api/admin/media — set named image OR add to gallery
export async function POST(req: NextRequest) {
  const body = await req.json() as { key?: string; url?: string; collection?: string; altText?: string; brightness?: number };
  if (body.collection && body.url) {
    const img = await addGalleryImage(body.collection, body.url, body.altText ?? "", body.brightness ?? 0.45);
    return NextResponse.json(img);
  }
  if (body.key && body.url !== undefined) {
    await setManagedImage(body.key, body.url);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Invalid body" }, { status: 400 });
}

// DELETE /api/admin/media
export async function DELETE(req: NextRequest) {
  const body = await req.json() as { key?: string; id?: string };
  if (body.id) {
    await deleteGalleryImage(body.id);
    return NextResponse.json({ ok: true });
  }
  if (body.key) {
    await deleteManagedImage(body.key);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Need key or id" }, { status: 400 });
}

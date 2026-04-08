import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

const PAGES = ["/", "/about", "/leadership", "/testimonials", "/bulletin", "/community-education", "/fleet", "/careers", "/events", "/gallery"];

export async function POST() {
  for (const path of PAGES) {
    revalidatePath(path);
  }
  return NextResponse.json({ ok: true, revalidated: PAGES });
}

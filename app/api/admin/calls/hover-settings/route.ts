import { NextRequest, NextResponse } from "next/server";
import { requireTickerEditor } from "@/lib/admin/auth";
import { getHoverSettings, setHoverSettings } from "@/lib/cad/settings";

export const runtime = "nodejs";

/** Admin: read the current hover-box field visibility config. */
export async function GET() {
  const denied = await requireTickerEditor(); if (denied) return denied;
  return NextResponse.json(await getHoverSettings());
}

/** Admin: update which fields show in the public hover box. */
export async function PUT(req: NextRequest) {
  const denied = await requireTickerEditor(); if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const settings = await setHoverSettings(body);
  return NextResponse.json({ ok: true, settings });
}

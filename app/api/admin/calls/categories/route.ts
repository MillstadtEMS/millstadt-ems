/**
 * GET  /api/admin/calls/categories       — list active categories
 * POST /api/admin/calls/categories       — add (or reactivate) a category
 *                                          body: { name: string }
 *
 * Gated on the ticker-editor permission so any granted editor can
 * manage the category list, not only full admins.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireTickerEditor } from "@/lib/admin/auth";
import {
  addCategory,
  ensureCadStructuredSchema,
  listCategories,
} from "@/lib/cad/structured";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireTickerEditor(); if (denied) return denied;
  await ensureCadStructuredSchema();
  const categories = await listCategories();
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const denied = await requireTickerEditor(); if (denied) return denied;
  const body = await req.json().catch(() => ({})) as { name?: string };
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (name.length > 80) return NextResponse.json({ error: "Name too long (max 80)" }, { status: 400 });
  await addCategory(name);
  const categories = await listCategories();
  return NextResponse.json({ ok: true, name, categories });
}

/**
 * GET    /api/admin/calls/categories   — list active categories
 * POST   /api/admin/calls/categories   — add a category { name }
 *                                        or clean dupes { action: "dedupe" }
 * PATCH  /api/admin/calls/categories   — rename { from, to }
 * DELETE /api/admin/calls/categories   — remove from list { name }
 *
 * All routes only touch the cad_categories dropdown list. They never
 * rewrite cad_calls.dispatch_nature, so the live ticker and existing
 * call text are unaffected.
 *
 * Gated on the ticker-editor permission so any granted editor can
 * manage the category list, not only full admins.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireTickerEditor } from "@/lib/admin/auth";
import {
  addCategory,
  deactivateCategory,
  ensureCadStructuredSchema,
  listCategories,
  mergeDuplicateCategories,
  renameCategory,
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
  const body = await req.json().catch(() => ({})) as { name?: string; action?: string };

  if (body.action === "dedupe") {
    const { removed } = await mergeDuplicateCategories();
    const categories = await listCategories();
    return NextResponse.json({ ok: true, removed, categories });
  }

  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (name.length > 80) return NextResponse.json({ error: "Name too long (max 80)" }, { status: 400 });
  await addCategory(name);
  const categories = await listCategories();
  return NextResponse.json({ ok: true, name, categories });
}

export async function PATCH(req: NextRequest) {
  const denied = await requireTickerEditor(); if (denied) return denied;
  const body = await req.json().catch(() => ({})) as { from?: string; to?: string };
  const from = typeof body.from === "string" ? body.from : "";
  const to = (body.to ?? "").trim();
  if (!from || !to) return NextResponse.json({ error: "Both from and to are required" }, { status: 400 });
  if (to.length > 80) return NextResponse.json({ error: "Name too long (max 80)" }, { status: 400 });
  await renameCategory(from, to);
  const categories = await listCategories();
  return NextResponse.json({ ok: true, categories });
}

export async function DELETE(req: NextRequest) {
  const denied = await requireTickerEditor(); if (denied) return denied;
  const body = await req.json().catch(() => ({})) as { name?: string };
  const name = typeof body.name === "string" ? body.name : "";
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  await deactivateCategory(name);
  const categories = await listCategories();
  return NextResponse.json({ ok: true, categories });
}

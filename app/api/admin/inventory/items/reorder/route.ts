/**
 * Admin inventory editor — bulk reorder / relocate after a drag-and-drop.
 *
 * POST /api/admin/inventory/items/reorder
 *   { updates: [{ id, sortOrder, location?, categoryId? }, ...] }
 *
 * Used when an item is dragged to a new position or dropped into a
 * different area/category. Admin-gated.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { reorderItems } from "@/lib/inventory/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const updates = Array.isArray(body.updates) ? body.updates : null;
  if (!updates) return NextResponse.json({ error: "updates array required" }, { status: 400 });

  const clean = updates
    .filter((u: unknown): u is { id: string; sortOrder: number } => {
      const o = u as { id?: unknown; sortOrder?: unknown };
      return typeof o.id === "string" && typeof o.sortOrder === "number";
    })
    .map((u: { id: string; sortOrder: number; location?: unknown; categoryId?: unknown }) => ({
      id: u.id,
      sortOrder: u.sortOrder,
      ...(u.location !== undefined ? { location: u.location === null ? null : String(u.location) } : {}),
      ...(typeof u.categoryId === "string" ? { categoryId: u.categoryId } : {}),
    }));

  await reorderItems(clean);
  return NextResponse.json({ ok: true, count: clean.length });
}

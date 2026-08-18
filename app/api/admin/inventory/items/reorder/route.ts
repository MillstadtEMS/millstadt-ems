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
import { currentAdmin } from "@/lib/admin/auth";
import { reorderItems } from "@/lib/inventory/db";
import { isSameOriginRequest } from "@/lib/security/http";
import { inventoryActor } from "@/lib/inventory/mutation-security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Cross-origin request denied" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const updates = Array.isArray(body.updates) ? body.updates : null;
  if (!updates || updates.length > 500) {
    return NextResponse.json({ error: "A bounded updates array is required" }, { status: 400 });
  }

  const clean = updates
    .filter((u: unknown): u is { id: string; sortOrder: number } => {
      const o = u as { id?: unknown; sortOrder?: unknown };
      return typeof o.id === "string" && Number.isInteger(o.sortOrder) && Number(o.sortOrder) >= 0;
    })
    .map((u: { id: string; sortOrder: number; location?: unknown; categoryId?: unknown }) => ({
      id: u.id,
      sortOrder: u.sortOrder,
      ...(u.location !== undefined ? { location: u.location === null ? null : String(u.location) } : {}),
      ...(typeof u.categoryId === "string" ? { categoryId: u.categoryId } : {}),
    }));

  await reorderItems(clean, inventoryActor(admin));
  return NextResponse.json({ ok: true, count: clean.length });
}

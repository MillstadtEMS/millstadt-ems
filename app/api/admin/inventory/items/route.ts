/**
 * Admin inventory editor API — manage item *definitions*.
 *
 * GET    /api/admin/inventory/items?type=backstock  → { items, categories }
 * POST   /api/admin/inventory/items                 → create a new item
 *
 * Admin-gated (KJ + Goetz). Separate from /api/inventory/items, which is
 * the inventory-password-gated counting/voice flow — untouched here.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getItems, getCategories, createItem } from "@/lib/inventory/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const type = new URL(req.url).searchParams.get("type") ?? "backstock";
  const [items, allCats] = await Promise.all([getItems(undefined, type), getCategories()]);
  const categories = allCats.filter((c) => c.inventoryType === type);
  return NextResponse.json({ items, categories });
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const { categoryId, name, location, par, vendorSource, skipOrder, sortOrder } = body;
  if (!categoryId || !name || !String(name).trim()) {
    return NextResponse.json({ error: "categoryId and name are required" }, { status: 400 });
  }

  const item = await createItem({
    categoryId,
    name: String(name).trim(),
    location: location ?? undefined,
    par: typeof par === "number" ? par : 0,
    vendorSource: vendorSource ?? undefined,
    skipOrder: !!skipOrder,
    sortOrder: typeof sortOrder === "number" ? sortOrder : 9999,
  });
  return NextResponse.json({ item });
}

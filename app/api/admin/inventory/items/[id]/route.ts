/**
 * Admin inventory editor — edit / delete a single item definition.
 *
 * PATCH  /api/admin/inventory/items/[id]   → rename, relocate, retarget par,
 *                                            vendor, skip, sort, move category
 * DELETE /api/admin/inventory/items/[id]   → remove the item
 *
 * Admin-gated. Last-write-wins (no version check) — this is the admin
 * editor, not the concurrent counting flow.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { adminUpdateItem, deleteItem, type AdminItemFields } from "@/lib/inventory/db";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const fields: AdminItemFields = {};
  if (typeof body.name === "string") fields.name = body.name.trim();
  if (body.location !== undefined) fields.location = body.location === null ? null : String(body.location);
  if (typeof body.par === "number" && body.par >= 0) fields.par = Math.floor(body.par);
  if (body.vendorSource !== undefined) fields.vendorSource = body.vendorSource === null ? null : String(body.vendorSource);
  if (typeof body.skipOrder === "boolean") fields.skipOrder = body.skipOrder;
  if (typeof body.sortOrder === "number") fields.sortOrder = body.sortOrder;
  if (typeof body.categoryId === "string") fields.categoryId = body.categoryId;

  const item = await adminUpdateItem(id, fields);
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  return NextResponse.json({ item });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  await deleteItem(id);
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { isInventoryAuthed } from "@/lib/inventory/auth";
import { getItem, updateItem } from "@/lib/inventory/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await isInventoryAuthed();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const item = await getItem(id);
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await isInventoryAuthed();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { version, currentStock, expiredQty, notes, par } = body;

  if (version == null) {
    return NextResponse.json({ error: "Version required for concurrent editing" }, { status: 400 });
  }

  const result = await updateItem(id, version, { currentStock, expiredQty, notes, par }, "inventory");
  if (result.conflict) {
    return NextResponse.json(
      { error: "Conflict — item was updated by another user", item: result.item },
      { status: 409 }
    );
  }
  if (!result.success) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  return NextResponse.json(result.item);
}

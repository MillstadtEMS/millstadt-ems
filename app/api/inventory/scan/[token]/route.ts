import { NextRequest, NextResponse } from "next/server";
import { getItemByQrToken, updateItem } from "@/lib/inventory/db";

// QR scan routes are PUBLIC — token is the auth
// But they only expose a single item and limited operations

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const item = await getItemByQrToken(token);
  if (!item) {
    return NextResponse.json({ error: "Invalid or expired QR code" }, { status: 404 });
  }
  // Only expose limited info — no history, no admin data
  return NextResponse.json({
    id: item.id,
    name: item.name,
    location: item.location,
    categoryName: item.categoryName,
    par: item.par,
    currentStock: item.currentStock,
    expiredQty: item.expiredQty,
    qtyToOrder: item.qtyToOrder,
    version: item.version,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const item = await getItemByQrToken(token);
  if (!item) {
    return NextResponse.json({ error: "Invalid or expired QR code" }, { status: 404 });
  }

  const body = await req.json();
  const { currentStock, expiredQty, notes, version } = body;

  if (version == null) {
    return NextResponse.json({ error: "Version required" }, { status: 400 });
  }

  const result = await updateItem(
    item.id,
    version,
    { currentStock, expiredQty, notes },
    `qr:${token.slice(0, 8)}`
  );

  if (result.conflict) {
    const refreshed = await getItemByQrToken(token);
    return NextResponse.json(
      { error: "Item was updated by someone else", item: refreshed },
      { status: 409 }
    );
  }
  if (!result.success) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, item: result.item });
}

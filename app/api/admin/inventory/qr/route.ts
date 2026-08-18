import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin/auth";
import { createQrToken, getQrTokens, revokeQrToken, getItems } from "@/lib/inventory/db";
import QRCode from "qrcode";
import { isSameOriginRequest } from "@/lib/security/http";
import { inventoryActor } from "@/lib/inventory/mutation-security";

export async function GET() {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tokens = await getQrTokens();
  return NextResponse.json(tokens);
}

export async function POST(req: NextRequest) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Cross-origin request denied" }, { status: 403 });
  }

  try {
    const { itemId, label, bulkCategorySlug } = await req.json();
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://millstadtems.org";

    // Bulk QR generation for a category
    if (bulkCategorySlug) {
      const items = await getItems(bulkCategorySlug);
      const results = [];
      for (const item of items) {
        const { token } = await createQrToken(item.id, item.name, inventoryActor(admin));
        const url = `${base}/inventory/scan/${token}`;
        const qrDataUrl = await QRCode.toDataURL(url, { width: 200, margin: 1 });
        results.push({ itemId: item.id, itemName: item.name, token, url, qrDataUrl });
      }
      return NextResponse.json({ ok: true, tokens: results });
    }

    // Single item QR
    if (!itemId) {
      return NextResponse.json({ error: "itemId required" }, { status: 400 });
    }
    const { id, token } = await createQrToken(itemId, label, inventoryActor(admin));
    const url = `${base}/inventory/scan/${token}`;
    const qrDataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 });

    return NextResponse.json({ ok: true, id, token, url, qrDataUrl });
  } catch (e) {
    console.error("QR creation error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Cross-origin request denied" }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Token ID required" }, { status: 400 });
  }
  const revoked = await revokeQrToken(id, inventoryActor(admin));
  if (!revoked) return NextResponse.json({ error: "Token not found or already revoked" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

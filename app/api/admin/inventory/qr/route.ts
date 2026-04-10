import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin/auth";
import { createQrToken, getQrTokens, revokeQrToken, getItems } from "@/lib/inventory/db";
import QRCode from "qrcode";

export async function GET() {
  const authed = await isAdminAuthed();
  if (!authed) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }
  const tokens = await getQrTokens();
  return NextResponse.json(tokens);
}

export async function POST(req: NextRequest) {
  const authed = await isAdminAuthed();
  if (!authed) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }

  try {
    const { itemId, label, bulkCategorySlug } = await req.json();
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://millstadtems.org";

    // Bulk QR generation for a category
    if (bulkCategorySlug) {
      const items = await getItems(bulkCategorySlug);
      const results = [];
      for (const item of items) {
        const { token } = await createQrToken(item.id, item.name);
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
    const { id, token } = await createQrToken(itemId, label);
    const url = `${base}/inventory/scan/${token}`;
    const qrDataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 });

    return NextResponse.json({ ok: true, id, token, url, qrDataUrl });
  } catch (e) {
    console.error("QR creation error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authed = await isAdminAuthed();
  if (!authed) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Token ID required" }, { status: 400 });
  }
  await revokeQrToken(id);
  return NextResponse.json({ ok: true });
}

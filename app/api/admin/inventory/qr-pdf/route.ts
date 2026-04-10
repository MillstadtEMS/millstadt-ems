export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin/auth";
import { getItems, getCategories, getQrTokens, createQrToken } from "@/lib/inventory/db";
import { generateQrSheetPdf } from "@/lib/inventory/qr-pdf";

export async function POST(req: NextRequest) {
  const authed = await isAdminAuthed();
  if (!authed) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }

  try {
    const { categorySlug } = await req.json();
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://millstadtems.org";
    const items = await getItems(categorySlug ?? undefined);
    const categories = await getCategories();
    const categoryName = categorySlug
      ? categories.find(c => c.slug === categorySlug)?.name ?? categorySlug
      : "All Categories";

    // Get existing tokens or create new ones
    const existingTokens = await getQrTokens();
    const tokenMap = new Map(existingTokens.filter(t => t.active).map(t => [t.itemId, t.token]));

    const qrItems = [];
    for (const item of items) {
      let token = tokenMap.get(item.id);
      if (!token) {
        const created = await createQrToken(item.id, item.name);
        token = created.token;
      }
      qrItems.push({
        itemName: item.name,
        location: item.location,
        url: `${base}/inventory/scan/${token}`,
      });
    }

    const pdfBuffer = await generateQrSheetPdf(qrItems, categoryName);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="QR_Codes_${categorySlug ?? "all"}.pdf"`,
      },
    });
  } catch (e) {
    console.error("QR PDF error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

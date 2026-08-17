import { NextRequest, NextResponse } from "next/server";

import { requireFinancialsAdmin } from "@/lib/financials-hub/api-helpers";
import {
  findManagedDocument,
  readManagedDocumentPdf,
} from "@/lib/financials-hub/document-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireFinancialsAdmin(req.headers);
  if ("response" in admin) return admin.response;

  const { id } = await ctx.params;
  const document = findManagedDocument(id, true);
  const pdf = readManagedDocumentPdf(id, true);
  if (!document || !pdf) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${document.id}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

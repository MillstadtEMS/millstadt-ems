import { NextRequest, NextResponse } from "next/server";

import {
  disabledFinancialsResponse,
  requireFinancialsCapability,
} from "@/lib/financials-hub/api-helpers";
import { publicFinancialDocumentPdf } from "@/lib/financials-hub/public-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAFE_DOCUMENT_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ documentId: string }> },
) {
  if (!requireFinancialsCapability("documents")) {
    return disabledFinancialsResponse();
  }

  const { documentId } = await ctx.params;
  if (!SAFE_DOCUMENT_ID.test(documentId)) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const result = publicFinancialDocumentPdf(documentId);
  if (!result) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const download = req.nextUrl.searchParams.get("download") === "1";
  return new NextResponse(result.pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${result.filename}"`,
      "Cache-Control": "no-store",
      "Cross-Origin-Resource-Policy": "same-origin",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

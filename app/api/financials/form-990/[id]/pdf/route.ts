import { NextRequest, NextResponse } from "next/server";
import {
  disabledFinancialsResponse,
  requireFinancialsCapability,
} from "@/lib/financials-hub/api-helpers";
import {
  findPublicForm990,
  form990PdfBuffer,
} from "@/lib/financials-hub/form990";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!requireFinancialsCapability("public990s")) {
    return disabledFinancialsResponse();
  }

  const { id } = await ctx.params;
  const doc = findPublicForm990(id);
  if (!doc) {
    return NextResponse.json({ error: "Form 990 not found" }, { status: 404 });
  }

  const download = req.nextUrl.searchParams.get("download") === "1";
  const filename = `${doc.id}-PUBLIC-FORM-990.pdf`;
  return new NextResponse(form990PdfBuffer(doc), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

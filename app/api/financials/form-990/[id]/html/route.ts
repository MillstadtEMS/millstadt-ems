import { NextRequest, NextResponse } from "next/server";
import {
  disabledFinancialsResponse,
  requireFinancialsCapability,
} from "@/lib/financials-hub/api-helpers";
import {
  findPublicForm990,
  form990HtmlDocument,
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

  const html = form990HtmlDocument(doc);
  const response = new NextResponse(
    req.nextUrl.searchParams.get("print") === "1"
      ? html.replace("</body>", "<script>window.addEventListener('load', () => window.print())</script></body>")
      : html,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
  return response;
}

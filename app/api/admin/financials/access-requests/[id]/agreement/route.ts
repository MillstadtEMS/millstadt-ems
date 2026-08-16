import { NextResponse } from "next/server";
import { requireFinancialsAdmin } from "@/lib/financials-hub/api-helpers";
import { signedAgreementForRequest } from "@/lib/financials-hub/dev-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await requireFinancialsAdmin(req.headers);
  if ("response" in admin) return admin.response;

  const { id } = await context.params;
  const agreement = signedAgreementForRequest(id);
  if (!agreement) {
    return NextResponse.json({ error: "Signed agreement not found." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(agreement.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${agreement.filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

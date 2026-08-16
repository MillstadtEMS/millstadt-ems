import {
  handleFinancialsError,
  requireFinancialsAdmin,
} from "@/lib/financials-hub/api-helpers";
import { accuracyReportAgreement } from "@/lib/financials-hub/accuracy-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireFinancialsAdmin(req.headers);
  if ("response" in admin) return admin.response;
  try {
    const { id } = await ctx.params;
    const agreement = accuracyReportAgreement(id);
    return new Response(new Uint8Array(agreement.pdf), {
      headers: {
        "Cache-Control": "no-store, private",
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${agreement.filename}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleFinancialsError(error);
  }
}

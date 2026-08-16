import {
  handleFinancialsError,
  requireFinancialsAdmin,
} from "@/lib/financials-hub/api-helpers";
import { accuracyReportAttachment } from "@/lib/financials-hub/accuracy-store";

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
    const attachment = accuracyReportAttachment(id);
    return new Response(new Uint8Array(attachment.bytes), {
      headers: {
        "Cache-Control": "no-store, private",
        "Content-Type": attachment.upload.contentType,
        "Content-Disposition": `attachment; filename="${attachment.upload.originalFilename.replaceAll('"', "")}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleFinancialsError(error);
  }
}

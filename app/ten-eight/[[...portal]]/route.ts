import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { handlePortalRequest } from "@/lib/ten-eight-portal/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;
type Context = { params: Promise<{ portal?: string[] }> };
async function handle(request: NextRequest, context: Context) {
  const { portal = [] } = await context.params;
  return handlePortalRequest(request, portal, {
    // Existing website limiter: durable in the site's configured database,
    // with its established bounded memory fallback. No form code is changed.
    loginAllowance: () =>
      checkRateLimit(request, "ten-eight-portal-login", {
        limit: 6,
        windowMs: 10 * 60 * 1000,
        blockMs: 15 * 60 * 1000,
      }),
  });
}
export { handle as GET, handle as POST, handle as HEAD };

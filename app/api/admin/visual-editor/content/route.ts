/**
 * GET  /api/admin/visual-editor/content — fetch all content (live + draft)
 * POST /api/admin/visual-editor/content — save draft for one or more keys
 * PUT  /api/admin/visual-editor/content — publish all drafts (or specific keys)
 */
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyVisualEditorToken, VISUAL_EDITOR_COOKIE } from "@/lib/admin/visual-editor-auth";
import { visualEditorDraftSchema, visualEditorPublishSchema } from "@/lib/admin/visual-editor-schema";
import { currentAdmin } from "@/lib/admin/auth";
import { getAllContent, saveDraft, publishAllDrafts, publishContent, logChange } from "@/lib/db";
import { contentLengthWithin, hasContentType, isSameOriginRequest, noStoreJson } from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

async function editorAdmin() {
  const admin = await currentAdmin();
  if (!admin) return null;
  const store = await cookies();
  const token = store.get(VISUAL_EDITOR_COOKIE)?.value;
  return token && verifyVisualEditorToken(token) ? admin : null;
}

async function authorizeMutation(req: NextRequest) {
  const admin = await editorAdmin();
  if (!admin) return { response: noStoreJson({ error: "Unauthorized" }, { status: 401 }) } as const;
  if (!isSameOriginRequest(req)) {
    return { response: noStoreJson({ error: "Cross-origin request denied" }, { status: 403 }) } as const;
  }
  if (!hasContentType(req, "application/json") || !contentLengthWithin(req, 2 * 1024 * 1024)) {
    return { response: noStoreJson({ error: "Invalid request" }, { status: 400 }) } as const;
  }
  const limit = await checkRateLimit(req, "visual-editor-content", {
    limit: 120,
    windowMs: 60_000,
    discriminator: admin.id,
  });
  if (!limit.allowed) {
    return {
      response: noStoreJson(
        { error: "Too many editor requests. Please wait and try again." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      ),
    } as const;
  }
  return { admin } as const;
}

export async function GET() {
  if (!(await editorAdmin())) return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  const content = await getAllContent();
  return noStoreJson(content);
}

export async function POST(req: NextRequest) {
  const authorization = await authorizeMutation(req);
  if ("response" in authorization) return authorization.response;
  const parsed = visualEditorDraftSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return noStoreJson({ error: "Invalid draft request" }, { status: 400 });
  const body = parsed.data;
  if ("drafts" in body) {
    for (const { key, value } of body.drafts) await saveDraft(key, value);
    await logChange("Save Draft", "Visual Editor", `${body.drafts.length} field(s) saved as draft`);
  } else {
    await saveDraft(body.key, body.value);
    await logChange("Save Draft", "Visual Editor", `${body.key} updated`);
  }
  return noStoreJson({ ok: true });
}

export async function PUT(req: NextRequest) {
  const authorization = await authorizeMutation(req);
  if ("response" in authorization) return authorization.response;
  const parsed = visualEditorPublishSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return noStoreJson({ error: "Invalid publish request" }, { status: 400 });
  const body = parsed.data;
  if (body.keys?.length) {
    await publishContent(body.keys);
  } else {
    await publishAllDrafts();
  }
  await logChange("Publish", "Visual Editor", "All drafts published to live site");
  // Trigger revalidation of public pages
  const baseUrl = process.env.NEXTAUTH_URL ?? (
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"
  );
  const revalidationSecret = process.env.CRON_SECRET;
  if (revalidationSecret?.trim()) {
    try {
      await fetch(`${baseUrl}/api/revalidate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${revalidationSecret}` },
      });
    } catch { /* non-fatal */ }
  }
  return noStoreJson({ ok: true });
}

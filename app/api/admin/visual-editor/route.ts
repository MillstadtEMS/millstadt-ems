/**
 * POST /api/admin/visual-editor — unlock the visual editor with second password
 * DELETE /api/admin/visual-editor — lock / sign out of visual editor
 */
import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  makeVisualEditorToken,
  VISUAL_EDITOR_COOKIE,
  VISUAL_EDITOR_COOKIE_TTL,
} from "@/lib/admin/visual-editor-auth";
import { visualEditorPasswordSchema } from "@/lib/admin/visual-editor-schema";
import { currentAdmin } from "@/lib/admin/auth";
import { contentLengthWithin, hasContentType, isSameOriginRequest, noStoreJson } from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const admin = await currentAdmin();
  if (!admin) return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) return noStoreJson({ error: "Cross-origin request denied" }, { status: 403 });
  if (!hasContentType(req, "application/json") || !contentLengthWithin(req, 1_024)) {
    return noStoreJson({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = visualEditorPasswordSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return noStoreJson({ error: "Invalid request" }, { status: 400 });
  const limit = await checkRateLimit(req, "visual-editor-unlock", {
    limit: 8,
    windowMs: 15 * 60_000,
    blockMs: 30 * 60_000,
    discriminator: admin.id,
  });
  if (!limit.allowed) {
    return noStoreJson(
      { error: "Too many unlock attempts. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const expected = process.env.VISUAL_EDITOR_PASSWORD;
  if (!expected) return noStoreJson({ error: "Visual editor not configured" }, { status: 500 });

  const a = Buffer.from(parsed.data.password);
  const b = Buffer.from(expected);
  const match = a.length === b.length && timingSafeEqual(a, b);
  if (!match) return noStoreJson({ error: "Incorrect password" }, { status: 401 });

  const token = makeVisualEditorToken();
  const res = noStoreJson({ ok: true });
  res.cookies.set(VISUAL_EDITOR_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: VISUAL_EDITOR_COOKIE_TTL,
    path: "/",
  });
  return res;
}

export async function DELETE(req: NextRequest) {
  const admin = await currentAdmin();
  if (!admin) return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) return noStoreJson({ error: "Cross-origin request denied" }, { status: 403 });
  const res = noStoreJson({ ok: true });
  res.cookies.set(VISUAL_EDITOR_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}

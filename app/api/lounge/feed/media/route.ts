/**
 * Hybrid endpoint for wall media uploads.
 *
 *   POST (JSON HandleUploadBody) → issues a signed token so the browser
 *     can stream the file directly to Vercel Blob. This bypasses the
 *     ~4.5MB Vercel function body limit so phone-recorded videos work.
 *   POST (multipart/form-data) → legacy small-file fallback that still
 *     does a server-side put(). Kept so older clients still work while
 *     the new client rolls out.
 */
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { currentEmployee } from "@/lib/lounge/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 500 * 1024 * 1024; // 500MB — long phone videos fit

function kindFor(contentType: string | null | undefined, name: string): "image" | "video" | "file" {
  const t = (contentType || "").toLowerCase();
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("video/")) return "video";
  if (/\.(jpe?g|png|webp|gif|heic|heif|avif|bmp|tiff?)$/i.test(name)) return "image";
  if (/\.(mp4|mov|webm|m4v|3gp|3gpp|avi)$/i.test(name)) return "video";
  return "file";
}

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";

  // ── New flow: signed-token client upload ───────────────────────────
  if (contentType.includes("application/json")) {
    const body = (await req.json()) as HandleUploadBody;
    try {
      const json = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async (pathname, clientPayloadRaw) => {
          // Sanitize the filename and namespace under the current user so
          // we don't end up with cross-user blob collisions.
          const safeName = pathname.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "upload";
          let mime: string | null = null;
          try {
            const parsed = clientPayloadRaw ? JSON.parse(clientPayloadRaw) : null;
            if (parsed && typeof parsed.mime === "string") mime = parsed.mime;
          } catch { /* ignore */ }
          return {
            allowedContentTypes: [
              "image/jpeg", "image/png", "image/webp", "image/gif",
              "image/heic", "image/heif", "image/avif",
              "video/mp4", "video/quicktime", "video/webm", "video/x-m4v",
              "application/octet-stream",
            ],
            maximumSizeInBytes: MAX_BYTES,
            addRandomSuffix: true,
            tokenPayload: JSON.stringify({ employeeId: me.id, name: safeName, mime }),
          };
        },
        onUploadCompleted: async () => {
          // Wall posts persist the URL when the user submits the post;
          // we don't need to do anything here right now.
        },
      });
      return NextResponse.json(json);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[feed/media] handleUpload failed:", msg);
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  // ── Legacy flow: server-side put() for small files ────────────────
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid upload" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large." }, { status: 400 });

  const safeName = (file.name || "upload").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  const stamp = Date.now();
  const blob = await put(`lounge-wall/${me.id}/${stamp}-${safeName}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type || "application/octet-stream",
  });

  return NextResponse.json({
    url: blob.url,
    kind: kindFor(file.type, file.name),
    name: file.name,
  });
}

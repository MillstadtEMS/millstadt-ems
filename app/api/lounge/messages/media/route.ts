/**
 * Signed-token client uploads for messenger attachments. Mirrors the
 * Wall's /api/lounge/feed/media flow — the client streams the file
 * directly to Vercel Blob so phone-recorded videos / high-res photos /
 * voice notes don't hit the 4.5MB serverless function body cap.
 */
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { currentEmployee } from "@/lib/lounge/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 500 * 1024 * 1024; // 500MB — long videos OK
const ALLOWED_CONTENT_TYPES = [
  "image/*",
  "video/*",
  "audio/*",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/octet-stream",
];

function kindFor(contentType: string | null | undefined, name: string): "image" | "video" | "audio" | "file" {
  const t = (contentType || "").toLowerCase();
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("video/")) return "video";
  if (t.startsWith("audio/")) return "audio";
  if (/\.(jpe?g|png|webp|gif|heic|heif|avif|bmp|tiff?)$/i.test(name)) return "image";
  if (/\.(mp4|mov|webm|m4v|3gp|3gpp|avi)$/i.test(name)) return "video";
  if (/\.(m4a|mp3|wav|ogg|webm|aac)$/i.test(name)) return "audio";
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
          const safeName = pathname.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "upload";
          let mime: string | null = null;
          try {
            const parsed = clientPayloadRaw ? JSON.parse(clientPayloadRaw) : null;
            if (parsed && typeof parsed.mime === "string") mime = parsed.mime;
          } catch { /* ignore */ }
          // Wildcards so MediaRecorder mimes like "audio/webm;codecs=opus",
          // iPhone "video/quicktime", and HEIC photos all pass without an
          // exact-string match. The maximum size still caps abuse.
          return {
            allowedContentTypes: ALLOWED_CONTENT_TYPES,
            maximumSizeInBytes: MAX_BYTES,
            addRandomSuffix: true,
            tokenPayload: JSON.stringify({ employeeId: me.id, name: safeName, mime }),
          };
        },
        onUploadCompleted: async () => { /* persisted when message is sent */ },
      });
      return NextResponse.json(json);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[messages/media] handleUpload failed:", msg);
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  // ── Legacy multipart fallback for tiny files ──────────────────────
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large." }, { status: 400 });
  const safeName = (file.name || "upload").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const stamp = Date.now();
  const blob = await put(`lounge-messages/${me.id}/${stamp}-${safeName}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type || "application/octet-stream",
  });
  return NextResponse.json({
    url: blob.url,
    kind: kindFor(file.type, file.name),
    name: file.name,
    mime: file.type || undefined,
  });
}

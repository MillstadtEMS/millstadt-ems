import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { currentEmployee } from "@/lib/lounge/auth";
import { privateBlobReference, privateIncidentBlobUrl } from "@/lib/lounge/private-blobs";
import { recordSecurityAudit } from "@/lib/security/audit";
import { contentLengthWithin, isSameOriginRequest, noStoreJson } from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) return noStoreJson({ error: "Invalid request" }, { status: 403 });
  if (!contentLengthWithin(req, 10 * 1024 * 1024)) {
    return noStoreJson({ error: "Photo too large (max 10MB)" }, { status: 413 });
  }
  const limit = await checkRateLimit(req, "incident-photo", {
    limit: 12,
    windowMs: 60 * 60_000,
    discriminator: me.id,
  });
  if (!limit.allowed) {
    const response = noStoreJson({ error: "Too many uploads. Please wait and try again." }, { status: 429 });
    response.headers.set("Retry-After", String(limit.retryAfterSeconds));
    return response;
  }

  const form = await req.formData().catch(() => null);
  if (!form) return noStoreJson({ error: "Invalid upload" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return noStoreJson({ error: "No file" }, { status: 400 });
  if (!new Set(["image/jpeg", "image/png"]).has(file.type)) {
    return noStoreJson({ error: "JPEG or PNG images only" }, { status: 400 });
  }
  if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
    return noStoreJson({ error: "Photo too large (max 10MB)" }, { status: 400 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if ((file.type === "image/jpeg" && !isJpeg) || (file.type === "image/png" && !isPng)) {
    return noStoreJson({ error: "Image content does not match its file type" }, { status: 400 });
  }

  const safe = (file.name || "photo.jpg").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const blob = await put(`lounge/incidents/${me.id}/${Date.now()}-${safe}`, Buffer.from(bytes), {
    access: "private",
    addRandomSuffix: true,
    contentType: file.type,
  });

  await recordSecurityAudit({
    actorType: "employee",
    actorId: me.id,
    action: "incident_photo_upload",
    resourceType: "incident_blob",
    resourceId: blob.pathname,
    outcome: "completed",
    req,
    detail: { bytes: file.size, contentType: file.type },
  });
  const reference = privateBlobReference(blob.pathname);
  return noStoreJson({ url: privateIncidentBlobUrl(reference), name: safe });
}

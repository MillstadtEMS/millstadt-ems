/**
 * POST /api/admin/senior-center
 * Client-upload token endpoint for Vercel Blob.
 *
 * Files go DIRECTLY from the browser to Blob storage (no 4.5 MB serverless
 * body limit), so large newsletter PDFs upload fine. This route only mints a
 * short-lived upload token after verifying the admin session and the target
 * path — it never receives the file bytes itself.
 *
 * Pathname convention (unchanged, so GET /api/senior-center/docs still finds it):
 *   senior-center/<year>/<month>_<type>.pdf
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin/auth";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export const runtime = "nodejs";

const PATH_RE = /^senior-center\/\d{4}\/[a-z]+_(menu|activities|newsletter)\.pdf$/;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async (pathname) => {
        // Only authenticated admins may obtain an upload token.
        if (!(await isAdminAuthed())) {
          throw new Error("Unauthorized");
        }
        // Lock uploads to the senior-center namespace and PDF naming.
        if (!PATH_RE.test(pathname)) {
          throw new Error("Invalid upload path");
        }
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: 50 * 1024 * 1024, // 50 MB ceiling
          addRandomSuffix: false,               // keep the exact filename
          allowOverwrite: true,                 // replacing a month's file is expected
        };
      },
      // Fires server-side when the browser finishes uploading. The docs route
      // lists blobs live, so nothing to persist here. (Does not fire on
      // localhost — Vercel can't call back to a local dev server.)
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 400 });
  }
}

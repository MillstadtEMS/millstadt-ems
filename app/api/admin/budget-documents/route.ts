/**
 * Draft budget documents use immutable private Blob objects. The API exposes
 * only authenticated application URLs; legacy public objects remain a
 * server-side migration fallback until owner-approved cleanup.
 */
import { createHash, randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { decideDraftBudgetDocumentAccess } from "@/lib/board/document-access";
import {
  DRAFT_BUDGET_FILE_API_PATH,
  privateDraftBudgetPath,
  recordCurrentBoardDocuments,
  resolveCurrentDraftBudgetSource,
} from "@/lib/board/document-storage";
import { currentEmployee } from "@/lib/lounge/auth";
import { contentLengthWithin, isSameOriginRequest, noStoreJson } from "@/lib/security/http";
import { inspectUploadedFile } from "@/lib/security/upload-inspection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_DRAFT_BUDGET_BYTES = 25 * 1024 * 1024;
const PDF_MIME = "application/pdf";

async function authorizeDraftBudgetRequest() {
  const employee = await currentEmployee();
  return { employee, decision: decideDraftBudgetDocumentAccess(employee) };
}

export async function POST(req: NextRequest) {
  const { employee, decision } = await authorizeDraftBudgetRequest();
  if (!decision.allowed) {
    return noStoreJson(
      { error: decision.status === 401 ? "Unauthorized" : "Draft budget access is not permitted." },
      { status: decision.status },
    );
  }
  if (!isSameOriginRequest(req)) {
    return noStoreJson({ error: "Cross-origin request denied." }, { status: 403 });
  }
  if (!contentLengthWithin(req, MAX_DRAFT_BUDGET_BYTES + 1024 * 1024)) {
    return noStoreJson({ error: "The PDF is too large. Keep it under 25 MB." }, { status: 413 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return noStoreJson({ error: "Missing file" }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_DRAFT_BUDGET_BYTES) {
    return noStoreJson({ error: "The PDF is too large. Keep it under 25 MB." }, { status: 400 });
  }
  const inspected = await inspectUploadedFile(file, [PDF_MIME]);
  if (!inspected.ok) {
    return noStoreJson({ error: "Only valid PDF files are accepted" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const generationId = randomUUID();
  const blob = await put(privateDraftBudgetPath(generationId), buffer, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType: PDF_MIME,
  });

  await recordCurrentBoardDocuments([{
    documentKey: "draft_budget",
    generationId,
    blobPathname: blob.pathname,
    sourceName: file.name,
    contentType: PDF_MIME,
    size: file.size,
    etag: blob.etag,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  }], {
    id: employee?.id,
    name: employee ? `${employee.firstName} ${employee.lastName}` : null,
  });

  return noStoreJson({ ok: true, url: DRAFT_BUDGET_FILE_API_PATH });
}

export async function GET() {
  const { decision } = await authorizeDraftBudgetRequest();
  if (!decision.allowed) {
    return noStoreJson(
      { error: decision.status === 401 ? "Unauthorized" : "Draft budget access is not permitted." },
      { status: decision.status },
    );
  }

  const document = await resolveCurrentDraftBudgetSource();
  if (!document) return noStoreJson({ url: null });

  return noStoreJson({
    url: DRAFT_BUDGET_FILE_API_PATH,
    name: document.sourceName,
    size: document.size,
    uploadedAt: document.uploadedAt,
  });
}

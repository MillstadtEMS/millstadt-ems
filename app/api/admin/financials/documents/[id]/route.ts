import { NextRequest } from "next/server";

import {
  handleFinancialsError,
  noStoreJson,
  requireFinancialsAdmin,
} from "@/lib/financials-hub/api-helpers";
import {
  archiveManagedDocument,
  DocumentLibraryError,
  restoreManagedDocument,
} from "@/lib/financials-hub/document-library";
import {
  auditContextFromHeaders,
  recordDocumentLibraryEvent,
} from "@/lib/financials-hub/dev-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireFinancialsAdmin(req.headers, req.method);
  if ("response" in admin) return admin.response;

  try {
    const body = (await req.json()) as { archived?: unknown };
    if (
      !body ||
      typeof body !== "object" ||
      Object.keys(body).some((key) => key !== "archived") ||
      typeof body.archived !== "boolean"
    ) {
      throw new DocumentLibraryError("Choose whether to archive or restore the document.");
    }

    const { id } = await ctx.params;
    const document = body.archived
      ? archiveManagedDocument(id)
      : restoreManagedDocument(id);
    recordDocumentLibraryEvent(
      {
        eventType: body.archived ? "document_archived" : "document_restored",
        documentId: document.id,
        documentVersion: document.version,
        documentHash: document.originalHash,
        reason: body.archived
          ? "Administrator removed the document from active catalogs."
          : "Administrator restored the document to its catalog.",
      },
      auditContextFromHeaders(req.headers),
    );
    return noStoreJson({ document });
  } catch (error) {
    if (error instanceof DocumentLibraryError) {
      return noStoreJson({ error: error.message }, { status: error.status });
    }
    return handleFinancialsError(error);
  }
}

import { NextRequest } from "next/server";

import {
  handleFinancialsError,
  noStoreJson,
  requireFinancialsAdmin,
} from "@/lib/financials-hub/api-helpers";
import {
  createManagedDocument,
  DOCUMENT_UPLOAD_MAX_BYTES,
  DocumentLibraryError,
  managedDocumentCatalog,
} from "@/lib/financials-hub/document-library";
import {
  auditContextFromHeaders,
  recordDocumentLibraryEvent,
} from "@/lib/financials-hub/dev-store";
import { inspectUploadedPdf } from "@/lib/financials-hub/pdf-upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_FIELDS = new Set([
  "access",
  "title",
  "category",
  "reportingPeriod",
  "taxYear",
  "filingYear",
  "version",
  "publicationDate",
  "file",
]);

export async function GET(req: NextRequest) {
  const admin = await requireFinancialsAdmin(req.headers);
  if ("response" in admin) return admin.response;
  return noStoreJson({ documents: managedDocumentCatalog({ includeArchived: true }) });
}

export async function POST(req: NextRequest) {
  const admin = await requireFinancialsAdmin(req.headers, req.method);
  if ("response" in admin) return admin.response;

  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > DOCUMENT_UPLOAD_MAX_BYTES + 1_000_000) {
    return noStoreJson({ error: "The upload is too large." }, { status: 413 });
  }
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
    return noStoreJson({ error: "Upload a PDF using multipart form data." }, { status: 415 });
  }

  try {
    const formData = await req.formData();
    const unexpected = Array.from(formData.keys()).filter((key) => !ALLOWED_FIELDS.has(key));
    if (unexpected.length) {
      throw new DocumentLibraryError("The upload contained unexpected fields.");
    }

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new DocumentLibraryError("Choose a PDF to upload.");
    }
    if (!file.name.toLowerCase().endsWith(".pdf") || file.type !== "application/pdf") {
      throw new DocumentLibraryError("Only PDF files are accepted.");
    }
    if (file.size > DOCUMENT_UPLOAD_MAX_BYTES) {
      throw new DocumentLibraryError("The PDF must be 20 MB or smaller.", 413);
    }

    const pdf = Buffer.from(await file.arrayBuffer());
    const inspection = await inspectUploadedPdf(pdf);
    const document = createManagedDocument({
      access: formData.get("access"),
      title: formData.get("title"),
      category: formData.get("category"),
      reportingPeriod: formData.get("reportingPeriod"),
      taxYear: formData.get("taxYear"),
      filingYear: formData.get("filingYear"),
      version: formData.get("version"),
      publicationDate: formData.get("publicationDate"),
      originalFilename: file.name,
      pdf,
      pages: inspection.pages,
    });

    recordDocumentLibraryEvent(
      {
        eventType: "document_uploaded",
        documentId: document.id,
        documentVersion: document.version,
        documentHash: document.originalHash,
        reason:
          document.access === "public_form_990"
            ? "Administrator published a public Form 990 PDF."
            : "Administrator published an approval-required PDF.",
      },
      auditContextFromHeaders(req.headers),
    );
    return noStoreJson({ document }, { status: 201 });
  } catch (error) {
    if (error instanceof DocumentLibraryError) {
      return noStoreJson({ error: error.message }, { status: error.status });
    }
    return handleFinancialsError(error);
  }
}

import { NextRequest } from "next/server";
import { decideDraftBudgetDocumentAccess } from "@/lib/board/document-access";
import { createPrivateDocumentResponse } from "@/lib/board/document-http";
import {
  openStoredBoardDocument,
  resolveCurrentDraftBudgetSource,
  resolveLegacyDraftBudgetSource,
} from "@/lib/board/document-storage";
import { currentEmployee } from "@/lib/lounge/auth";
import { noStoreJson } from "@/lib/security/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const employee = await currentEmployee();
  const decision = decideDraftBudgetDocumentAccess(employee);
  if (!decision.allowed) {
    return noStoreJson(
      { error: decision.status === 401 ? "Unauthorized" : "Draft budget access is not permitted." },
      { status: decision.status },
    );
  }

  let source = await resolveCurrentDraftBudgetSource();
  let opened = source ? await openStoredBoardDocument(source) : null;
  if (!opened && source?.storage === "private") {
    source = await resolveLegacyDraftBudgetSource();
    opened = source ? await openStoredBoardDocument(source) : null;
  }
  if (!source || !opened) {
    return noStoreJson({ error: "Draft budget document not found." }, { status: 404 });
  }

  return createPrivateDocumentResponse(opened, req.headers.get("range"), {
    filename: source.sourceName.toLowerCase().endsWith(".pdf")
      ? source.sourceName
      : `${source.sourceName}.pdf`,
    disposition: "inline",
  });
}

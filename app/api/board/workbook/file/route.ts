import { NextRequest } from "next/server";
import { currentBoardUser } from "@/lib/board/auth";
import { decideBoardWorkbookSourceAccess } from "@/lib/board/document-access";
import { createPrivateDocumentResponse } from "@/lib/board/document-http";
import {
  openStoredBoardDocument,
  resolveCurrentBoardWorkbookSource,
  resolveLegacyBoardWorkbookSource,
} from "@/lib/board/document-storage";
import { audit } from "@/lib/board/db";
import { noStoreJson, requestIp } from "@/lib/security/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await currentBoardUser();
  const decision = decideBoardWorkbookSourceAccess(user);
  if (!decision.allowed) {
    await audit({
      userId: user?.id,
      username: user?.username,
      role: user?.role,
      action: "board_workbook_source_read_denied",
      ip: requestIp(req),
    });
    return noStoreJson(
      { error: decision.status === 401 ? "Unauthorized" : "Workbook source access is not permitted." },
      { status: decision.status },
    );
  }

  let source = await resolveCurrentBoardWorkbookSource();
  let opened = source ? await openStoredBoardDocument(source) : null;
  if (!opened && source?.storage === "private") {
    source = await resolveLegacyBoardWorkbookSource();
    opened = source ? await openStoredBoardDocument(source) : null;
  }
  if (!source || !opened) {
    return noStoreJson({ error: "Workbook source not found." }, { status: 404 });
  }

  await audit({
    userId: user?.id,
    username: user?.username,
    role: user?.role,
    action: "board_workbook_source_read",
    detail: source.storage === "private" ? "private manifest object" : "legacy migration fallback",
    ip: requestIp(req),
  });

  return createPrivateDocumentResponse(opened, req.headers.get("range"), {
    filename: source.sourceName.toLowerCase().endsWith(".xlsx")
      ? source.sourceName
      : `${source.sourceName}.xlsx`,
    disposition: "attachment",
  });
}

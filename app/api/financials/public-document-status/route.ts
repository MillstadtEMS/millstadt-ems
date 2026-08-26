import { stat } from "node:fs/promises";
import path from "node:path";
import { publicFinancialDocumentLibrary } from "@/lib/financials-hub/public-library";
import { PUBLIC_PAGE_URL } from "@/lib/financials-hub/transparency-content";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  const document = publicFinancialDocumentLibrary().find(record=>record.id===id);
  if (!document) return Response.json({available:false},{status:404});
  try {
    const localDocument = document.downloadUrl.startsWith("/");
    if (localDocument && process.env.NODE_ENV !== "production") {
      const file=await stat(path.join(process.cwd(),"public",document.downloadUrl));
      return Response.json({available:file.isFile() && file.size>0},{headers:{"Cache-Control":"no-store"}});
    }
    // Public assets are served by the CDN, not necessarily packaged in the server function.
    // Both the production origin and document paths are code-owned; never fetch user URLs.
    const source = localDocument ? new URL(document.downloadUrl, PUBLIC_PAGE_URL).href : document.downloadUrl;
    const response=await fetch(source,{method:"HEAD",signal:AbortSignal.timeout(5000),redirect:"follow"});
    return Response.json({available:response.ok && Boolean(response.headers.get("content-type")?.includes("pdf"))},{headers:{"Cache-Control":"no-store"}});
  } catch { return Response.json({available:false},{status:503}); }
}

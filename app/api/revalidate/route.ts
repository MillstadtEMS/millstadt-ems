import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { contentLengthWithin, hasContentType, noStoreJson, readBoundedJson } from "@/lib/security/http";
import { hasValidBearerSecret, selectRevalidationPaths } from "@/lib/security/operational";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4 * 1024;

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret?.trim()) {
    return noStoreJson({ error: "Revalidation authentication is not configured." }, { status: 503 });
  }
  if (!hasValidBearerSecret(req.headers.get("authorization"), secret)) {
    return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  }

  let input: unknown = undefined;
  if (req.body) {
    if (!hasContentType(req, "application/json")) {
      return noStoreJson({ error: "Revalidation requests must use JSON." }, { status: 415 });
    }
    if (!contentLengthWithin(req, MAX_BODY_BYTES)) {
      return noStoreJson({ error: "Revalidation request is too large." }, { status: 413 });
    }
    const parsed = await readBoundedJson(req, MAX_BODY_BYTES);
    if (!parsed.ok) {
      return noStoreJson(
        { error: parsed.reason === "too_large" ? "Revalidation request is too large." : "Invalid revalidation request." },
        { status: parsed.reason === "too_large" ? 413 : 400 },
      );
    }
    input = parsed.value;
  }

  const selection = selectRevalidationPaths(input);
  if (!selection.ok) return noStoreJson({ error: selection.error }, { status: 400 });

  for (const path of selection.paths) {
    revalidatePath(path);
  }
  return noStoreJson({ ok: true, revalidated: selection.paths });
}

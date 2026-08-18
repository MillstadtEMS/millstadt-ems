import { NextRequest } from "next/server";
import { isInventoryAuthedFromRequest } from "@/lib/inventory/auth";
import { getItem, updateItem } from "@/lib/inventory/db";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  contentLengthWithin,
  hasContentType,
  isSameOriginRequest,
  noStoreJson,
} from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  inventoryActor,
  inventoryIdempotencyKey,
  isInventoryItemId,
  parseInventoryCountUpdate,
} from "@/lib/inventory/mutation-security";
import {
  abandonInventoryMutation,
  claimInventoryMutation,
  completeInventoryMutation,
  inventoryRequestHash,
} from "@/lib/inventory/idempotency";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isInventoryAuthedFromRequest(req))) {
    return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!isInventoryItemId(id)) return noStoreJson({ error: "Not found" }, { status: 404 });
  const item = await getItem(id);
  if (!item) return noStoreJson({ error: "Not found" }, { status: 404 });
  return noStoreJson(item);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const employee = await currentEmployee();
  if (!employee?.isActive) {
    return noStoreJson({ error: "Sign in with an active employee account" }, { status: 401 });
  }
  if (!isSameOriginRequest(req)) {
    return noStoreJson({ error: "Cross-origin request denied" }, { status: 403 });
  }
  if (!hasContentType(req, "application/json")) {
    return noStoreJson({ error: "JSON body required" }, { status: 415 });
  }
  if (!contentLengthWithin(req, 4_096)) {
    return noStoreJson({ error: "Request body is too large" }, { status: 413 });
  }

  const { id } = await params;
  if (!isInventoryItemId(id)) return noStoreJson({ error: "Item not found" }, { status: 404 });
  const key = inventoryIdempotencyKey(req.headers.get("idempotency-key"));
  if (!key) {
    return noStoreJson({ error: "A valid Idempotency-Key header is required" }, { status: 400 });
  }
  const limit = await checkRateLimit(req, "inventory-item-mutation", {
    limit: 120,
    windowMs: 60_000,
    discriminator: employee.id,
  });
  if (!limit.allowed) {
    return noStoreJson(
      { error: "Too many inventory updates. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const parsed = parseInventoryCountUpdate(await req.json().catch(() => null));
  if (!parsed.ok) return noStoreJson({ error: parsed.error }, { status: 400 });
  const scope = `item-count:${id}`;
  const requestHash = inventoryRequestHash({ itemId: id, update: parsed.value });
  const claim = await claimInventoryMutation({
    actorId: employee.id,
    scope,
    key,
    requestHash,
  });
  if (claim.outcome === "conflict") {
    return noStoreJson({ error: "Idempotency key was already used for another request" }, { status: 409 });
  }
  if (claim.outcome === "in-progress") {
    return noStoreJson({ error: "This inventory update is still processing" }, { status: 409 });
  }
  if (claim.outcome === "replay") {
    return noStoreJson(claim.response.body, {
      status: claim.response.status,
      headers: { "Idempotent-Replay": "true" },
    });
  }

  try {
    const { version, ...updates } = parsed.value;
    const result = await updateItem(id, version, updates, inventoryActor(employee));
    if (result.conflict) {
      const body = { error: "Item was updated by another user", item: result.item };
      await completeInventoryMutation({ actorId: employee.id, scope, key, status: 409, body });
      return noStoreJson(body, { status: 409 });
    }
    if (!result.success || !result.item) {
      const body = { error: "Item not found" };
      await completeInventoryMutation({ actorId: employee.id, scope, key, status: 404, body });
      return noStoreJson(body, { status: 404 });
    }
    await completeInventoryMutation({ actorId: employee.id, scope, key, status: 200, body: result.item });
    return noStoreJson(result.item);
  } catch (error) {
    await abandonInventoryMutation({ actorId: employee.id, scope, key });
    console.error("Inventory item update failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return noStoreJson({ error: "Inventory update failed" }, { status: 500 });
  }
}

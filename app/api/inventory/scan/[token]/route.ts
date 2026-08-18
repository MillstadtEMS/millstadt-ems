import { NextRequest } from "next/server";
import { getItemByQrToken, updateItem } from "@/lib/inventory/db";
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
  isInventoryQrToken,
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
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!isInventoryQrToken(token)) {
    return noStoreJson({ error: "Invalid or expired QR code" }, { status: 404 });
  }
  const item = await getItemByQrToken(token);
  if (!item) {
    return noStoreJson({ error: "Invalid or expired QR code" }, { status: 404 });
  }

  const employee = await currentEmployee();
  if (!employee?.isActive) {
    return noStoreJson({
      id: item.id,
      name: item.name,
      categoryName: item.categoryName,
      requiresAuthentication: true,
    });
  }

  return noStoreJson({
    id: item.id,
    name: item.name,
    location: item.location,
    categoryName: item.categoryName,
    par: item.par,
    currentStock: item.currentStock,
    expiredQty: item.expiredQty,
    qtyToOrder: item.qtyToOrder,
    version: item.version,
    updatedAt: item.updatedAt,
    requiresAuthentication: false,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
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

  const { token } = await params;
  if (!isInventoryQrToken(token)) {
    return noStoreJson({ error: "Invalid or expired QR code" }, { status: 404 });
  }
  const key = inventoryIdempotencyKey(req.headers.get("idempotency-key"));
  if (!key) {
    return noStoreJson({ error: "A valid Idempotency-Key header is required" }, { status: 400 });
  }
  const limit = await checkRateLimit(req, "inventory-qr-mutation", {
    limit: 90,
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
  const item = await getItemByQrToken(token);
  if (!item) {
    return noStoreJson({ error: "Invalid or expired QR code" }, { status: 404 });
  }

  const scope = `qr-count:${item.id}`;
  const requestHash = inventoryRequestHash({ itemId: item.id, update: parsed.value });
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
    const result = await updateItem(
      item.id,
      version,
      updates,
      inventoryActor(employee),
    );
    if (result.conflict) {
      const body = { error: "Item was updated by someone else", item: result.item };
      await completeInventoryMutation({ actorId: employee.id, scope, key, status: 409, body });
      return noStoreJson(body, { status: 409 });
    }
    if (!result.success || !result.item) {
      const body = { error: "Item not found" };
      await completeInventoryMutation({ actorId: employee.id, scope, key, status: 404, body });
      return noStoreJson(body, { status: 404 });
    }
    const body = { ok: true, item: result.item };
    await completeInventoryMutation({ actorId: employee.id, scope, key, status: 200, body });
    return noStoreJson(body);
  } catch (error) {
    await abandonInventoryMutation({ actorId: employee.id, scope, key });
    console.error("Inventory QR update failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return noStoreJson({ error: "Inventory update failed" }, { status: 500 });
  }
}

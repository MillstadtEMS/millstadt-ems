import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { createSubmission, getItems } from "@/lib/inventory/db";
import { sendInventoryEmail, sendInventoryOrderEmail } from "@/lib/inventory/email";
import { currentEmployee } from "@/lib/lounge/auth";
import { sql } from "@/lib/lounge/db";
import {
  contentLengthWithin,
  hasContentType,
  isSameOriginRequest,
  noStoreJson,
} from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { inventoryIdempotencyKey } from "@/lib/inventory/mutation-security";
import {
  abandonInventoryMutation,
  claimInventoryMutation,
  completeInventoryMutation,
  inventoryRequestHash,
} from "@/lib/inventory/idempotency";

export const runtime = "nodejs";

type SubmissionBody = {
  categorySlug?: string;
  itemsUpdated: number;
  notes?: string;
  signature?: string;
  purpose: "inventory_backstock" | "inventory_state" | "qr-batch";
};

function parseSubmission(value: unknown): SubmissionBody | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const allowed = new Set(["categorySlug", "itemsUpdated", "notes", "signature", "purpose"]);
  if (Object.keys(body).some((key) => !allowed.has(key))) return null;
  if (!Number.isInteger(body.itemsUpdated) || Number(body.itemsUpdated) < 0 || Number(body.itemsUpdated) > 500) {
    return null;
  }
  if (
    body.categorySlug !== undefined &&
    (typeof body.categorySlug !== "string" || !/^[a-z0-9_-]{1,80}$/i.test(body.categorySlug))
  ) {
    return null;
  }
  if (
    body.notes !== undefined &&
    (typeof body.notes !== "string" || body.notes.length > 1_000 || body.notes.includes("\0"))
  ) {
    return null;
  }
  if (
    body.purpose !== "inventory_backstock" &&
    body.purpose !== "inventory_state" &&
    body.purpose !== "qr-batch"
  ) {
    return null;
  }
  if (
    body.signature !== undefined &&
    (typeof body.signature !== "string" ||
      body.signature.length > 1_250_000 ||
      !/^data:image\/(?:png|jpeg);base64,/i.test(body.signature))
  ) {
    return null;
  }
  if (body.purpose !== "qr-batch" && typeof body.signature !== "string") return null;
  return {
    itemsUpdated: Number(body.itemsUpdated),
    purpose: body.purpose,
    ...(body.categorySlug !== undefined ? { categorySlug: body.categorySlug } : {}),
    ...(body.notes !== undefined ? { notes: body.notes.trim() } : {}),
    ...(body.signature !== undefined ? { signature: body.signature } : {}),
  };
}

export async function POST(req: NextRequest) {
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
  if (!contentLengthWithin(req, 1_500_000)) {
    return noStoreJson({ error: "Request body is too large" }, { status: 413 });
  }
  const key = inventoryIdempotencyKey(req.headers.get("idempotency-key"));
  if (!key) {
    return noStoreJson({ error: "A valid Idempotency-Key header is required" }, { status: 400 });
  }
  const limit = await checkRateLimit(req, "inventory-submission", {
    limit: 12,
    windowMs: 15 * 60_000,
    discriminator: employee.id,
  });
  if (!limit.allowed) {
    return noStoreJson(
      { error: "Too many inventory submissions. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body = parseSubmission(await req.json().catch(() => null));
  if (!body) return noStoreJson({ error: "Invalid inventory submission" }, { status: 400 });
  const scope = `inventory-submission:${body.purpose}`;
  const claim = await claimInventoryMutation({
    actorId: employee.id,
    scope,
    key,
    requestHash: inventoryRequestHash(body),
  });
  if (claim.outcome === "conflict") {
    return noStoreJson({ error: "Idempotency key was already used for another request" }, { status: 409 });
  }
  if (claim.outcome === "in-progress") {
    return noStoreJson({ error: "This inventory submission is still processing" }, { status: 409 });
  }
  if (claim.outcome === "replay") {
    return noStoreJson(claim.response.body, {
      status: claim.response.status,
      headers: { "Idempotent-Replay": "true" },
    });
  }

  try {
    const submittedBy = `${employee.firstName} ${employee.lastName}`.trim() || employee.username;
    const submission = await createSubmission({
      submittedBy,
      categorySlug: body.categorySlug,
      itemsUpdated: body.itemsUpdated,
      notes: body.notes,
    });

    if (body.signature) {
      try {
        const db = sql();
        await db`
          INSERT INTO lounge_signatures
            (id, employee_id, purpose, reference_id, image_data_url)
          VALUES
            (${randomUUID()}, ${employee.id}, ${body.purpose},
             ${String(submission.id)}, ${body.signature})
        `;
      } catch (signatureError) {
        console.error("Inventory signature persist failed", {
          name: signatureError instanceof Error ? signatureError.name : "UnknownError",
        });
      }
    }

    try {
      await sendInventoryEmail({
        type: "inventory_submission",
        submissionId: submission.id,
        categorySlug: body.categorySlug,
        itemsUpdated: body.itemsUpdated,
        notes: body.notes,
        submittedBy,
      });
    } catch (emailError) {
      console.error("Inventory summary email failed", {
        name: emailError instanceof Error ? emailError.name : "UnknownError",
      });
    }

    if (body.purpose !== "qr-batch") {
      try {
        const allBackstock = await getItems(undefined, "backstock");
        await sendInventoryOrderEmail(allBackstock, {
          submittedBy,
          submittedDate: new Date(),
        });
      } catch (orderError) {
        console.error("Inventory order email failed", {
          name: orderError instanceof Error ? orderError.name : "UnknownError",
        });
      }
    }

    const responseBody = { ok: true, submission };
    await completeInventoryMutation({
      actorId: employee.id,
      scope,
      key,
      status: 200,
      body: responseBody,
    });
    return noStoreJson(responseBody);
  } catch (error) {
    await abandonInventoryMutation({ actorId: employee.id, scope, key });
    console.error("Inventory submission failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return noStoreJson({ error: "Inventory submission failed" }, { status: 500 });
  }
}

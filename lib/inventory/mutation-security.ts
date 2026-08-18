import type { LoungeEmployee } from "@/lib/lounge/auth";

export const MAX_INVENTORY_QUANTITY = 100_000;
export const MAX_INVENTORY_NOTE_LENGTH = 500;

export type InventoryCountUpdate = {
  version: number;
  currentStock?: number;
  expiredQty?: number;
  notes?: string;
};

type ParseResult =
  | { ok: true; value: InventoryCountUpdate }
  | { ok: false; error: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isBoundedQuantity(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= MAX_INVENTORY_QUANTITY;
}

export function parseInventoryCountUpdate(value: unknown): ParseResult {
  if (!isPlainObject(value)) return { ok: false, error: "Invalid JSON body" };
  const allowed = new Set(["version", "currentStock", "expiredQty", "notes"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    return { ok: false, error: "Unsupported inventory field" };
  }
  if (!Number.isInteger(value.version) || Number(value.version) < 1) {
    return { ok: false, error: "A valid item version is required" };
  }

  const hasStock = value.currentStock !== undefined;
  const hasExpired = value.expiredQty !== undefined;
  const hasNotes = value.notes !== undefined;
  if (!hasStock && !hasExpired && !hasNotes) {
    return { ok: false, error: "No inventory changes were provided" };
  }
  if (hasStock && !isBoundedQuantity(value.currentStock)) {
    return { ok: false, error: `Current stock must be a whole number from 0 to ${MAX_INVENTORY_QUANTITY}` };
  }
  if (hasExpired && !isBoundedQuantity(value.expiredQty)) {
    return { ok: false, error: `Expired quantity must be a whole number from 0 to ${MAX_INVENTORY_QUANTITY}` };
  }
  if (
    hasNotes &&
    (typeof value.notes !== "string" ||
      value.notes.length > MAX_INVENTORY_NOTE_LENGTH ||
      value.notes.includes("\0"))
  ) {
    return { ok: false, error: `Notes must be ${MAX_INVENTORY_NOTE_LENGTH} characters or fewer` };
  }

  return {
    ok: true,
    value: {
      version: Number(value.version),
      ...(hasStock ? { currentStock: Number(value.currentStock) } : {}),
      ...(hasExpired ? { expiredQty: Number(value.expiredQty) } : {}),
      ...(hasNotes ? { notes: String(value.notes).trim() } : {}),
    },
  };
}

export function isInventoryItemId(value: string) {
  return /^[a-z0-9_-]{6,80}$/i.test(value);
}

export function isInventoryQrToken(value: string) {
  return /^[a-z0-9_-]{32,128}$/i.test(value);
}

export function inventoryIdempotencyKey(value: string | null) {
  const key = value?.trim() ?? "";
  return /^[a-z0-9._:-]{16,128}$/i.test(key) ? key : null;
}

export function inventoryActor(employee: LoungeEmployee) {
  return `employee:${employee.id}:${employee.username}`;
}

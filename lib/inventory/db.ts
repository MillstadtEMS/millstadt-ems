/**
 * Inventory database — Neon Postgres.
 * Tables: inventory_categories, inventory_items, inventory_qr_tokens,
 *         inventory_audit_log, inventory_submissions, inventory_reports
 */

import { neon } from "@neondatabase/serverless";

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  return neon(url);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ── Schema ─────────────────────────────────────────────────────────────────

export async function ensureInventorySchema() {
  const db = sql();

  await db`
    CREATE TABLE IF NOT EXISTS inventory_categories (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL UNIQUE,
      slug        TEXT NOT NULL UNIQUE,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      has_expiry  BOOLEAN NOT NULL DEFAULT FALSE,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id            TEXT PRIMARY KEY,
      category_id   TEXT NOT NULL REFERENCES inventory_categories(id),
      name          TEXT NOT NULL,
      location      TEXT,
      par           INTEGER NOT NULL DEFAULT 0,
      current_stock INTEGER NOT NULL DEFAULT 0,
      prior_stock   INTEGER,
      expired_qty   INTEGER NOT NULL DEFAULT 0,
      vendor_source TEXT,
      notes         TEXT,
      skip_order    BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order    INTEGER NOT NULL DEFAULT 0,
      version       INTEGER NOT NULL DEFAULT 1,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS inventory_qr_tokens (
      id          TEXT PRIMARY KEY,
      token       TEXT NOT NULL UNIQUE,
      item_id     TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
      label       TEXT,
      active      BOOLEAN NOT NULL DEFAULT TRUE,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS inventory_audit_log (
      id            TEXT PRIMARY KEY,
      item_id       TEXT NOT NULL,
      field_changed TEXT NOT NULL,
      old_value     TEXT,
      new_value     TEXT,
      changed_by    TEXT NOT NULL DEFAULT 'inventory',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS inventory_submissions (
      id            TEXT PRIMARY KEY,
      submitted_by  TEXT NOT NULL DEFAULT 'inventory',
      category_slug TEXT,
      items_updated INTEGER NOT NULL DEFAULT 0,
      notes         TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS inventory_reports (
      id           TEXT PRIMARY KEY,
      report_type  TEXT NOT NULL,
      filename     TEXT NOT NULL,
      blob_url     TEXT NOT NULL,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface InventoryCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  hasExpiry: boolean;
}

export interface InventoryItem {
  id: string;
  categoryId: string;
  categoryName?: string;
  categorySlug?: string;
  name: string;
  location: string | null;
  par: number;
  currentStock: number;
  priorStock: number | null;
  expiredQty: number;
  qtyToOrder: number;
  delta: number | null;
  vendorSource: string | null;
  notes: string | null;
  skipOrder: boolean;
  sortOrder: number;
  version: number;
  updatedAt: string;
}

export interface AuditEntry {
  id: string;
  itemId: string;
  itemName?: string;
  categoryName?: string;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string;
  createdAt: string;
}

export interface InventorySubmission {
  id: string;
  submittedBy: string;
  categorySlug: string | null;
  itemsUpdated: number;
  notes: string | null;
  createdAt: string;
}

export interface InventoryReport {
  id: string;
  reportType: string;
  filename: string;
  blobUrl: string;
  createdAt: string;
}

// ── Row mappers ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCategory(r: any): InventoryCategory {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    sortOrder: Number(r.sort_order),
    hasExpiry: Boolean(r.has_expiry),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toItem(r: any): InventoryItem {
  const par = Number(r.par) || 0;
  const current = Number(r.current_stock) || 0;
  const prior = r.prior_stock != null ? Number(r.prior_stock) : null;
  return {
    id: r.id,
    categoryId: r.category_id,
    categoryName: r.category_name ?? undefined,
    categorySlug: r.category_slug ?? undefined,
    name: r.name,
    location: r.location || null,
    par,
    currentStock: current,
    priorStock: prior,
    expiredQty: Number(r.expired_qty) || 0,
    qtyToOrder: Math.max(0, par - current),
    delta: prior != null ? current - prior : null,
    vendorSource: r.vendor_source || null,
    notes: r.notes || null,
    skipOrder: Boolean(r.skip_order),
    sortOrder: Number(r.sort_order),
    version: Number(r.version),
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at ?? ""),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toAudit(r: any): AuditEntry {
  return {
    id: r.id,
    itemId: r.item_id,
    itemName: r.item_name ?? undefined,
    categoryName: r.category_name ?? undefined,
    fieldChanged: r.field_changed,
    oldValue: r.old_value,
    newValue: r.new_value,
    changedBy: r.changed_by,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSubmission(r: any): InventorySubmission {
  return {
    id: r.id,
    submittedBy: r.submitted_by,
    categorySlug: r.category_slug,
    itemsUpdated: Number(r.items_updated),
    notes: r.notes,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toReport(r: any): InventoryReport {
  return {
    id: r.id,
    reportType: r.report_type,
    filename: r.filename,
    blobUrl: r.blob_url,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  };
}

// ── Categories ─────────────────────────────────────────────────────────────

export async function getCategories(): Promise<InventoryCategory[]> {
  await ensureInventorySchema();
  const db = sql();
  const rows = await db`SELECT * FROM inventory_categories ORDER BY sort_order ASC`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rows as any[]).map(toCategory);
}

export async function createCategory(data: { name: string; slug: string; sortOrder: number; hasExpiry: boolean }): Promise<InventoryCategory> {
  await ensureInventorySchema();
  const db = sql();
  const id = uid();
  await db`INSERT INTO inventory_categories (id, name, slug, sort_order, has_expiry) VALUES (${id}, ${data.name}, ${data.slug}, ${data.sortOrder}, ${data.hasExpiry})`;
  const rows = await db`SELECT * FROM inventory_categories WHERE id = ${id}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toCategory((rows as any[])[0]);
}

// ── Items ──────────────────────────────────────────────────────────────────

export async function getItems(categorySlug?: string): Promise<InventoryItem[]> {
  await ensureInventorySchema();
  const db = sql();
  if (categorySlug) {
    const rows = await db`
      SELECT i.*, c.name AS category_name, c.slug AS category_slug
      FROM inventory_items i
      JOIN inventory_categories c ON i.category_id = c.id
      WHERE c.slug = ${categorySlug}
      ORDER BY i.sort_order ASC
    `;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (rows as any[]).map(toItem);
  }
  const rows = await db`
    SELECT i.*, c.name AS category_name, c.slug AS category_slug
    FROM inventory_items i
    JOIN inventory_categories c ON i.category_id = c.id
    ORDER BY c.sort_order ASC, i.sort_order ASC
  `;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rows as any[]).map(toItem);
}

export async function getItem(id: string): Promise<InventoryItem | null> {
  await ensureInventorySchema();
  const db = sql();
  const rows = await db`
    SELECT i.*, c.name AS category_name, c.slug AS category_slug
    FROM inventory_items i
    JOIN inventory_categories c ON i.category_id = c.id
    WHERE i.id = ${id}
  `;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(rows as any[]).length) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toItem((rows as any[])[0]);
}

export async function getItemByQrToken(token: string): Promise<(InventoryItem & { qrTokenId: string }) | null> {
  await ensureInventorySchema();
  const db = sql();
  const rows = await db`
    SELECT i.*, c.name AS category_name, c.slug AS category_slug, qt.id AS qr_token_id
    FROM inventory_qr_tokens qt
    JOIN inventory_items i ON qt.item_id = i.id
    JOIN inventory_categories c ON i.category_id = c.id
    WHERE qt.token = ${token} AND qt.active = TRUE
  `;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(rows as any[]).length) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = (rows as any[])[0];
  return { ...toItem(r), qrTokenId: r.qr_token_id };
}

export async function getItemsSince(since: string): Promise<InventoryItem[]> {
  await ensureInventorySchema();
  const db = sql();
  const rows = await db`
    SELECT i.*, c.name AS category_name, c.slug AS category_slug
    FROM inventory_items i
    JOIN inventory_categories c ON i.category_id = c.id
    WHERE i.updated_at > ${since}
    ORDER BY c.sort_order ASC, i.sort_order ASC
  `;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rows as any[]).map(toItem);
}

export interface ItemUpdate {
  currentStock?: number;
  expiredQty?: number;
  notes?: string;
  par?: number;
}

export async function updateItem(
  id: string,
  version: number,
  updates: ItemUpdate,
  changedBy = "inventory"
): Promise<{ success: boolean; item?: InventoryItem; conflict?: boolean }> {
  await ensureInventorySchema();
  const db = sql();

  // Get current state
  const current = await db`SELECT * FROM inventory_items WHERE id = ${id} AND version = ${version}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(current as any[]).length) {
    // Check if item exists at all
    const exists = await db`SELECT version FROM inventory_items WHERE id = ${id}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((exists as any[]).length) return { success: false, conflict: true };
    return { success: false };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const old = (current as any[])[0];

  // Build audit log entries
  const auditEntries: { field: string; oldVal: string | null; newVal: string | null }[] = [];

  if (updates.currentStock !== undefined && updates.currentStock !== Number(old.current_stock)) {
    auditEntries.push({ field: "current_stock", oldVal: String(old.current_stock), newVal: String(updates.currentStock) });
  }
  if (updates.expiredQty !== undefined && updates.expiredQty !== Number(old.expired_qty)) {
    auditEntries.push({ field: "expired_qty", oldVal: String(old.expired_qty), newVal: String(updates.expiredQty) });
  }
  if (updates.notes !== undefined && updates.notes !== (old.notes || "")) {
    auditEntries.push({ field: "notes", oldVal: old.notes || null, newVal: updates.notes || null });
  }
  if (updates.par !== undefined && updates.par !== Number(old.par)) {
    auditEntries.push({ field: "par", oldVal: String(old.par), newVal: String(updates.par) });
  }

  // Determine prior_stock: if currentStock is changing, save old current as prior
  const priorStock = updates.currentStock !== undefined && updates.currentStock !== Number(old.current_stock)
    ? Number(old.current_stock)
    : old.prior_stock;

  const newStock = updates.currentStock ?? Number(old.current_stock);
  const newExpired = updates.expiredQty ?? Number(old.expired_qty);
  const newNotes = updates.notes !== undefined ? updates.notes : old.notes;
  const newPar = updates.par ?? Number(old.par);

  await db`
    UPDATE inventory_items SET
      current_stock = ${newStock},
      prior_stock = ${priorStock},
      expired_qty = ${newExpired},
      notes = ${newNotes},
      par = ${newPar},
      version = version + 1,
      updated_at = NOW()
    WHERE id = ${id} AND version = ${version}
  `;

  // Write audit log
  for (const entry of auditEntries) {
    const aid = uid();
    await db`INSERT INTO inventory_audit_log (id, item_id, field_changed, old_value, new_value, changed_by) VALUES (${aid}, ${id}, ${entry.field}, ${entry.oldVal}, ${entry.newVal}, ${changedBy})`;
  }

  const item = await getItem(id);
  return { success: true, item: item ?? undefined };
}

export async function createItem(data: {
  categoryId: string;
  name: string;
  location?: string;
  par?: number;
  currentStock?: number;
  vendorSource?: string;
  skipOrder?: boolean;
  sortOrder?: number;
}): Promise<InventoryItem> {
  await ensureInventorySchema();
  const db = sql();
  const id = uid();
  await db`
    INSERT INTO inventory_items (id, category_id, name, location, par, current_stock, vendor_source, skip_order, sort_order)
    VALUES (${id}, ${data.categoryId}, ${data.name}, ${data.location ?? null}, ${data.par ?? 0}, ${data.currentStock ?? 0}, ${data.vendorSource ?? null}, ${data.skipOrder ?? false}, ${data.sortOrder ?? 0})
  `;
  const item = await getItem(id);
  return item!;
}

// ── QR Tokens ──────────────────────────────────────────────────────────────

export async function createQrToken(itemId: string, label?: string): Promise<{ id: string; token: string }> {
  await ensureInventorySchema();
  const db = sql();
  const id = uid();
  const { randomBytes } = await import("crypto");
  const token = randomBytes(32).toString("base64url");
  await db`INSERT INTO inventory_qr_tokens (id, token, item_id, label) VALUES (${id}, ${token}, ${itemId}, ${label ?? null})`;
  return { id, token };
}

export async function getQrTokens(): Promise<{ id: string; token: string; itemId: string; itemName: string; label: string | null; active: boolean; createdAt: string }[]> {
  await ensureInventorySchema();
  const db = sql();
  const rows = await db`
    SELECT qt.*, i.name AS item_name
    FROM inventory_qr_tokens qt
    JOIN inventory_items i ON qt.item_id = i.id
    ORDER BY qt.created_at DESC
  `;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rows as any[]).map(r => ({
    id: r.id,
    token: r.token,
    itemId: r.item_id,
    itemName: r.item_name,
    label: r.label,
    active: Boolean(r.active),
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }));
}

export async function revokeQrToken(id: string): Promise<void> {
  await ensureInventorySchema();
  const db = sql();
  await db`UPDATE inventory_qr_tokens SET active = FALSE WHERE id = ${id}`;
}

// ── Audit Log ──────────────────────────────────────────────────────────────

export async function getAuditLog(limit = 200, itemId?: string): Promise<AuditEntry[]> {
  await ensureInventorySchema();
  const db = sql();
  if (itemId) {
    const rows = await db`
      SELECT al.*, i.name AS item_name, c.name AS category_name
      FROM inventory_audit_log al
      LEFT JOIN inventory_items i ON al.item_id = i.id
      LEFT JOIN inventory_categories c ON i.category_id = c.id
      WHERE al.item_id = ${itemId}
      ORDER BY al.created_at DESC LIMIT ${limit}
    `;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (rows as any[]).map(toAudit);
  }
  const rows = await db`
    SELECT al.*, i.name AS item_name, c.name AS category_name
    FROM inventory_audit_log al
    LEFT JOIN inventory_items i ON al.item_id = i.id
    LEFT JOIN inventory_categories c ON i.category_id = c.id
    ORDER BY al.created_at DESC LIMIT ${limit}
  `;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rows as any[]).map(toAudit);
}

// ── Submissions ────────────────────────────────────────────────────────────

export async function createSubmission(data: {
  submittedBy?: string;
  categorySlug?: string;
  itemsUpdated: number;
  notes?: string;
}): Promise<InventorySubmission> {
  await ensureInventorySchema();
  const db = sql();
  const id = uid();
  await db`INSERT INTO inventory_submissions (id, submitted_by, category_slug, items_updated, notes) VALUES (${id}, ${data.submittedBy ?? "inventory"}, ${data.categorySlug ?? null}, ${data.itemsUpdated}, ${data.notes ?? null})`;
  const rows = await db`SELECT * FROM inventory_submissions WHERE id = ${id}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toSubmission((rows as any[])[0]);
}

export async function getSubmissions(limit = 50): Promise<InventorySubmission[]> {
  await ensureInventorySchema();
  const db = sql();
  const rows = await db`SELECT * FROM inventory_submissions ORDER BY created_at DESC LIMIT ${limit}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rows as any[]).map(toSubmission);
}

// ── Reports ────────────────────────────────────────────────────────────────

export async function saveReport(data: { reportType: string; filename: string; blobUrl: string }): Promise<InventoryReport> {
  await ensureInventorySchema();
  const db = sql();
  const id = uid();
  await db`INSERT INTO inventory_reports (id, report_type, filename, blob_url) VALUES (${id}, ${data.reportType}, ${data.filename}, ${data.blobUrl})`;
  const rows = await db`SELECT * FROM inventory_reports WHERE id = ${id}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toReport((rows as any[])[0]);
}

export async function getReports(reportType?: string): Promise<InventoryReport[]> {
  await ensureInventorySchema();
  const db = sql();
  if (reportType) {
    const rows = await db`SELECT * FROM inventory_reports WHERE report_type = ${reportType} ORDER BY created_at DESC`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (rows as any[]).map(toReport);
  }
  const rows = await db`SELECT * FROM inventory_reports ORDER BY created_at DESC`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rows as any[]).map(toReport);
}

// ── Inventory Stats (for admin dashboard) ──────────────────────────────────

export async function getInventoryStats(): Promise<{
  totalItems: number;
  lowStock: number;
  expiredItems: number;
  categories: number;
}> {
  await ensureInventorySchema();
  const db = sql();
  const rows = await db`
    SELECT
      COUNT(*)::int AS total_items,
      COUNT(*) FILTER (WHERE current_stock < par AND NOT skip_order)::int AS low_stock,
      COUNT(*) FILTER (WHERE expired_qty > 0)::int AS expired_items
    FROM inventory_items
  `;
  const catRows = await db`SELECT COUNT(*)::int AS cnt FROM inventory_categories`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = (rows as any[])[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = (catRows as any[])[0];
  return {
    totalItems: s?.total_items ?? 0,
    lowStock: s?.low_stock ?? 0,
    expiredItems: s?.expired_items ?? 0,
    categories: c?.cnt ?? 0,
  };
}

// ── Seed helper — clear all inventory data ─────────────────────────────────

export async function clearInventoryData(): Promise<void> {
  await ensureInventorySchema();
  const db = sql();
  await db`DELETE FROM inventory_audit_log`;
  await db`DELETE FROM inventory_qr_tokens`;
  await db`DELETE FROM inventory_items`;
  await db`DELETE FROM inventory_categories`;
  await db`DELETE FROM inventory_submissions`;
}

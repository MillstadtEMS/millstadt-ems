/**
 * Excel seed parser — reads the inventory workbook and returns structured data.
 * Handles section headers, skip rows, vendor extraction, and location metadata.
 */

import path from "node:path";
import fs from "node:fs";
import { createCategory, createItem, clearInventoryData, ensureInventorySchema } from "./db";

interface ParsedItem {
  name: string;
  location: string | null;
  par: number;
  currentStock: number;
  vendorSource: string | null;
  skipOrder: boolean;
  sortOrder: number;
}

interface ParsedCategory {
  name: string;
  slug: string;
  hasExpiry: boolean;
  sortOrder: number;
  items: ParsedItem[];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Extract vendor/source info from item names.
 * Patterns: "(Order from ...)", "(Not restocked by ...)", email addresses
 */
function extractVendor(name: string): { cleanName: string; vendor: string | null } {
  let vendor: string | null = null;
  let cleanName = name;

  // Extract "(Order from ...)" patterns
  const orderMatch = name.match(/\((?:Order from|order from|Ordered from)\s+(.+?)\)/i);
  if (orderMatch) {
    vendor = orderMatch[1].trim();
    cleanName = name.replace(orderMatch[0], "").trim();
  }

  // Extract "(NOT restocked by ...)" patterns
  const notMatch = name.match(/\((?:NOT restocked by|not restocked by)\s+(.+?)\)/i);
  if (notMatch) {
    vendor = `NOT restocked by ${notMatch[1].trim()}`;
    cleanName = name.replace(notMatch[0], "").trim();
  }

  return { cleanName, vendor };
}

/**
 * Determine if a row is a section header (location marker) rather than an item.
 * Section headers have null PAR and contain location info like "Shelf A", "Row 1", etc.
 */
function isSectionHeader(row: Record<string, unknown>): boolean {
  const name = String(row["Item Name"] ?? "").trim();
  const par = row["PAR"];
  const stock = row["Current Stock"];

  // Must have a name
  if (!name) return true;

  // If it has PAR or stock values, it's likely an item
  if (par != null && par !== "" && !isNaN(Number(par))) return false;
  if (stock != null && stock !== "" && !isNaN(Number(stock))) return false;

  // Common header patterns
  const headerPatterns = [
    /^shelf\s+[a-z]/i,
    /^row\s+\d/i,
    /^medication\s+drawer/i,
    /^black\s+stacked/i,
    /^oxygen\s+tanks/i,
    /^ppe\s+shelf/i,
    /^top\s+shelving/i,
    /^hanging\s+on/i,
    /^general\s+housekeeping/i,
    /^maintenance$/i,
    /^building\s*\/?\s*grounds/i,
    /^bottom\s+shelf/i,
    /^unlabeled/i,
  ];

  for (const p of headerPatterns) {
    if (p.test(name)) return true;
  }

  return false;
}

function isSkipRow(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes("skip") || lower.includes("do not order") || lower.includes("empty at the moment");
}

export async function parseWorkbook(filePath?: string): Promise<ParsedCategory[]> {
  const XLSX = await import("xlsx");
  const resolvedPath = filePath ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "2026 Millstadt EMS Order _ Inv Form.xlsx");

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Excel file not found: ${resolvedPath}`);
  }

  const workbook = XLSX.readFile(resolvedPath);
  const categories: ParsedCategory[] = [];

  // Skip the "Contact for CapitalUniforms" sheet — it's vendor info, not inventory
  const inventorySheets = workbook.SheetNames.filter(
    (name) => !name.toLowerCase().includes("contact")
  );

  const medicalSheets = ["ems supply backstock", "medication backstock"];

  for (let si = 0; si < inventorySheets.length; si++) {
    const sheetName = inventorySheets[si];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null }) as Record<string, unknown>[];

    const hasExpiry = medicalSheets.includes(sheetName.toLowerCase());
    const category: ParsedCategory = {
      name: sheetName,
      slug: slugify(sheetName),
      hasExpiry,
      sortOrder: si,
      items: [],
    };

    let currentLocation: string | null = null;
    let sortOrder = 0;

    for (const row of rows) {
      const rawName = String(row["Item Name"] ?? "").trim();
      if (!rawName) continue;

      // Check if this is a section header (location marker)
      if (isSectionHeader(row)) {
        currentLocation = rawName;
        continue;
      }

      // Check if this is a skip row
      const skip = isSkipRow(rawName);

      // Extract vendor info from name
      const { cleanName, vendor } = extractVendor(rawName);

      const par = Number(row["PAR"]) || 0;
      const stock = Number(row["Current Stock"]) || 0;

      category.items.push({
        name: cleanName,
        location: currentLocation,
        par,
        currentStock: stock,
        vendorSource: vendor,
        skipOrder: skip,
        sortOrder: sortOrder++,
      });
    }

    categories.push(category);
  }

  return categories;
}

/**
 * Seed the database from the Excel workbook.
 * Clears existing inventory data first.
 */
export async function seedFromWorkbook(filePath?: string): Promise<{ categories: number; items: number }> {
  await ensureInventorySchema();
  await clearInventoryData();

  const parsed = await parseWorkbook(filePath);
  let totalItems = 0;

  for (const cat of parsed) {
    const category = await createCategory({
      name: cat.name,
      slug: cat.slug,
      sortOrder: cat.sortOrder,
      hasExpiry: cat.hasExpiry,
    });

    for (const item of cat.items) {
      await createItem({
        categoryId: category.id,
        name: item.name,
        location: item.location ?? undefined,
        par: item.par,
        currentStock: item.currentStock,
        vendorSource: item.vendorSource ?? undefined,
        skipOrder: item.skipOrder,
        sortOrder: item.sortOrder,
      });
      totalItems++;
    }
  }

  return { categories: parsed.length, items: totalItems };
}

import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin/auth";
import { createCategory, createItem, clearInventoryData, ensureInventorySchema } from "@/lib/inventory/db";
import { logChange } from "@/lib/db";

interface SeedItem {
  name: string;
  location?: string;
  par?: number;
  currentStock?: number;
  vendorSource?: string;
  skipOrder?: boolean;
  sortOrder?: number;
}

interface SeedCategory {
  name: string;
  slug: string;
  hasExpiry?: boolean;
  sortOrder: number;
  items: SeedItem[];
}

export async function POST(req: NextRequest) {
  const authed = await isAdminAuthed();
  if (!authed) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);

    // Accept pre-parsed JSON categories (for Vercel where xlsx can't run)
    if (!body || !Array.isArray(body.categories)) {
      return NextResponse.json({
        error: "Send { categories: [...] } as JSON body. Use the local seed script to parse Excel.",
      }, { status: 400 });
    }

    await ensureInventorySchema();
    await clearInventoryData();

    const categories = body.categories as SeedCategory[];
    let totalItems = 0;

    for (const cat of categories) {
      const category = await createCategory({
        name: cat.name,
        slug: cat.slug,
        sortOrder: cat.sortOrder,
        hasExpiry: cat.hasExpiry ?? false,
      });

      for (const item of cat.items) {
        await createItem({
          categoryId: category.id,
          name: item.name,
          location: item.location,
          par: item.par ?? 0,
          currentStock: item.currentStock ?? 0,
          vendorSource: item.vendorSource,
          skipOrder: item.skipOrder ?? false,
          sortOrder: item.sortOrder ?? 0,
        });
        totalItems++;
      }
    }

    await logChange("seed", "inventory", `Seeded ${totalItems} items in ${categories.length} categories`);
    return NextResponse.json({
      ok: true,
      message: `Seeded ${totalItems} items across ${categories.length} categories`,
      categories: categories.length,
      items: totalItems,
    });
  } catch (e) {
    console.error("Seed error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

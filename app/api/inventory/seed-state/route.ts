import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin/auth";
import { seedStateItems } from "@/lib/inventory/seed-state";
import { isSameOriginRequest } from "@/lib/security/http";
import { inventoryActor } from "@/lib/inventory/mutation-security";

export async function POST(req: NextRequest) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Cross-origin request denied" }, { status: 403 });
  }

  try {
    const result = await seedStateItems(inventoryActor(admin));
    return NextResponse.json({
      message: `Seeded ${result.categories} categories and ${result.items} state inspection items`,
      ...result,
    });
  } catch (e) {
    console.error("State seed error:", e);
    return NextResponse.json({ error: "Seed failed" }, { status: 500 });
  }
}

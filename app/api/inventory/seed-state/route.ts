import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { seedStateItems } from "@/lib/inventory/seed-state";

export async function POST() {
  const denied = await requireAdmin(); if (denied) return denied;

  try {
    const result = await seedStateItems();
    return NextResponse.json({
      message: `Seeded ${result.categories} categories and ${result.items} state inspection items`,
      ...result,
    });
  } catch (e) {
    console.error("State seed error:", e);
    return NextResponse.json({ error: "Seed failed" }, { status: 500 });
  }
}

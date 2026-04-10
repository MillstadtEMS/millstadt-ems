import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin/auth";
import { seedStateItems } from "@/lib/inventory/seed-state";

export async function POST() {
  const authed = await isAdminAuthed();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await seedStateItems();
    return NextResponse.json({
      message: `Seeded ${result.categories} categories and ${result.items} state inspection items`,
      ...result,
    });
  } catch (e) {
    console.error("State seed error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Seed failed" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin/auth";
import { seedFromWorkbook } from "@/lib/inventory/seed";
import { logChange } from "@/lib/db";

export async function POST() {
  const authed = await isAdminAuthed();
  if (!authed) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }

  try {
    const result = await seedFromWorkbook();
    await logChange("seed", "inventory", `Seeded ${result.items} items in ${result.categories} categories from Excel`);
    return NextResponse.json({
      ok: true,
      message: `Seeded ${result.items} items across ${result.categories} categories`,
      ...result,
    });
  } catch (e) {
    console.error("Seed error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

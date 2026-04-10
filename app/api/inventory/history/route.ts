import { NextRequest, NextResponse } from "next/server";
import { isInventoryAuthed } from "@/lib/inventory/auth";
import { getAuditLog, getSubmissions } from "@/lib/inventory/db";

export async function GET(req: NextRequest) {
  const authed = await isInventoryAuthed();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "audit";
  const itemId = searchParams.get("itemId");
  const limit = Math.min(Number(searchParams.get("limit")) || 200, 500);

  if (type === "submissions") {
    const submissions = await getSubmissions(limit);
    return NextResponse.json(submissions);
  }

  const entries = await getAuditLog(limit, itemId ?? undefined);
  return NextResponse.json(entries);
}

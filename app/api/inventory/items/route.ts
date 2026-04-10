import { NextRequest, NextResponse } from "next/server";
import { isInventoryAuthed } from "@/lib/inventory/auth";
import { getItems, getItemsSince } from "@/lib/inventory/db";

export async function GET(req: NextRequest) {
  const authed = await isInventoryAuthed();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const since = searchParams.get("since");
  const type = searchParams.get("type");

  // Polling for updates since a timestamp
  if (since) {
    const items = await getItemsSince(since, type ?? undefined);
    return NextResponse.json(items);
  }

  const items = await getItems(category ?? undefined, type ?? undefined);
  return NextResponse.json(items);
}

import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { countUnread, listNotifications } from "@/lib/lounge/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const onlyUnread = req.nextUrl.searchParams.get("unread") === "1";
  const [items, unread] = await Promise.all([
    listNotifications(me.id, { onlyUnread, limit: 60 }),
    countUnread(me.id),
  ]);
  return NextResponse.json({ notifications: items, unread });
}

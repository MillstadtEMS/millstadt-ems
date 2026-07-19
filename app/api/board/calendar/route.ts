import { NextRequest, NextResponse } from "next/server";
import { currentBoardUser } from "@/lib/board/auth";
import { audit } from "@/lib/board/db";
import { canManageCalendar, createCalendarItem } from "@/lib/board/governance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await currentBoardUser();
  if (!user || !canManageCalendar(user)) {
    return NextResponse.json({ error: "Calendar permission required." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const itemType = String(body.itemType ?? "Event").trim();
  const date = String(body.date ?? "").trim();
  const startTime = body.startTime == null ? null : String(body.startTime).trim() || null;
  const endTime = body.endTime == null ? null : String(body.endTime).trim() || null;
  const description = body.description == null ? null : String(body.description).trim() || null;

  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Date is required." }, { status: 400 });
  if (itemType !== "Event" && itemType !== "Reminder") return NextResponse.json({ error: "Type must be Event or Reminder." }, { status: 400 });

  const id = await createCalendarItem({ title, itemType, date, startTime, endTime, description, createdBy: user });
  await audit({
    userId: user.id,
    username: user.username,
    role: user.role,
    action: "board_calendar_item_created",
    detail: `${itemType}: ${title} (${date})`,
    ip: req.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ ok: true, id });
}

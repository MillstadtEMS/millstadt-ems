import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { listSuggestions } from "@/lib/lounge/hospital-suggestions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!me.isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const status = req.nextUrl.searchParams.get("status");
  const validStatus = status === "approved" || status === "rejected" || status === "pending" ? status : undefined;
  const suggestions = await listSuggestions(validStatus ? { status: validStatus } : undefined);
  return NextResponse.json({ suggestions });
}

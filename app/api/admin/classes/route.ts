import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { listClasses, createClass } from "@/lib/lounge/certs";

export const runtime = "nodejs";

export async function GET() {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const classes = await listClasses();
  return NextResponse.json({ classes });
}

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: { name?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  try {
    const created = await createClass({ name: body.name, description: body.description });
    return NextResponse.json({ class: created });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Create failed";
    if (/unique|duplicate/i.test(msg)) {
      return NextResponse.json({ error: "A class with that name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

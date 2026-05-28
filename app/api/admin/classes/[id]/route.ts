import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { getClass, updateClass, deleteClass } from "@/lib/lounge/certs";

export const runtime = "nodejs";

async function gate() {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return null;
  return me;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await gate())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const c = await getClass(id);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ class: c });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await gate())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const body: { name?: string; description?: string | null } = await req.json();
  const updated = await updateClass(id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ class: updated });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await gate())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  await deleteClass(id);
  return NextResponse.json({ ok: true });
}

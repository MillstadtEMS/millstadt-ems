import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin/auth";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  const db = neon(process.env.DATABASE_URL!);
  await db`DELETE FROM cad_calls WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

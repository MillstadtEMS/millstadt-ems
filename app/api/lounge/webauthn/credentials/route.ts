import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { deleteCredential, listCredentialsForEmployee } from "@/lib/lounge/webauthn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const creds = await listCredentialsForEmployee(me.id);
  return NextResponse.json({ credentials: creds });
}

export async function DELETE(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await deleteCredential(me.id, id);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { startRegistration } from "@/lib/lounge/webauthn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const options = await startRegistration(
    me.id,
    me.username,
    `${me.firstName} ${me.lastName}`,
  );
  return NextResponse.json({ options });
}

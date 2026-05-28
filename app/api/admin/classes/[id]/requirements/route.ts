/**
 * PUT /api/admin/classes/[id]/requirements
 *   body: { certTypeIds: string[] }
 *   Replaces the full list of required cert types for this class.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { setClassRequirements, getClass } from "@/lib/lounge/certs";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const { certTypeIds }: { certTypeIds: string[] } = await req.json();
  if (!Array.isArray(certTypeIds)) {
    return NextResponse.json({ error: "certTypeIds must be an array" }, { status: 400 });
  }
  await setClassRequirements(id, certTypeIds);
  const updated = await getClass(id);
  return NextResponse.json({ class: updated });
}

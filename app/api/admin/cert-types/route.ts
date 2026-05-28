import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { listCertTypes, createCertType } from "@/lib/lounge/certs";

export const runtime = "nodejs";

export async function GET() {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Both employees and admins can list cert types — employees need them
  // to see what they can upload.
  const certTypes = await listCertTypes();
  return NextResponse.json({ certTypes });
}

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body: {
    name?: string;
    slug?: string;
    requiresExpiration?: boolean;
    alertThresholds?: number[];
  } = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  try {
    const created = await createCertType({
      name: body.name,
      slug: body.slug,
      requiresExpiration: body.requiresExpiration ?? true,
      alertThresholds: body.alertThresholds,
      createdBy: me.id,
    });
    return NextResponse.json({ certType: created });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Create failed";
    if (/unique|duplicate/i.test(msg)) {
      return NextResponse.json(
        { error: "A cert type with that name or slug already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

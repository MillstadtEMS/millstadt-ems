import { NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { listEmployees } from "@/lib/lounge/employees";

export const dynamic = "force-dynamic";

// Lightweight roster: just enough to populate "add attendant" pickers
// inside the lounge (truck check, washes, etc). Authenticated lounge
// users only.
export async function GET() {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await listEmployees();
  return NextResponse.json({
    employees: rows.map((r) => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      certification: r.certification,
    })),
  });
}

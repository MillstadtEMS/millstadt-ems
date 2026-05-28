import { NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";

export async function GET() {
  const emp = await currentEmployee();
  if (!emp) {
    return NextResponse.json({ employee: null }, { status: 401 });
  }
  // Pull the extended record so the client can show photo + cert.
  const full = await getEmployee(emp.id);
  return NextResponse.json({
    employee: {
      id: emp.id,
      username: emp.username,
      firstName: emp.firstName,
      lastName: emp.lastName,
      isAdmin: emp.isAdmin,
      mustChangePassword: emp.mustChangePassword,
      photoUrl: full?.photoUrl ?? null,
      certification: full?.certification ?? null,
    },
  });
}

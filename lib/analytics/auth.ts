import { NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { getAnalyticsConfig } from "./config";

export async function currentAnalyticsSupervisor() {
  const employee = await currentEmployee();
  if (!employee || !employee.isActive || !employee.isAdmin) return null;
  const config = getAnalyticsConfig();
  if (!config.supervisorEmployeeIds.includes(employee.id)) return null;
  return employee;
}

export async function requireAnalyticsSupervisor() {
  const employee = await currentAnalyticsSupervisor();
  if (employee) return { employee };
  return {
    response: NextResponse.json(
      { error: "Supervisor authorization is required." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    ),
  };
}

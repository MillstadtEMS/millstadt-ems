import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { logChange } from "@/lib/db";
import {
  changeStationPassword, STATION_PASSWORD_MAX_LENGTH, STATION_PASSWORD_MIN_LENGTH, stationPasswordCanChange,
  stationPasswordStatus,
} from "@/lib/station/auth";

export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store, private" };

/** Admin > Station TV: whether a station password is set (never the password or its hash). */
export async function GET() {
  const denied = await requireAdmin(); if (denied) return denied;
  return NextResponse.json({
    status: await stationPasswordStatus(),
    canChange: stationPasswordCanChange(),
    minLength: STATION_PASSWORD_MIN_LENGTH,
  }, { headers: noStore });
}

/** Set or change the shared station TV password. Every signed-in TV is signed out. */
export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  if ((Number(req.headers.get("content-length")) || 0) > 4096) {
    return NextResponse.json({ error: "Request too large." }, { status: 413, headers: noStore });
  }
  let newPassword: unknown;
  try {
    ({ newPassword } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: noStore });
  }
  if (typeof newPassword !== "string" || newPassword.length < STATION_PASSWORD_MIN_LENGTH || newPassword.length > STATION_PASSWORD_MAX_LENGTH || !newPassword.trim()) {
    return NextResponse.json({ error: `Use ${STATION_PASSWORD_MIN_LENGTH} to ${STATION_PASSWORD_MAX_LENGTH} characters.` }, { status: 400, headers: noStore });
  }
  try {
    const result = await changeStationPassword(newPassword);
    if (result === "no-database") {
      return NextResponse.json({ error: "The station password can only be saved where the site's database is connected." }, { status: 409, headers: noStore });
    }
    await logChange("password_change", "station_tv", `Station TV password changed at ${new Date().toISOString()}`);
    return NextResponse.json({ ok: true, message: "Station TV password saved. Every signed-in TV will ask for the new password." }, { headers: noStore });
  } catch (error) {
    console.error("[station] password change failed", { name: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ error: "Server error." }, { status: 500, headers: noStore });
  }
}

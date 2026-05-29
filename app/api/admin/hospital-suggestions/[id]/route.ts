import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  createHospital,
  updateHospital,
  type CreateHospitalInput,
  type HospitalPatch,
} from "@/lib/lounge/hospitals";
import {
  decideSuggestion,
  listSuggestions,
} from "@/lib/lounge/hospital-suggestions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PendingPayload {
  // code_change
  codeKind?: "ER" | "EMS Room" | "Non-ER" | "Nursing Home";
  newValue?: string;
  note?: string;
  // new_facility
  name?: string;
  city?: string;
  state?: string;
  primaryLabel?: string;
  primaryPhone?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  doorCode?: string | null;
  emsRoomCode?: string | null;
}

async function findSuggestion(id: string) {
  const all = await listSuggestions();
  return all.find((s) => s.id === id) ?? null;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!me.isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const decision = body.decision;
  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ error: "decision must be approved or rejected" }, { status: 400 });
  }

  const suggestion = await findSuggestion(id);
  if (!suggestion) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (suggestion.status !== "pending") {
    return NextResponse.json({ error: "Already decided." }, { status: 400 });
  }

  const notes = typeof body.adminNotes === "string" ? body.adminNotes : null;
  const payload = suggestion.payload as PendingPayload;

  if (decision === "approved") {
    if (suggestion.kind === "code_change" && suggestion.hospitalId) {
      const patch: HospitalPatch = {};
      const v = (payload.newValue ?? "").trim() || null;
      if (payload.codeKind === "ER") patch.doorCode = v;
      else if (payload.codeKind === "EMS Room") patch.emsRoomCode = v;
      else {
        // Non-ER / Nursing Home — append into the structured codes list.
        const overrideOptions = body.overrideOptions as {
          replaceFirstOfKind?: boolean;
        } | undefined;
        patch.codes = [{
          kind: payload.codeKind ?? "ER",
          value: v ?? "",
          note: payload.note ?? undefined,
        }];
        // Keep existing legacy codes by reading them via update layer
        // — admin can fine-tune via the edit screen afterward.
        void overrideOptions;
      }
      await updateHospital(suggestion.hospitalId, patch);
    } else if (suggestion.kind === "new_facility") {
      const lat = typeof payload.latitude === "number" ? payload.latitude : Number(payload.latitude);
      const lng = typeof payload.longitude === "number" ? payload.longitude : Number(payload.longitude);
      const input: CreateHospitalInput = {
        name: payload.name ?? "",
        city: payload.city ?? "",
        state: payload.state ?? "",
        primaryLabel: payload.primaryLabel ?? "EMS Patch",
        primaryPhone: payload.primaryPhone ?? "",
        address: payload.address ?? "",
        latitude: Number.isFinite(lat) ? lat : 0,
        longitude: Number.isFinite(lng) ? lng : 0,
      };
      const created = await createHospital(input);
      if (payload.doorCode || payload.emsRoomCode) {
        await updateHospital(created.id, {
          doorCode: payload.doorCode ?? null,
          emsRoomCode: payload.emsRoomCode ?? null,
        });
      }
    }
  }

  await decideSuggestion(id, decision, me.id, notes);
  return NextResponse.json({ ok: true });
}

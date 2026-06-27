import { NextRequest, NextResponse } from "next/server";
import { requireTickerEditor } from "@/lib/admin/auth";
import { sql } from "@/lib/neon";
import {
  canonicalCategory,
  CallStructured,
  CardiacAge,
  Classification,
  ensureCadStructuredSchema,
  formatDispatchNature,
  HemsOutcome,
  isClassification,
  MILLSTADT_UNITS,
  MillstadtUnit,
  MUTUAL_AID_AGENCIES,
  MutualAidAgency,
  parseDispatchNature,
} from "@/lib/cad/structured";

/** Mandatory-capture check for structured saves: unit (unless mutual aid
 * received), a main complaint, and a classification. Returns an error
 * string, or null when valid. */
function mandatoryError(s: CallStructured): string | null {
  if (!s.category) return "Pick a main complaint (category).";
  if (!s.classification) return "Pick a classification: Medical, Trauma, Uncategorized, or Cancelled.";
  if (s.units.length === 0 && !s.mutualAidReceived) return "Pick at least one responding unit (not required for mutual aid received).";
  return null;
}

export const runtime = "nodejs";

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

interface StructuredPayload {
  units?: string[];
  category?: string;
  notes?: string | null;
  mutualAidReceived?: boolean;
  mutualAidReceivedAgency?: string | null;
  mutualAidGiven?: boolean;
  mutualAidGivenAgency?: string | null;
  hemsRequested?: boolean;
  hemsOutcome?: string | null;
  classification?: string | null;
  cardiacAge?: string | null;
}

/**
 * Sanitize + clamp incoming structured fields to the canonical shape.
 * Anything off-list is dropped so the database never carries a
 * non-canonical unit / agency / outcome value.
 */
function normalize(p: StructuredPayload | null | undefined): CallStructured {
  const units = Array.isArray(p?.units)
    ? (p!.units as string[]).filter((u): u is MillstadtUnit => (MILLSTADT_UNITS as readonly string[]).includes(u))
    : [];
  const agency = p?.mutualAidReceivedAgency && (MUTUAL_AID_AGENCIES as readonly string[]).includes(p.mutualAidReceivedAgency)
    ? (p.mutualAidReceivedAgency as MutualAidAgency)
    : null;
  const givenAgency = p?.mutualAidGivenAgency && (MUTUAL_AID_AGENCIES as readonly string[]).includes(p.mutualAidGivenAgency)
    ? (p.mutualAidGivenAgency as MutualAidAgency)
    : null;
  const mutualAidGiven = !!givenAgency || p?.mutualAidGiven === true;
  const outcome: HemsOutcome | null = p?.hemsOutcome === "handoff" || p?.hemsOutcome === "disregarded"
    ? p.hemsOutcome
    : null;
  const classification: Classification | null = isClassification(p?.classification) ? p!.classification as Classification : null;
  const cardiacAge: CardiacAge | null = p?.cardiacAge === "adult" || p?.cardiacAge === "pediatric" ? p.cardiacAge : null;
  return {
    units: Array.from(new Set(units)),
    category: canonicalCategory(p?.category ?? ""),
    notes: p?.notes ? String(p.notes).trim() || null : null,
    mutualAidReceived: !!agency || p?.mutualAidReceived === true,
    mutualAidReceivedAgency: agency,
    mutualAidGiven,
    mutualAidGivenAgency: mutualAidGiven ? givenAgency : null,
    hemsRequested: !!p?.hemsRequested,
    hemsOutcome: outcome,
    classification,
    cardiacAge,
  };
}

export async function POST(req: NextRequest) {
  const denied = await requireTickerEditor(); if (denied) return denied;
  await ensureCadStructuredSchema();
  const body = await req.json();
  const {
    dispatchDate, dispatchTime, eventNumber, active,
    dispatchNature: rawNature,
    structured,
  } = body as {
    dispatchDate?: string; dispatchTime?: string; eventNumber?: string;
    active?: boolean;
    dispatchNature?: string;
    structured?: StructuredPayload;
  };

  if (!dispatchDate || !dispatchTime) {
    return NextResponse.json({ error: "Date + time required" }, { status: 400 });
  }

  // If the caller sent structured fields, regenerate dispatchNature from
  // them so the live ticker text always matches what's in the structured
  // columns. Otherwise (legacy clients) we accept the raw text and parse
  // nothing — admin can still edit it after the fact.
  const struct = normalize(structured);
  const dispatchNature = structured
    ? formatDispatchNature(struct)
    : (rawNature ?? "").trim();

  if (!dispatchNature) {
    return NextResponse.json({ error: "Pick at least a unit or a category" }, { status: 400 });
  }
  if (struct.hemsRequested && struct.hemsOutcome === null && structured) {
    return NextResponse.json(
      { error: "HEMS requested needs an outcome: Patient handoff or Disregarded." },
      { status: 400 },
    );
  }
  if (structured) {
    const err = mandatoryError(struct);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }

  const id = uid();
  const gmailMessageId = `manual-${id}`;
  const [year, month, day] = dispatchDate.split("-");
  const formattedDate = `${month}/${day}/${year}`;
  const dispatchDatetime = `${dispatchDate}T${dispatchTime}:00`;
  const sourceYear = parseInt(year, 10);
  const completedAt = active === true ? null : new Date();
  const db = sql();
  await db`
    INSERT INTO cad_calls
      (id, gmail_message_id, event_number, dispatch_datetime, dispatch_date, dispatch_time,
       dispatch_nature, source_year, parse_status, completed_at,
       units, category, notes,
       mutual_aid_received, mutual_aid_received_agency, mutual_aid_given, mutual_aid_given_agency,
       hems_requested, hems_outcome, classification, cardiac_age)
    VALUES
      (${id}, ${gmailMessageId}, ${eventNumber?.trim() || null}, ${dispatchDatetime},
       ${formattedDate}, ${dispatchTime}, ${dispatchNature}, ${sourceYear}, 'manual', ${completedAt},
       ${JSON.stringify(struct.units)}::jsonb, ${struct.category || null}, ${struct.notes},
       ${struct.mutualAidReceived}, ${struct.mutualAidReceivedAgency}, ${struct.mutualAidGiven}, ${struct.mutualAidGivenAgency},
       ${struct.hemsRequested}, ${struct.hemsOutcome}, ${struct.classification}, ${struct.cardiacAge})
  `;
  return NextResponse.json({ ok: true, id });
}

export async function PATCH(req: NextRequest) {
  const denied = await requireTickerEditor(); if (denied) return denied;
  await ensureCadStructuredSchema();
  const body = await req.json();
  const {
    id, dispatchNature, active,
    structured,
  } = body as {
    id?: string; dispatchNature?: string; active?: boolean;
    structured?: StructuredPayload;
  };
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = sql();

  // Structured edit path — regenerate the text from the structured fields
  // and persist both. This is how the new editor saves.
  if (structured) {
    const struct = normalize(structured);
    if (struct.hemsRequested && struct.hemsOutcome === null) {
      return NextResponse.json(
        { error: "HEMS requested needs an outcome: Patient handoff or Disregarded." },
        { status: 400 },
      );
    }
    const err = mandatoryError(struct);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    const text = formatDispatchNature(struct);
    await db`
      UPDATE cad_calls SET
        dispatch_nature             = ${text},
        units                       = ${JSON.stringify(struct.units)}::jsonb,
        category                    = ${struct.category || null},
        notes                       = ${struct.notes},
        mutual_aid_received         = ${struct.mutualAidReceived},
        mutual_aid_received_agency  = ${struct.mutualAidReceivedAgency},
        mutual_aid_given            = ${struct.mutualAidGiven},
        mutual_aid_given_agency     = ${struct.mutualAidGivenAgency},
        hems_requested              = ${struct.hemsRequested},
        hems_outcome                = ${struct.hemsOutcome},
        classification              = ${struct.classification},
        cardiac_age                 = ${struct.cardiacAge}
      WHERE id = ${id}
    `;
  } else if (typeof dispatchNature === "string") {
    // Manual text rename: re-derive the report category + units from the
    // new text so a hand-edit connects to the correct reports column
    // (e.g. renaming "Choking / Seizure" to "Seizure" now counts as
    // Seizure). Mutual-aid / HEMS columns are left as-is.
    const text = dispatchNature.trim();
    const parsed = parseDispatchNature(text);
    const category = canonicalCategory(parsed.category);
    await db`
      UPDATE cad_calls SET
        dispatch_nature = ${text},
        category = ${category || null},
        units = ${JSON.stringify(parsed.units)}::jsonb
      WHERE id = ${id}`;
  }

  if (typeof active === "boolean") {
    if (active) {
      await db`UPDATE cad_calls SET completed_at = NULL WHERE id = ${id}`;
    } else {
      await db`UPDATE cad_calls SET completed_at = NOW() WHERE id = ${id} AND completed_at IS NULL`;
    }
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const denied = await requireTickerEditor(); if (denied) return denied;
  const { id } = await req.json();
  const db = sql();
  await db`DELETE FROM cad_calls WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

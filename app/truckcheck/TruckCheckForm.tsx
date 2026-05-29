"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SignaturePad from "./SignaturePad";
import { UNITS, unitOrFallback, type UnitSpec, type TirePosition } from "@/lib/truckcheck/units";
import {
  buildTemplate,
  type CategoryDef,
  type ChecklistItem,
  type FluidItem,
  type StatusItem,
  type StockItem,
  type NumericItem,
  type PassFailItem,
  type RepeatableNumericItem,
} from "@/lib/truckcheck/template";

/**
 * Operational truck check.
 *
 * - Floating top-left timer starts when the form mounts.
 * - Every interaction stamps the item with checkedAt + checkedBy.
 * - Tire PSI fields come from the unit spec (4 single-rear / 6 dually).
 * - Fluids capture status + amount-added + comment.
 * - Required comment when an item is abnormal.
 * - Photo capture (camera or library) — uploaded to Vercel Blob.
 * - Server gets a flat `items[]` it stores in lounge_truck_check_items.
 */

type ItemValue = {
  status: string | null;
  numericValue: number | null;
  amountAdded: number | null;
  comment: string;
  checkedAt: string | null;
  photos?: string[];   // per-item photo URLs
};
type ItemState = Record<string, ItemValue>;
type CategoryComments = Record<string, string>;
type RepeatableState = Record<string, { id: string; value: number | null; comment: string; checkedAt: string | null }[]>;

interface PhotoEntry {
  url: string;
  caption: string;
  itemKey?: string;
}

const blank = (): ItemValue => ({
  status: null,
  numericValue: null,
  amountAdded: null,
  comment: "",
  checkedAt: null,
});

export default function TruckCheckForm() {
  const router = useRouter();

  // Timer
  const [startedAt] = useState<string>(() => new Date().toISOString());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  // Truck + crew
  const [truckNumber, setTruckNumber] = useState<string>("3935");
  const [attendantSignature, setAttendantSignature] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");

  // Additional attendants — picked from the roster, each signs their own pad.
  type Attendant = { id: string | null; name: string; signature: string };
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [roster, setRoster] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  useEffect(() => {
    fetch("/api/lounge/roster")
      .then((r) => r.ok ? r.json() : { employees: [] })
      .then((d) => setRoster(d.employees ?? []))
      .catch(() => setRoster([]));
  }, []);
  function addAttendant() {
    setAttendants((s) => [...s, { id: null, name: "", signature: "" }]);
  }
  function patchAttendant(idx: number, patch: Partial<Attendant>) {
    setAttendants((s) => s.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  }
  function removeAttendant(idx: number) {
    setAttendants((s) => s.filter((_, i) => i !== idx));
  }

  const unit: UnitSpec = useMemo(() => unitOrFallback(truckNumber), [truckNumber]);
  const template: CategoryDef[] = useMemo(() => buildTemplate(unit), [unit]);

  // Expanded categories
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const c of template) map[c.category] = true;
    return map;
  });

  // Item state — initialize an empty value per item (tire_psi expands per position).
  const [items, setItems] = useState<ItemState>(() => init(template, unit));
  const [categoryComments, setCategoryComments] = useState<CategoryComments>({});
  const [repeatables, setRepeatables] = useState<RepeatableState>(() => initRepeatables(template));
  const [refillRequest, setRefillRequest] = useState("");

  // When unit changes, rebuild state so tire positions match
  useEffect(() => {
    const next = buildTemplate(unit);
    setItems(init(next, unit));
    setRepeatables(initRepeatables(next));
    setExpanded((s) => {
      const updated = { ...s };
      for (const c of next) updated[c.category] ??= true;
      return updated;
    });
  }, [unit]);

  // Photos
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function patchItem(key: string, patch: Partial<ItemValue>) {
    setItems((s) => ({
      ...s,
      [key]: {
        ...(s[key] ?? blank()),
        ...patch,
        checkedAt: new Date().toISOString(),
      },
    }));
  }

  function addItemPhoto(itemKey: string, url: string) {
    setItems((s) => {
      const cur = s[itemKey] ?? blank();
      return { ...s, [itemKey]: { ...cur, photos: [...(cur.photos ?? []), url], checkedAt: new Date().toISOString() } };
    });
  }
  function removeItemPhoto(itemKey: string, url: string) {
    setItems((s) => {
      const cur = s[itemKey] ?? blank();
      return { ...s, [itemKey]: { ...cur, photos: (cur.photos ?? []).filter((u) => u !== url) } };
    });
  }

  function addRepeatable(itemKey: string) {
    setRepeatables((s) => ({
      ...s,
      [itemKey]: [...(s[itemKey] ?? []), { id: cryptoRandomId(), value: null, comment: "", checkedAt: null }],
    }));
  }
  function patchRepeatable(itemKey: string, id: string, patch: Partial<{ value: number | null; comment: string }>) {
    setRepeatables((s) => ({
      ...s,
      [itemKey]: (s[itemKey] ?? []).map((e) => e.id === id ? { ...e, ...patch, checkedAt: new Date().toISOString() } : e),
    }));
  }
  function removeRepeatable(itemKey: string, id: string) {
    setRepeatables((s) => ({
      ...s,
      [itemKey]: (s[itemKey] ?? []).filter((e) => e.id !== id),
    }));
  }

  async function pickPhoto(useCamera: boolean) {
    const el = fileInputRef.current;
    if (!el) return;
    el.capture = useCamera ? "environment" : "";
    el.accept = "image/*";
    el.value = "";
    el.click();
  }

  async function onFileChosen(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingPhoto(true);
    try {
      for (const f of Array.from(files)) {
        const form = new FormData();
        form.append("file", f);
        const r = await fetch("/api/truckcheck/photo", { method: "POST", body: form });
        if (r.ok) {
          const d = await r.json();
          setPhotos((s) => [...s, { url: d.url, caption: f.name }]);
        }
      }
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!truckNumber.trim()) return setError("Truck number required.");

    // Build the flat item list with abnormal flags so the server gets
    // exactly what it persists. Tire PSI is exploded into one entry per
    // position. Repeatable numerics are exploded into one entry per
    // attached unit.
    const payloadItems = flattenForSubmit(template, unit, items, repeatables);

    // Client-side guardrails (matches what the server flags).
    for (const i of payloadItems) {
      if (i.requireComment && !i.comment.trim()) {
        return setError(`${i.label}: explanation required.`);
      }
      if (i.requireAmount && (i.amountAdded === null || i.amountAdded <= 0)) {
        return setError(`${i.label}: please enter the amount added.`);
      }
      if (i.requireNumeric && i.numericValue === null) {
        return setError(`${i.label}: numeric value required.`);
      }
    }

    setSubmitting(true);
    const res = await fetch("/api/truckcheck/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        truckNumber,
        unitNumber: truckNumber,
        attendant1Signature: attendantSignature,
        // Legacy fields — first additional attendant is also reported as
        // attendant2 to keep the form_submissions schema happy.
        attendant2Name: attendants[0]?.name ?? "",
        attendant2Signature: attendants[0]?.signature ?? "",
        // New: full attendant list (each gets a signature line on the PDF).
        attendants: attendants
          .filter((a) => a.name.trim().length > 0)
          .map((a) => ({ id: a.id, name: a.name.trim(), signature: a.signature })),
        startedAt,
        submittedAt: new Date().toISOString(),
        durationSeconds: elapsed,
        notes: generalNotes,
        categoryComments,
        refillRequest: refillRequest.trim() || null,
        items: payloadItems.map(({ requireComment, requireAmount, requireNumeric, ...rest }) => {
          void requireComment; void requireAmount; void requireNumeric;
          return rest;
        }),
        photos,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Submission failed.");
      return;
    }
    router.push("/truckcheck/submitted");
  }

  const abnormalCount = countAbnormal(template, unit, items, repeatables);
  const failCount = countFails(template, unit, items, repeatables);

  return (
    <>
      {/* Floating timer */}
      <FloatingTimer elapsed={elapsed} unit={unit.name} />

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 22, paddingTop: 80 }}>

        {/* Crew & truck */}
        <Card title="Crew & Unit">
          <FieldRow>
            <Field label="Unit" required>
              <select value={truckNumber} onChange={(e) => setTruckNumber(e.target.value)} style={inp}>
                {UNITS.map((u) => (
                  <option key={u.number} value={u.number}>{u.name} — {u.description}</option>
                ))}
              </select>
            </Field>
          </FieldRow>

          {/* Additional attendants */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span style={{ color: "#f0b429", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                Additional attendants ({attendants.length})
              </span>
              <button type="button" onClick={addAttendant} style={addAttendantBtn}>
                + Add attendant
              </button>
            </div>
            {attendants.length === 0 && (
              <p style={{ color: "#64748b", fontSize: 12, margin: "6px 0 0" }}>
                You&apos;re signing as attendant 1. Use this to add anyone else who walked the truck with you — each picks their name and signs.
              </p>
            )}
            {attendants.map((a, i) => (
              <div key={i} style={{ marginTop: 12, padding: 12, background: "#040d1a", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                  <select
                    value={a.id ?? ""}
                    onChange={(e) => {
                      const emp = roster.find((r) => r.id === e.target.value);
                      patchAttendant(i, {
                        id: emp?.id ?? null,
                        name: emp ? `${emp.firstName} ${emp.lastName}` : a.name,
                      });
                    }}
                    style={{ ...inp, maxWidth: 320 }}
                  >
                    <option value="">— Pick name —</option>
                    {roster.map((r) => (
                      <option key={r.id} value={r.id}>{r.firstName} {r.lastName}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => removeAttendant(i)} style={{ background: "transparent", border: 0, color: "#fca5a5", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                    Remove
                  </button>
                </div>
                {a.name ? (
                  <SignaturePad label={`Signature — ${a.name}`} value={a.signature} onChange={(s) => patchAttendant(i, { signature: s })} />
                ) : (
                  <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>Pick a name to enable the signature pad.</p>
                )}
              </div>
            ))}
          </div>
        </Card>

        {template.map((cat) => (
          <Category
            key={cat.category}
            cat={cat}
            unit={unit}
            items={items}
            repeatables={repeatables}
            categoryComment={categoryComments[cat.category] ?? ""}
            onCategoryComment={(v) => setCategoryComments((s) => ({ ...s, [cat.category]: v }))}
            expanded={expanded[cat.category] !== false}
            onToggle={() => setExpanded((s) => ({ ...s, [cat.category]: s[cat.category] === false }))}
            onPatch={patchItem}
            onAddRepeat={addRepeatable}
            onPatchRepeat={patchRepeatable}
            onRemoveRepeat={removeRepeatable}
            onAddItemPhoto={addItemPhoto}
            onRemoveItemPhoto={removeItemPhoto}
          />
        ))}

        <Card title="Vehicle Equipment / Maintenance Refill Request">
          <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 0, marginBottom: 10 }}>
            List anything we need to order, refill, repair, or restock. This goes straight to
            management on the report.
          </p>
          <textarea
            value={refillRequest}
            onChange={(e) => setRefillRequest(e.target.value)}
            rows={5}
            placeholder="e.g. 1x case of 4x4 gauze, 2x adult NRB masks, BP cuff replacement, wash truck this week, etc."
            style={{ ...inp, resize: "vertical", minHeight: 110 }}
          />
        </Card>

        {/* Photos */}
        <Card title={`Photos (${photos.length})`}>
          <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 0, marginBottom: 12 }}>
            Snap evidence of fluid levels, damage, low PSI, or anything you flagged for follow-up.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={() => pickPhoto(true)}  style={photoBtn} disabled={uploadingPhoto}>📷 Take photo</button>
            <button type="button" onClick={() => pickPhoto(false)} style={photoBtn} disabled={uploadingPhoto}>📁 Upload photo</button>
            {uploadingPhoto && <span style={{ color: "#f0b429", alignSelf: "center", fontSize: 13 }}>Uploading…</span>}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={(e) => onFileChosen(e.target.files)}
          />
          {photos.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginTop: 14 }}>
              {photos.map((p, i) => (
                <div key={p.url} style={{ background: "#040d1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 8 }}>
                  <img src={p.url} alt="" style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 6, display: "block" }} />
                  <input
                    value={p.caption}
                    onChange={(e) => setPhotos((s) => s.map((q, j) => (j === i ? { ...q, caption: e.target.value } : q)))}
                    placeholder="Caption"
                    style={{ ...inp, marginTop: 6, padding: "8px 10px", fontSize: 12 }}
                  />
                  <button
                    type="button"
                    onClick={() => setPhotos((s) => s.filter((_, j) => j !== i))}
                    style={{ marginTop: 6, background: "transparent", border: 0, color: "#fca5a5", fontSize: 11, fontWeight: 800, cursor: "pointer", padding: 0 }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Notes */}
        <Card title="General Notes">
          <textarea
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            rows={4}
            placeholder="Anything else worth flagging?"
            style={{ ...inp, resize: "vertical", minHeight: 100 }}
          />
        </Card>

        {/* Signatures */}
        <Card title="Signatures">
          <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.55, margin: "0 0 14px", background: "rgba(240,180,41,0.06)", border: "1px solid rgba(240,180,41,0.20)", borderRadius: 10, padding: "12px 14px" }}>
            <strong style={{ color: "#f0b429" }}>Certification:</strong> By signing below, I confirm that the
            information I have provided is true, accurate, and complete to the best of my knowledge. I understand
            that this information may be used for documentation, verification, scheduling, credentialing,
            administrative, or operational purposes. If any information changes or if I later realize something
            needs to be corrected, I agree to notify the organization as soon as reasonably possible.
          </p>
          <div style={{ display: "grid", gap: 22 }}>
            <SignaturePad label="Attendant 1 (you)" value={attendantSignature} onChange={setAttendantSignature} />
            {attendants.filter((a) => a.name.trim().length > 0).length > 0 && (
              <div style={{ color: "#64748b", fontSize: 12 }}>
                Additional attendant signatures are captured above in the Crew &amp; Unit section.
              </div>
            )}
          </div>
        </Card>

        {/* Summary */}
        <Card title="Submission Summary">
          <SummaryRow label="Elapsed" value={fmtTime(elapsed)} />
          <SummaryRow label="Unit" value={unit.name} />
          <SummaryRow label="Items abnormal" value={abnormalCount.toString()} bad={abnormalCount > 0} />
          <SummaryRow label="Items failed" value={failCount.toString()} bad={failCount > 0} />
          <SummaryRow label="Photos attached" value={photos.length.toString()} />
        </Card>

        {error && (
          <div style={{ padding: 14, borderRadius: 12, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.45)", color: "#fecaca", fontWeight: 600 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "20px 24px",
            borderRadius: 16,
            background: submitting ? "#a07a1c" : "#f0b429",
            color: "#040d1a",
            fontWeight: 900,
            fontSize: 18,
            letterSpacing: "0.04em",
            border: 0,
            cursor: submitting ? "default" : "pointer",
            touchAction: "manipulation",
          }}
        >
          {submitting ? "Submitting…" : `Submit Truck Check (${fmtTime(elapsed)})`}
        </button>
      </form>
    </>
  );
}

// ── Floating timer ───────────────────────────────────────────────────────

function FloatingTimer({ elapsed, unit }: { elapsed: number; unit: string }) {
  return (
    <div
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top, 0px) + 14px)",
        left: 14,
        zIndex: 50,
        background: "rgba(4,13,26,0.92)",
        backdropFilter: "saturate(180%) blur(10px)",
        WebkitBackdropFilter: "saturate(180%) blur(10px)",
        border: "1px solid rgba(240,180,41,0.45)",
        borderRadius: 14,
        padding: "8px 12px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: 0,
      }}
      aria-live="polite"
    >
      <div
        aria-hidden
        style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px rgba(34,197,94,0.8)" }}
      />
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
        <span style={{ color: "#f0b429", fontSize: 9, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          {unit} · Truck Check Timer
        </span>
        <span style={{ color: "white", fontWeight: 900, fontSize: 20, fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em" }}>
          {fmtTime(elapsed)}
        </span>
      </div>
    </div>
  );
}

// ── Category section ────────────────────────────────────────────────────

function Category({
  cat, unit, items, repeatables, categoryComment, onCategoryComment, expanded, onToggle, onPatch,
  onAddRepeat, onPatchRepeat, onRemoveRepeat, onAddItemPhoto, onRemoveItemPhoto,
}: {
  cat: CategoryDef;
  unit: UnitSpec;
  items: ItemState;
  repeatables: RepeatableState;
  categoryComment: string;
  onCategoryComment: (v: string) => void;
  expanded: boolean;
  onToggle: () => void;
  onPatch: (key: string, patch: Partial<ItemValue>) => void;
  onAddRepeat: (itemKey: string) => void;
  onPatchRepeat: (itemKey: string, id: string, patch: Partial<{ value: number | null; comment: string }>) => void;
  onRemoveRepeat: (itemKey: string, id: string) => void;
  onAddItemPhoto: (itemKey: string, url: string) => void;
  onRemoveItemPhoto: (itemKey: string, url: string) => void;
}) {
  return (
    <section style={card}>
      <button
        type="button"
        onClick={onToggle}
        style={{ background: "transparent", border: 0, padding: 0, color: "white", display: "flex", alignItems: "baseline", justifyContent: "space-between", width: "100%", cursor: "pointer", fontFamily: "inherit" }}
      >
        <h2 style={{ ...cardTitle, marginBottom: 0 }}>{cat.category}</h2>
        <span style={{ color: "#94a3b8", fontSize: 12, letterSpacing: "0.1em" }}>{expanded ? "▼" : "▶"}</span>
      </button>
      {cat.description && <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 8, marginBottom: 0 }}>{cat.description}</p>}
      {expanded && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
            {cat.items.map((it) => (
              <ItemRow
                key={it.itemKey}
                item={it}
                unit={unit}
                items={items}
                repeatables={repeatables}
                onPatch={onPatch}
                onAddRepeat={onAddRepeat}
                onPatchRepeat={onPatchRepeat}
                onRemoveRepeat={onRemoveRepeat}
                onAddItemPhoto={onAddItemPhoto}
                onRemoveItemPhoto={onRemoveItemPhoto}
              />
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={{ display: "block", color: "#f0b429", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>
              Section comments
            </label>
            <textarea
              value={categoryComment}
              onChange={(e) => onCategoryComment(e.target.value)}
              rows={2}
              placeholder={`Anything else about ${cat.category}?`}
              style={{ ...inp, resize: "vertical", minHeight: 56, fontSize: 14 }}
            />
          </div>
        </>
      )}
    </section>
  );
}

function ItemRow({
  item, unit, items, repeatables, onPatch,
  onAddRepeat, onPatchRepeat, onRemoveRepeat, onAddItemPhoto, onRemoveItemPhoto,
}: {
  item: ChecklistItem;
  unit: UnitSpec;
  items: ItemState;
  repeatables: RepeatableState;
  onPatch: (key: string, patch: Partial<ItemValue>) => void;
  onAddRepeat: (itemKey: string) => void;
  onPatchRepeat: (itemKey: string, id: string, patch: Partial<{ value: number | null; comment: string }>) => void;
  onRemoveRepeat: (itemKey: string, id: string) => void;
  onAddItemPhoto: (itemKey: string, url: string) => void;
  onRemoveItemPhoto: (itemKey: string, url: string) => void;
}) {
  const v = items[item.itemKey] ?? blank();
  const photoStrip = item.responseType !== "tire_psi" && item.responseType !== "repeatable_numeric" ? (
    <PhotoStrip photos={v.photos ?? []} itemKey={item.itemKey} onAdd={onAddItemPhoto} onRemove={onRemoveItemPhoto} />
  ) : null;

  switch (item.responseType) {
    case "passfail":   return <Wrap photos={photoStrip}><PassFailRow item={item}  value={v} onPatch={onPatch} /></Wrap>;
    case "status":     return <Wrap photos={photoStrip}><StatusRow   item={item}  value={v} onPatch={onPatch} /></Wrap>;
    case "fluid":      return <Wrap photos={photoStrip}><FluidRow    item={item}  value={v} onPatch={onPatch} /></Wrap>;
    case "numeric":
      if (item.itemKey === "fridge_temp") {
        return <Wrap photos={photoStrip}><FridgeTempRow item={item} value={v} onPatch={onPatch} /></Wrap>;
      }
      return <Wrap photos={photoStrip}><NumericRow  item={item}  value={v} onPatch={onPatch} /></Wrap>;
    case "tire_psi":   return <TirePsiRow  unit={unit}  items={items} onPatch={onPatch} />;
    case "stock":      return <Wrap photos={photoStrip}><StockRow    item={item}  value={v} onPatch={onPatch} /></Wrap>;
    case "repeatable_numeric":
      return <RepeatableNumericRow item={item} entries={repeatables[item.itemKey] ?? []} onAdd={onAddRepeat} onPatch={onPatchRepeat} onRemove={onRemoveRepeat} />;
  }
}

function Wrap({ photos, children }: { photos: React.ReactNode; children: React.ReactNode }) {
  return <div>{children}{photos}</div>;
}

function PassFailRow({ item, value, onPatch }: { item: PassFailItem; value: ItemValue; onPatch: (key: string, patch: Partial<ItemValue>) => void }) {
  const opts = ["Pass", "Issue Noted", "Fail", "N/A"];
  return (
    <ItemFrame label={item.label} status={value.status}>
      <PillGroup options={opts} value={value.status} onChange={(v) => onPatch(item.itemKey, { status: v })} />
      {(value.status === "Fail" || value.status === "Issue Noted") && (
        <CommentInput value={value.comment} onChange={(v) => onPatch(item.itemKey, { comment: v })} placeholder="What's wrong?" required />
      )}
    </ItemFrame>
  );
}

function StatusRow({ item, value, onPatch }: { item: StatusItem; value: ItemValue; onPatch: (key: string, patch: Partial<ItemValue>) => void }) {
  return (
    <ItemFrame label={item.label} status={value.status}>
      <PillGroup options={item.statuses.slice()} value={value.status} onChange={(v) => onPatch(item.itemKey, { status: v })} />
      {value.status && item.commentRequiredOn.includes(value.status) && (
        <CommentInput value={value.comment} onChange={(v) => onPatch(item.itemKey, { comment: v })} placeholder="Detail" required />
      )}
    </ItemFrame>
  );
}

function FluidRow({ item, value, onPatch }: { item: FluidItem; value: ItemValue; onPatch: (key: string, patch: Partial<ItemValue>) => void }) {
  return (
    <ItemFrame label={item.label} status={value.status}>
      <PillGroup options={item.statuses.slice()} value={value.status} onChange={(v) => onPatch(item.itemKey, { status: v })} />
      {value.status && item.amountRequiredOn.includes(value.status) && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
          <input
            type="number"
            inputMode="decimal"
            placeholder="Amount added"
            value={value.amountAdded ?? ""}
            onChange={(e) => onPatch(item.itemKey, { amountAdded: e.target.value === "" ? null : Number(e.target.value) })}
            style={{ ...inp, maxWidth: 160 }}
          />
          <span style={{ color: "#94a3b8", fontSize: 13 }}>{item.amountUnit ?? ""}</span>
        </div>
      )}
      {value.status && item.commentRequiredOn.includes(value.status) && (
        <CommentInput value={value.comment} onChange={(v) => onPatch(item.itemKey, { comment: v })} placeholder="Brand / amount / leak location" required />
      )}
    </ItemFrame>
  );
}

function NumericRow({ item, value, onPatch }: { item: NumericItem; value: ItemValue; onPatch: (key: string, patch: Partial<ItemValue>) => void }) {
  const v = value.numericValue;
  const abnormal =
    v !== null && (
      (item.min !== undefined && v < item.min) ||
      (item.max !== undefined && v > item.max)
    );
  return (
    <ItemFrame label={item.label} status={abnormal ? "Abnormal" : v !== null ? "OK" : null}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          type="number"
          inputMode="decimal"
          placeholder={`Enter ${item.unitOfMeasure}`}
          value={v ?? ""}
          onChange={(e) => onPatch(item.itemKey, { numericValue: e.target.value === "" ? null : Number(e.target.value) })}
          style={{ ...inp, maxWidth: 220 }}
        />
        <span style={{ color: "#94a3b8", fontSize: 14 }}>{item.unitOfMeasure}</span>
      </div>
      {(item.min !== undefined || item.max !== undefined) && (
        <p style={{ color: "#64748b", fontSize: 11, marginTop: 6, marginBottom: 0 }}>
          Normal range {item.min ?? "?"}{item.unitOfMeasure} – {item.max ?? "?"}{item.unitOfMeasure}
        </p>
      )}
      {abnormal && (
        <CommentInput value={value.comment} onChange={(v) => onPatch(item.itemKey, { comment: v })} placeholder="Why is this out of range?" required />
      )}
    </ItemFrame>
  );
}

function TirePsiRow({ unit, items, onPatch }: { unit: UnitSpec; items: ItemState; onPatch: (key: string, patch: Partial<ItemValue>) => void }) {
  return (
    <ItemFrame label={`Tire pressures (${unit.dually ? "6 positions — dually" : "4 positions"})`}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 4 }}>
        {unit.tires.map((tp) => {
          const v = items[`tire_${tp.key}`]?.numericValue ?? null;
          const abnormal = v !== null && (v < tp.minPsi || v > tp.maxPsi);
          return (
            <div key={tp.key} style={{ background: "#040d1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ color: "#cbd5e1", fontWeight: 700, fontSize: 14 }}>{tp.label}</span>
                <span style={{ color: "#64748b", fontSize: 11 }}>{tp.minPsi}–{tp.maxPsi} psi</span>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="psi"
                  value={v ?? ""}
                  onChange={(e) => onPatch(`tire_${tp.key}`, {
                    numericValue: e.target.value === "" ? null : Number(e.target.value),
                    status: e.target.value === "" ? null : (Number(e.target.value) < tp.minPsi || Number(e.target.value) > tp.maxPsi) ? "Abnormal" : "OK",
                  })}
                  style={{ ...inp, padding: "10px 12px", fontSize: 16 }}
                />
                {abnormal && <span style={{ color: "#fca5a5", fontSize: 12, fontWeight: 800 }}>!</span>}
              </div>
              {abnormal && (
                <CommentInput
                  value={items[`tire_${tp.key}`]?.comment ?? ""}
                  onChange={(c) => onPatch(`tire_${tp.key}`, { comment: c })}
                  placeholder="Added air / slow leak / unable to check…"
                  required
                  small
                />
              )}
            </div>
          );
        })}
      </div>
    </ItemFrame>
  );
}

function FridgeTempRow({ item, value, onPatch }: { item: NumericItem; value: ItemValue; onPatch: (key: string, patch: Partial<ItemValue>) => void }) {
  const v = value.numericValue;
  const inRange = v !== null && v >= (item.min ?? 36) && v <= (item.max ?? 46);
  const tooCold = v !== null && v < (item.min ?? 36);
  const tooHot = v !== null && v > (item.max ?? 46);
  const status = v === null ? null : inRange ? "In Range" : (tooCold ? "Too Cold" : "Too Hot");
  return (
    <ItemFrame label={item.label} status={status}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          placeholder={`Enter ${item.unitOfMeasure}`}
          value={v ?? ""}
          onChange={(e) => onPatch(item.itemKey, { numericValue: e.target.value === "" ? null : Number(e.target.value) })}
          style={{ ...inp, maxWidth: 180 }}
        />
        <span style={{ color: "#94a3b8", fontSize: 14 }}>{item.unitOfMeasure}</span>
        {v !== null && (
          <span style={{ fontSize: 28, lineHeight: 1 }} aria-hidden>
            {inRange ? "👍" : "👎"}
          </span>
        )}
      </div>
      <p style={{ color: "#64748b", fontSize: 11, marginTop: 6, marginBottom: 0 }}>
        Acceptable range {item.min}–{item.max} {item.unitOfMeasure}
      </p>
      {!inRange && v !== null && (
        <div style={{ marginTop: 10, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.45)", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ color: "#fca5a5", fontSize: 12, fontWeight: 900, letterSpacing: "0.10em", textTransform: "uppercase" }}>
            Notify management
          </div>
          <p style={{ color: "#fecaca", fontSize: 13, marginTop: 4, marginBottom: 0 }}>
            Refrigerator is {tooCold ? "too cold" : "too hot"}. Management will be flagged automatically on the PDF.
          </p>
          <input
            value={value.comment}
            onChange={(e) => onPatch(item.itemKey, { comment: e.target.value })}
            placeholder="Add detail (current reading, action taken)…"
            style={{ ...inp, marginTop: 8, fontSize: 13, background: "#040d1a", border: "1px solid rgba(239,68,68,0.40)" }}
          />
        </div>
      )}
    </ItemFrame>
  );
}

function RepeatableNumericRow({ item, entries, onAdd, onPatch, onRemove }: {
  item: RepeatableNumericItem;
  entries: { id: string; value: number | null; comment: string }[];
  onAdd: (itemKey: string) => void;
  onPatch: (itemKey: string, id: string, patch: Partial<{ value: number | null; comment: string }>) => void;
  onRemove: (itemKey: string, id: string) => void;
}) {
  return (
    <ItemFrame label={`${item.label} (${entries.length})`}>
      <div style={{ display: "grid", gap: 10 }}>
        {entries.length === 0 && (
          <p style={{ color: "#94a3b8", fontSize: 12, margin: 0 }}>None added. Tap below to add one.</p>
        )}
        {entries.map((e, idx) => {
          const abnormal =
            e.value !== null && (
              (item.min !== undefined && e.value < item.min) ||
              (item.max !== undefined && e.value > item.max)
            );
          return (
            <div key={e.id} style={{ background: "#040d1a", border: `1px solid ${abnormal ? "rgba(239,68,68,0.40)" : "rgba(255,255,255,0.08)"}`, borderRadius: 10, padding: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ color: "#cbd5e1", fontWeight: 700, fontSize: 13 }}>{item.entryLabel}{idx + 1}</span>
                {entries.length > 0 && (
                  <button type="button" onClick={() => onRemove(item.itemKey, e.id)} style={{ background: "transparent", border: 0, color: "#fca5a5", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
                    Remove
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder={`Enter ${item.unitOfMeasure}`}
                  value={e.value ?? ""}
                  onChange={(ev) => onPatch(item.itemKey, e.id, { value: ev.target.value === "" ? null : Number(ev.target.value) })}
                  style={{ ...inp, padding: "10px 12px", fontSize: 16 }}
                />
                <span style={{ color: "#94a3b8", fontSize: 13 }}>{item.unitOfMeasure}</span>
              </div>
              {(item.min !== undefined || item.max !== undefined) && (
                <p style={{ color: "#64748b", fontSize: 11, marginTop: 6, marginBottom: 0 }}>
                  Normal range {item.min ?? "?"}–{item.max ?? "?"} {item.unitOfMeasure}
                </p>
              )}
              {abnormal && (
                <CommentInput value={e.comment} onChange={(c) => onPatch(item.itemKey, e.id, { comment: c })} placeholder="Why is this out of range?" required small />
              )}
            </div>
          );
        })}
      </div>
      <button type="button" onClick={() => onAdd(item.itemKey)} style={{ ...addAttendantBtn, marginTop: 10 }}>
        {item.addButtonLabel}
      </button>
    </ItemFrame>
  );
}

function PhotoStrip({ photos, itemKey, onAdd, onRemove }: { photos: string[]; itemKey: string; onAdd: (itemKey: string, url: string) => void; onRemove: (itemKey: string, url: string) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  async function pick() {
    const el = inputRef.current;
    if (!el) return;
    el.value = "";
    el.click();
  }
  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const form = new FormData();
        form.append("file", f);
        const r = await fetch("/api/truckcheck/photo", { method: "POST", body: form });
        if (r.ok) {
          const d = await r.json();
          onAdd(itemKey, d.url);
        }
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed rgba(255,255,255,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="button" onClick={pick} style={{ ...secondaryBtn, fontSize: 11 }} disabled={uploading}>
          {uploading ? "Uploading…" : "📷 Add photo"}
        </button>
        {photos.length > 0 && (
          <span style={{ color: "#94a3b8", fontSize: 11 }}>{photos.length} attached</span>
        )}
        <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple style={{ display: "none" }} onChange={(e) => onFiles(e.target.files)} />
      </div>
      {photos.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {photos.map((u) => (
            <div key={u} style={{ position: "relative", width: 70, height: 70, borderRadius: 8, overflow: "hidden", background: "#040d1a", border: "1px solid rgba(255,255,255,0.10)" }}>
              <img src={u} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button type="button" onClick={() => onRemove(itemKey, u)} style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.6)", border: 0, color: "white", padding: "1px 6px", borderRadius: 6, fontSize: 10, fontWeight: 800, cursor: "pointer" }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StockRow({ item, value, onPatch }: { item: StockItem; value: ItemValue; onPatch: (key: string, patch: Partial<ItemValue>) => void }) {
  const opts = ["Stocked", "Low", "Missing", "Restocked", "Expired", "Not Checked"];
  return (
    <ItemFrame label={item.label} status={value.status}>
      <PillGroup options={opts} value={value.status} onChange={(v) => onPatch(item.itemKey, { status: v })} />
      {value.status === "Restocked" && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
          <input
            type="number"
            inputMode="decimal"
            placeholder="Qty added"
            value={value.amountAdded ?? ""}
            onChange={(e) => onPatch(item.itemKey, { amountAdded: e.target.value === "" ? null : Number(e.target.value) })}
            style={{ ...inp, maxWidth: 160 }}
          />
          <span style={{ color: "#94a3b8", fontSize: 13 }}>{item.amountUnit ?? "items"}</span>
        </div>
      )}
      {value.status && ["Low", "Missing", "Restocked", "Expired"].includes(value.status) && (
        <CommentInput value={value.comment} onChange={(v) => onPatch(item.itemKey, { comment: v })} placeholder="Detail" required={value.status !== "Restocked"} />
      )}
    </ItemFrame>
  );
}

// ── Primitives ──────────────────────────────────────────────────────────

function ItemFrame({ label, status, children }: { label: string; status?: string | null; children: React.ReactNode }) {
  const tone =
    status === "Pass" || status === "Yes" || status === "Full" || status === "OK" || status === "Verified" || status === "Match" || status === "Complete" || status === "Present" || status === "All In Date" || status === "In Range" || status === "Good" || status === "Clean" || status === "Stocked" ? "ok"
    : status === "Fail" || status === "Missing" || status === "Empty" || status === "Discrepancy" || status === "Expired Found" || status === "Out of Range" || status === "Damage Noted" || status === "Mismatch" || status === "Abnormal" || status === "Issue" ? "bad"
    : status === "Filled" || status === "Added Oil" || status === "Restocked" ? "filled"
    : status ? "warn"
    : "neutral";
  const bg = tone === "ok" ? "rgba(34,197,94,0.08)" : tone === "bad" ? "rgba(239,68,68,0.10)" : tone === "filled" ? "rgba(240,180,41,0.08)" : tone === "warn" ? "rgba(249,115,22,0.10)" : "#040d1a";
  const border = tone === "ok" ? "rgba(34,197,94,0.30)" : tone === "bad" ? "rgba(239,68,68,0.45)" : tone === "filled" ? "rgba(240,180,41,0.35)" : tone === "warn" ? "rgba(249,115,22,0.40)" : "rgba(255,255,255,0.08)";
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <span style={{ color: "white", fontWeight: 700, fontSize: 15 }}>{label}</span>
        {status && (
          <span style={{ color: tone === "ok" ? "#22c55e" : tone === "bad" ? "#fca5a5" : tone === "filled" ? "#f0b429" : "#fdba74", fontSize: 11, fontWeight: 900, letterSpacing: "0.10em", textTransform: "uppercase" }}>
            {status}
          </span>
        )}
      </div>
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}

function PillGroup({ options, value, onChange }: { options: string[]; value: string | null; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((o) => {
        const active = value === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            style={{
              padding: "10px 14px",
              borderRadius: 999,
              background: active ? "#f0b429" : "rgba(255,255,255,0.06)",
              color: active ? "#040d1a" : "#cbd5e1",
              border: `1px solid ${active ? "#f0b429" : "rgba(255,255,255,0.10)"}`,
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              touchAction: "manipulation",
              fontFamily: "inherit",
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function CommentInput({ value, onChange, placeholder, required, small }: { value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; small?: boolean }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={(required ? "Required — " : "") + (placeholder ?? "Comment")}
      style={{
        ...inp,
        marginTop: 8,
        background: required && !value ? "rgba(239,68,68,0.06)" : "#040d1a",
        border: `1px solid ${required && !value ? "rgba(239,68,68,0.45)" : "rgba(255,255,255,0.12)"}`,
        fontSize: small ? 13 : 14,
        padding: small ? "8px 10px" : "10px 12px",
      }}
    />
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={card}>
      <h2 style={cardTitle}>{title}</h2>
      <div>{children}</div>
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", flex: 1, minWidth: 0 }}>
      <div style={{ color: "#f0b429", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>
        {label}{required && <span style={{ color: "#fca5a5", marginLeft: 4 }}>*</span>}
      </div>
      {children}
    </label>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>{children}</div>;
}

function SummaryRow({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ color: "#94a3b8", fontSize: 13 }}>{label}</span>
      <span style={{ color: bad ? "#fca5a5" : "white", fontWeight: 800, fontSize: 14 }}>{value}</span>
    </div>
  );
}

// ── Build helpers ───────────────────────────────────────────────────────

const secondaryBtn: React.CSSProperties = {
  background: "transparent",
  color: "#cbd5e1",
  border: "1px solid rgba(255,255,255,0.10)",
  padding: "6px 12px",
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: "inherit",
};

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function init(template: CategoryDef[], unit: UnitSpec): ItemState {
  const map: ItemState = {};
  for (const cat of template) {
    for (const it of cat.items) {
      if (it.responseType === "tire_psi") {
        for (const tp of unit.tires) map[`tire_${tp.key}`] = blank();
      } else if (it.responseType === "repeatable_numeric") {
        // Repeatable lives in a separate state map; ItemState stays empty for it.
        continue;
      } else {
        map[it.itemKey] = blank();
      }
    }
  }
  return map;
}

function initRepeatables(template: CategoryDef[]): RepeatableState {
  const map: RepeatableState = {};
  for (const cat of template) {
    for (const it of cat.items) {
      if (it.responseType === "repeatable_numeric") {
        const count = it.defaultCount > 0 ? it.defaultCount : 1;
        map[it.itemKey] = Array.from({ length: count }, () => ({
          id: cryptoRandomId(),
          value: null,
          comment: "",
          checkedAt: null,
        }));
      }
    }
  }
  return map;
}

function countAbnormal(template: CategoryDef[], unit: UnitSpec, items: ItemState, repeatables: RepeatableState): number {
  return flattenForSubmit(template, unit, items, repeatables).filter((i) => i.isAbnormal).length;
}
function countFails(template: CategoryDef[], unit: UnitSpec, items: ItemState, repeatables: RepeatableState): number {
  return flattenForSubmit(template, unit, items, repeatables).filter((i) => i.status === "Fail" || i.status === "Missing" || i.status === "Discrepancy" || i.status === "Expired Found" || i.status === "Out of Range" || i.status === "Too Cold" || i.status === "Too Hot").length;
}

interface FlatItem {
  itemKey: string;
  label: string;
  category: string;
  responseType: string;
  status: string | null;
  numericValue: number | null;
  unitOfMeasure: string | null;
  amountAdded: number | null;
  amountUnit: string | null;
  comment: string;
  photos: string[];
  isAbnormal: boolean;
  requiresFollowUp: boolean;
  trendGroup: string | null;
  checkedAt: string;
  // client-only validation hints (stripped before send)
  requireComment: boolean;
  requireAmount: boolean;
  requireNumeric: boolean;
}

function flattenForSubmit(template: CategoryDef[], unit: UnitSpec, items: ItemState, repeatables: RepeatableState): FlatItem[] {
  const out: FlatItem[] = [];
  const now = new Date().toISOString();
  for (const cat of template) {
    for (const it of cat.items) {
      if (it.responseType === "tire_psi") {
        for (const tp of unit.tires) {
          const key = `tire_${tp.key}`;
          const v = items[key];
          if (!v) continue;
          const numericValue = v.numericValue;
          const abnormal = numericValue !== null && (numericValue < tp.minPsi || numericValue > tp.maxPsi);
          out.push({
            itemKey: key,
            label: `${tp.label} tire PSI`,
            category: "Tires",
            responseType: "tire_psi",
            status: numericValue === null ? null : abnormal ? "Abnormal" : "OK",
            numericValue,
            unitOfMeasure: "psi",
            amountAdded: null,
            amountUnit: null,
            comment: v.comment,
            photos: v.photos ?? [],
            isAbnormal: !!abnormal,
            requiresFollowUp: !!abnormal,
            trendGroup: "tire_psi",
            checkedAt: v.checkedAt ?? now,
            requireComment: !!abnormal,
            requireAmount: false,
            requireNumeric: false,
          });
        }
        continue;
      }
      if (it.responseType === "repeatable_numeric") {
        const list = repeatables[it.itemKey] ?? [];
        for (let i = 0; i < list.length; i++) {
          const e = list[i];
          const abnormal = e.value !== null && (
            (it.min !== undefined && e.value < it.min) ||
            (it.max !== undefined && e.value > it.max)
          );
          out.push({
            itemKey: `${it.itemKey}_${i + 1}`,
            label: `${it.entryLabel}${i + 1}`,
            category: it.category,
            responseType: "numeric",
            status: e.value === null ? null : abnormal ? "Abnormal" : "OK",
            numericValue: e.value,
            unitOfMeasure: it.unitOfMeasure,
            amountAdded: null,
            amountUnit: null,
            comment: e.comment,
            photos: [],
            isAbnormal: !!abnormal,
            requiresFollowUp: !!abnormal,
            trendGroup: it.trendGroup ?? null,
            checkedAt: e.checkedAt ?? now,
            requireComment: !!abnormal,
            requireAmount: false,
            requireNumeric: i === 0 && list.length === 1 ? false : false,
          });
        }
        continue;
      }
      const v = items[it.itemKey] ?? blank();
      let abnormal = false;
      let requireComment = false;
      let requireAmount = false;
      let requireNumeric = false;
      let numericVal: number | null = v.numericValue;
      let unitOfMeasure: string | null = null;
      let amountUnit: string | null = null;

      if (it.responseType === "passfail") {
        abnormal = v.status === "Fail" || v.status === "Issue Noted";
        requireComment = (it as PassFailItem).failComment === true && (v.status === "Fail" || v.status === "Issue Noted");
      } else if (it.responseType === "status") {
        const si = it as StatusItem;
        if (v.status && si.commentRequiredOn.includes(v.status)) {
          requireComment = true;
          abnormal = true;
        }
      } else if (it.responseType === "fluid") {
        const fi = it as FluidItem;
        amountUnit = fi.amountUnit ?? null;
        if (v.status && fi.commentRequiredOn.includes(v.status)) requireComment = true;
        if (v.status && fi.amountRequiredOn.includes(v.status)) requireAmount = true;
        if (v.status && !["Full", "Not Checked", "Not Applicable", "N/A"].includes(v.status)) abnormal = true;
      } else if (it.responseType === "numeric") {
        const ni = it as NumericItem;
        unitOfMeasure = ni.unitOfMeasure;
        if (ni.required && numericVal === null) requireNumeric = true;
        if (numericVal !== null) {
          if (ni.min !== undefined && numericVal < ni.min) { abnormal = true; requireComment = true; }
          if (ni.max !== undefined && numericVal > ni.max) { abnormal = true; requireComment = true; }
        }
      } else if (it.responseType === "stock") {
        const si = it as StockItem;
        amountUnit = si.amountUnit ?? null;
        if (v.status && ["Low", "Missing", "Expired"].includes(v.status)) { abnormal = true; requireComment = true; }
        if (v.status === "Restocked") requireAmount = true;
      }

      // Special: fridge_temp gets a derived status pill (In Range / Too Cold / Too Hot)
      let status: string | null = v.status;
      if (it.itemKey === "fridge_temp" && numericVal !== null) {
        const ni = it as NumericItem;
        if (ni.min !== undefined && numericVal < ni.min) status = "Too Cold";
        else if (ni.max !== undefined && numericVal > ni.max) status = "Too Hot";
        else status = "In Range";
      }

      out.push({
        itemKey: it.itemKey,
        label: it.label,
        category: it.category,
        responseType: it.responseType,
        status,
        numericValue: numericVal,
        unitOfMeasure,
        amountAdded: v.amountAdded,
        amountUnit,
        comment: v.comment,
        photos: v.photos ?? [],
        isAbnormal: abnormal,
        requiresFollowUp: abnormal,
        trendGroup: it.trendGroup ?? null,
        checkedAt: v.checkedAt ?? now,
        requireComment,
        requireAmount,
        requireNumeric,
      });
    }
  }
  return out;
}

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── Styles ──────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  padding: 20,
  borderRadius: 16,
  background: "#071428",
  border: "1px solid rgba(255,255,255,0.08)",
};
const cardTitle: React.CSSProperties = {
  color: "white",
  fontSize: 18,
  fontWeight: 900,
  marginBottom: 16,
  letterSpacing: "-0.01em",
};
const inp: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "#040d1a",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  color: "white",
  fontSize: 15,
  outline: "none",
  fontFamily: "inherit",
};
const addAttendantBtn: React.CSSProperties = {
  background: "#040d1a",
  border: "1px solid rgba(240,180,41,0.30)",
  color: "#f0b429",
  padding: "8px 12px",
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
};
const photoBtn: React.CSSProperties = {
  padding: "12px 16px",
  background: "#040d1a",
  border: "1px solid rgba(240,180,41,0.30)",
  borderRadius: 12,
  color: "#f0b429",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: "inherit",
};

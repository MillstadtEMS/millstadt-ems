"use client";

/**
 * Onboarding template editor. Admins can:
 *  - Add / rename / deactivate sections, reorder via ↑↓
 *  - Add / edit / deactivate / delete items inside a section
 *  - Toggle item flags: required, has_upload, has_expiration, has_notes,
 *    has_verification, share_save_to_file, share_email_employee,
 *    share_email_admin
 *  - Move items between sections via the section dropdown
 *
 * Changes apply to ALL new records. Existing records snapshot their
 * progress rows on creation, so newly-added items don't appear there
 * until a new record starts (this matches the user's stated intent of
 * not retroactively rewriting in-progress checklists).
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ItemRow, SectionRow } from "@/lib/lounge/onboarding/types";

export default function TemplateEditorPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ isAdmin: boolean } | null>(null);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newItemBySection, setNewItemBySection] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/lounge/me").then(async (r) => {
      if (!r.ok) { router.push("/lounge/login"); return; }
      const d = await r.json();
      if (!d.employee?.isAdmin) { router.push("/lounge"); return; }
      setMe(d.employee);
    });
  }, [router]);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/onboarding/template", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setSections(d.sections ?? []);
      setItems(d.items ?? []);
    }
  }, []);

  useEffect(() => { if (me) load(); }, [me, load]);

  const itemsBySection = useMemo(() => {
    const m = new Map<string, ItemRow[]>();
    for (const it of items) {
      if (!m.has(it.sectionId)) m.set(it.sectionId, []);
      m.get(it.sectionId)!.push(it);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.displayOrder - b.displayOrder);
    return m;
  }, [items]);

  const orderedSections = useMemo(() => [...sections].sort((a, b) => a.displayOrder - b.displayOrder), [sections]);

  async function addSection() {
    if (!newSectionTitle.trim()) return;
    const r = await fetch("/api/admin/onboarding/template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "section", title: newSectionTitle.trim() }),
    });
    if (r.ok) { setNewSectionTitle(""); load(); }
  }
  async function patchSection(id: string, patch: Partial<SectionRow>) {
    await fetch(`/api/admin/onboarding/template/sections/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    });
    load();
  }
  async function deleteSection(id: string) {
    if (!window.confirm("Delete this section and all its items? This affects future records only.")) return;
    await fetch(`/api/admin/onboarding/template/sections/${id}`, { method: "DELETE" });
    load();
  }
  async function moveSection(id: string, direction: "up" | "down") {
    const idx = orderedSections.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const other = direction === "up" ? orderedSections[idx - 1] : orderedSections[idx + 1];
    if (!other) return;
    await Promise.all([
      fetch(`/api/admin/onboarding/template/sections/${id}`,    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayOrder: other.displayOrder }) }),
      fetch(`/api/admin/onboarding/template/sections/${other.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayOrder: orderedSections[idx].displayOrder }) }),
    ]);
    load();
  }

  async function addItem(sectionId: string) {
    const label = (newItemBySection[sectionId] ?? "").trim();
    if (!label) return;
    const r = await fetch("/api/admin/onboarding/template", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "item", sectionId, label }),
    });
    if (r.ok) {
      setNewItemBySection((m) => ({ ...m, [sectionId]: "" }));
      load();
    }
  }
  async function patchItem(id: string, patch: Partial<ItemRow>) {
    await fetch(`/api/admin/onboarding/template/items/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    });
    load();
  }
  async function deleteItem(id: string) {
    if (!window.confirm("Delete this item? This affects future records only.")) return;
    await fetch(`/api/admin/onboarding/template/items/${id}`, { method: "DELETE" });
    load();
  }
  async function moveItem(item: ItemRow, direction: "up" | "down") {
    const peers = (itemsBySection.get(item.sectionId) ?? []);
    const idx = peers.findIndex((i) => i.id === item.id);
    const other = direction === "up" ? peers[idx - 1] : peers[idx + 1];
    if (!other) return;
    await Promise.all([
      fetch(`/api/admin/onboarding/template/items/${item.id}`,  { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayOrder: other.displayOrder }) }),
      fetch(`/api/admin/onboarding/template/items/${other.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayOrder: item.displayOrder }) }),
    ]);
    load();
  }

  if (!me) return <p style={{ color: "#94a3b8", padding: 22 }}>Loading…</p>;

  return (
    <div>
      <header style={{ marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <Link href="/admin/onboarding" style={{ color: "#94a3b8", fontSize: 12, textDecoration: "none", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>
            ← Onboarding
          </Link>
          <h1 style={{ margin: "6px 0 0", fontSize: "1.6rem", fontWeight: 900 }}>Onboarding template</h1>
          <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
            Edit the sections, items, sharing rules, and order of the official checklist. Changes apply to future records.
          </p>
        </div>
      </header>

      <section style={{ ...card, padding: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            placeholder="Add a new section title…"
            style={{ ...fieldStyle, flex: 1, minWidth: 200 }}
          />
          <button onClick={addSection} disabled={!newSectionTitle.trim()} style={primaryBtn}>+ Add section</button>
        </div>
      </section>

      {orderedSections.map((sec, idx) => {
        const isOpen = openSection === sec.id;
        const its = itemsBySection.get(sec.id) ?? [];
        return (
          <section key={sec.id} style={{ ...card, opacity: sec.active ? 1 : 0.55 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "14px 16px", flexWrap: "wrap" }}>
              <button onClick={() => setOpenSection(isOpen ? null : sec.id)} style={{ flex: 1, minWidth: 160, textAlign: "left" as const, background: "transparent", border: 0, color: "white", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
                <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginRight: 8 }}>Section {idx + 1}</span>
                <span style={{ fontWeight: 900, fontSize: 15 }}>{sec.title}</span>
                <span style={{ color: "#94a3b8", fontSize: 12, marginLeft: 10 }}>({its.length} items)</span>
              </button>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => moveSection(sec.id, "up")} disabled={idx === 0} style={miniBtn}>↑</button>
                <button onClick={() => moveSection(sec.id, "down")} disabled={idx === orderedSections.length - 1} style={miniBtn}>↓</button>
                <button onClick={() => patchSection(sec.id, { active: !sec.active })} style={miniBtn}>{sec.active ? "Hide" : "Show"}</button>
                <button onClick={() => deleteSection(sec.id)} style={dangerMini}>Delete</button>
              </div>
            </div>
            {isOpen && (
              <div style={{ padding: "0 16px 16px" }}>
                <div style={{ marginBottom: 10 }}>
                  <input
                    value={sec.title}
                    onChange={(e) => setSections((s) => s.map((x) => x.id === sec.id ? { ...x, title: e.target.value } : x))}
                    onBlur={(e) => { if (e.target.value !== sec.title) patchSection(sec.id, { title: e.target.value }); }}
                    style={fieldStyle}
                  />
                </div>

                {its.map((it, iIdx) => (
                  <ItemEditor
                    key={it.id}
                    item={it}
                    sections={orderedSections}
                    canMoveUp={iIdx > 0}
                    canMoveDown={iIdx < its.length - 1}
                    onPatch={(patch) => patchItem(it.id, patch)}
                    onDelete={() => deleteItem(it.id)}
                    onMove={(d) => moveItem(it, d)}
                  />
                ))}

                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input
                    value={newItemBySection[sec.id] ?? ""}
                    onChange={(e) => setNewItemBySection((m) => ({ ...m, [sec.id]: e.target.value }))}
                    placeholder="Add a checklist item…"
                    style={{ ...fieldStyle, flex: 1, minWidth: 200 }}
                  />
                  <button onClick={() => addItem(sec.id)} disabled={!(newItemBySection[sec.id] ?? "").trim()} style={primaryBtn}>+ Add item</button>
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ItemEditor({
  item, sections, canMoveUp, canMoveDown,
  onPatch, onDelete, onMove,
}: {
  item: ItemRow;
  sections: SectionRow[];
  canMoveUp: boolean;
  canMoveDown: boolean;
  onPatch: (patch: Partial<ItemRow>) => void;
  onDelete: () => void;
  onMove: (d: "up" | "down") => void;
}) {
  const [label, setLabel] = useState(item.label);
  const [expanded, setExpanded] = useState(false);

  function chip(active: boolean, onClick: () => void, text: string) {
    return (
      <button onClick={onClick} style={{ ...chipBase, ...(active ? chipOn : chipOff) }}>{text}</button>
    );
  }

  return (
    <div style={{ padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)", opacity: item.active ? 1 : 0.55 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => { if (label !== item.label) onPatch({ label }); }}
          style={{ ...fieldStyle, flex: 1, minWidth: 220 }}
        />
        <button onClick={() => setExpanded((x) => !x)} style={miniBtn}>{expanded ? "Hide flags" : "Edit flags"}</button>
        <button onClick={() => onMove("up")} disabled={!canMoveUp} style={miniBtn}>↑</button>
        <button onClick={() => onMove("down")} disabled={!canMoveDown} style={miniBtn}>↓</button>
        <button onClick={() => onPatch({ active: !item.active })} style={miniBtn}>{item.active ? "Hide" : "Show"}</button>
        <button onClick={onDelete} style={dangerMini}>×</button>
      </div>
      {expanded && (
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {chip(item.required,            () => onPatch({ required:            !item.required }),            "Required")}
            {chip(item.hasUpload,           () => onPatch({ hasUpload:           !item.hasUpload }),           "Upload field")}
            {chip(item.hasExpiration,       () => onPatch({ hasExpiration:       !item.hasExpiration }),       "Expiration field")}
            {chip(item.hasNotes,            () => onPatch({ hasNotes:            !item.hasNotes }),            "Notes field")}
            {chip(item.hasVerification,     () => onPatch({ hasVerification:     !item.hasVerification }),     "Verification")}
            {chip(item.shareSaveToFile,     () => onPatch({ shareSaveToFile:     !item.shareSaveToFile }),     "Save to file")}
            {chip(item.shareEmailEmployee,  () => onPatch({ shareEmailEmployee:  !item.shareEmailEmployee }),  "Email employee")}
            {chip(item.shareEmailAdmin,     () => onPatch({ shareEmailAdmin:     !item.shareEmailAdmin }),     "Email admin")}
          </div>
          <label>
            <span style={{ display: "block", color: "#94a3b8", fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>Section</span>
            <select value={item.sectionId} onChange={(e) => onPatch({ sectionId: e.target.value })} style={fieldStyle}>
              {sections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, marginBottom: 10, overflow: "hidden",
};
const fieldStyle: React.CSSProperties = {
  width: "100%", background: "#040d1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "9px 12px", color: "white", fontSize: 13, fontFamily: "inherit",
};
const primaryBtn: React.CSSProperties = {
  background: "#f0b429", color: "#040d1a", border: 0, padding: "9px 14px", borderRadius: 10, fontWeight: 900, fontSize: 12, letterSpacing: "0.10em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit",
};
const miniBtn: React.CSSProperties = {
  background: "transparent", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.10)", padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
};
const dangerMini: React.CSSProperties = {
  background: "transparent", color: "#fca5a5", border: "1px solid rgba(248,113,113,0.30)", padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
};
const chipBase: React.CSSProperties = {
  border: "1px solid", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
};
const chipOn: React.CSSProperties = {
  borderColor: "#f0b429", color: "#040d1a", background: "#f0b429",
};
const chipOff: React.CSSProperties = {
  borderColor: "rgba(255,255,255,0.12)", color: "#94a3b8", background: "transparent",
};

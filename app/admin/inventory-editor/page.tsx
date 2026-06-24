"use client";

/**
 * Admin Inventory Editor.
 *
 * Edit the back-stock "ordering sheet" definitions — rename items, bump PAR
 * with +/- buttons, relocate items to a different area (for when the restock
 * room is rearranged), drag to reorder/move, add and delete items and areas.
 *
 * This screen ONLY edits item definitions through the admin API
 * (/api/admin/inventory/items). It does NOT touch the counting / voice
 * ordering flow (/api/inventory/items + /inventory/backstock) — those keep
 * working exactly as before. Editing here bumps each item's version, so the
 * live counting screen's poller just picks the change up on its own.
 */

import { useState, useEffect, useRef, useCallback } from "react";

interface Item {
  id: string;
  categoryId: string;
  categoryName?: string;
  categorySlug?: string;
  name: string;
  location: string | null;
  par: number;
  currentStock: number;
  vendorSource: string | null;
  skipOrder: boolean;
  sortOrder: number;
  version: number;
}
interface Category {
  id: string;
  slug: string;
  name: string;
}

const NAVY = "#040d1a";
const PANEL = "#071428";
const GOLD = "#f0b429";
const BORDER = "rgba(255,255,255,0.10)";
const NO_AREA = "Unsorted";

export default function InventoryEditorPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [extraAreas, setExtraAreas] = useState<string[]>([]);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flash = useCallback((m: string) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }, []);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/inventory/items?type=backstock");
      if (!r.ok) { flash("Failed to load"); return; }
      const d = await r.json();
      setItems(d.items as Item[]);
      setCategories(d.categories as Category[]);
      setActiveCat((prev) => prev || (d.categories[0]?.slug ?? ""));
    } finally {
      setLoading(false);
    }
  }, [flash]);
  useEffect(() => { load(); }, [load]);

  const activeCategory = categories.find((c) => c.slug === activeCat);
  const catItems = items
    .filter((i) => i.categorySlug === activeCat)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Areas in first-appearance order, plus any the user just created.
  const areaOrder: string[] = [];
  for (const i of catItems) {
    const a = i.location || NO_AREA;
    if (!areaOrder.includes(a)) areaOrder.push(a);
  }
  for (const a of extraAreas) if (!areaOrder.includes(a)) areaOrder.push(a);

  // ── Persistence helpers ────────────────────────────────────────────────
  async function patchItem(id: string, body: Record<string, unknown>) {
    const r = await fetch(`/api/admin/inventory/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) { flash("Save failed"); load(); return null; }
    const d = await r.json();
    return d.item as Item;
  }

  function setLocal(id: string, patch: Partial<Item>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  async function changePar(item: Item, delta: number) {
    const next = Math.max(0, item.par + delta);
    if (next === item.par) return;
    setLocal(item.id, { par: next });
    await patchItem(item.id, { par: next });
  }
  async function setPar(item: Item, value: number) {
    const next = Math.max(0, Math.floor(value || 0));
    setLocal(item.id, { par: next });
    await patchItem(item.id, { par: next });
  }
  async function rename(item: Item, name: string) {
    const n = name.trim();
    if (!n || n === item.name) return;
    setLocal(item.id, { name: n });
    await patchItem(item.id, { name: n });
    flash("Renamed");
  }
  async function relocate(item: Item, location: string) {
    const loc = location === NO_AREA ? null : location;
    setLocal(item.id, { location: loc });
    await patchItem(item.id, { location: loc });
    flash(`Moved to ${location}`);
  }
  async function toggleSkip(item: Item) {
    setLocal(item.id, { skipOrder: !item.skipOrder });
    await patchItem(item.id, { skipOrder: !item.skipOrder });
  }
  async function removeItem(item: Item) {
    if (!confirm(`Delete "${item.name}"? This can't be undone.`)) return;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    const r = await fetch(`/api/admin/inventory/items/${item.id}`, { method: "DELETE" });
    if (!r.ok) { flash("Delete failed"); load(); return; }
    flash("Deleted");
  }
  async function addItem(area: string) {
    if (!activeCategory) return;
    const name = prompt(`New item name${area && area !== NO_AREA ? ` in "${area}"` : ""}:`);
    if (!name || !name.trim()) return;
    const maxSort = catItems.reduce((m, i) => Math.max(m, i.sortOrder), -1);
    const r = await fetch("/api/admin/inventory/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: activeCategory.id,
        name: name.trim(),
        location: area === NO_AREA ? null : area,
        par: 0,
        sortOrder: maxSort + 1,
      }),
    });
    if (!r.ok) { flash("Add failed"); return; }
    const d = await r.json();
    setItems((prev) => [...prev, d.item as Item]);
    flash("Item added");
  }
  function addArea() {
    const name = prompt("New area / shelf name:");
    if (!name || !name.trim()) return;
    const n = name.trim();
    if (!areaOrder.includes(n)) setExtraAreas((p) => [...p, n]);
    flash(`Area "${n}" added — add items or drag into it`);
  }
  async function renameArea(area: string) {
    if (area === NO_AREA) return;
    const name = prompt("Rename area:", area);
    if (!name || !name.trim() || name.trim() === area) return;
    const n = name.trim();
    const affected = catItems.filter((i) => (i.location || NO_AREA) === area);
    setItems((prev) => prev.map((i) => (affected.some((a) => a.id === i.id) ? { ...i, location: n } : i)));
    await Promise.all(affected.map((i) => patchItem(i.id, { location: n })));
    flash("Area renamed");
  }

  // ── Drag and drop (pointer-based, works on touch + mouse) ───────────────
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ id: string | null; where: "before" | "after"; area: string } | null>(null);
  const dragMeta = useRef<{ id: string } | null>(null);

  function onHandleDown(e: React.PointerEvent, item: Item) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragMeta.current = { id: item.id };
    setDragId(item.id);
  }
  function onHandleMove(e: React.PointerEvent) {
    if (!dragMeta.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const row = el?.closest("[data-item-id]") as HTMLElement | null;
    if (row) {
      const id = row.getAttribute("data-item-id");
      const area = row.getAttribute("data-area") || NO_AREA;
      if (id && id !== dragMeta.current.id) {
        const rect = row.getBoundingClientRect();
        const where: "before" | "after" = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
        setDrop({ id, where, area });
      }
      return;
    }
    const areaBox = el?.closest("[data-area-zone]") as HTMLElement | null;
    if (areaBox) {
      setDrop({ id: null, where: "after", area: areaBox.getAttribute("data-area-zone") || NO_AREA });
    }
  }
  async function onHandleUp(e: React.PointerEvent) {
    const meta = dragMeta.current;
    dragMeta.current = null;
    setDragId(null);
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    const target = drop;
    setDrop(null);
    if (!meta || !target) return;

    const flat = catItems.slice();
    const dragging = flat.find((i) => i.id === meta.id);
    if (!dragging) return;
    const newLoc = target.area === NO_AREA ? null : target.area;
    const moved = { ...dragging, location: newLoc };
    const rest = flat.filter((i) => i.id !== meta.id);

    let idx: number;
    if (target.id) {
      idx = rest.findIndex((i) => i.id === target.id);
      if (idx < 0) idx = rest.length;
      if (target.where === "after") idx += 1;
    } else {
      // dropped into an area's empty zone — append after that area's last item
      let last = -1;
      rest.forEach((i, k) => { if ((i.location || NO_AREA) === target.area) last = k; });
      idx = last < 0 ? rest.length : last + 1;
    }
    rest.splice(idx, 0, moved);

    const renumbered = rest.map((i, k) => ({ ...i, sortOrder: k }));
    setItems((prev) => prev.map((p) => {
      const u = renumbered.find((r) => r.id === p.id);
      return u ? { ...p, sortOrder: u.sortOrder, location: u.location } : p;
    }));

    const updates = renumbered.map((i) => ({ id: i.id, sortOrder: i.sortOrder, location: i.location ?? null }));
    const r = await fetch("/api/admin/inventory/items/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
    if (!r.ok) { flash("Reorder failed"); load(); } else { flash("Saved"); }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  if (loading) {
    return <div style={{ padding: 40, color: "#94a3b8" }}>Loading inventory…</div>;
  }

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "20px 16px 80px" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: GOLD, fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Inventory
        </div>
        <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 900, margin: "4px 0 6px" }}>Edit Ordering Sheet</h1>
        <p style={{ color: "#94a3b8", fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>
          Tap a name to rename. Use <strong style={{ color: "#cbd5e1" }}>−/＋</strong> to set the PAR (target stock that
          drives the order). Drag the <span style={{ color: GOLD }}>⠿</span> handle to reorder or move an item into another
          area, or use the area dropdown. This does not affect the counting or voice-ordering screens.
        </p>
      </div>

      {/* Category tabs */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 14 }}>
        {categories.map((c) => {
          const on = c.slug === activeCat;
          return (
            <button
              key={c.slug}
              onClick={() => setActiveCat(c.slug)}
              style={{
                flexShrink: 0, padding: "8px 14px", borderRadius: 11, border: `1px solid ${on ? GOLD : BORDER}`,
                background: on ? GOLD : "rgba(255,255,255,0.04)", color: on ? NAVY : "#cbd5e1",
                fontSize: 12.5, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit",
              }}
            >
              {c.name.replace(" Backstock", "")}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button onClick={() => addItem(NO_AREA)} style={primaryBtn}>＋ Add item</button>
        <button onClick={addArea} style={ghostBtn}>＋ Add area</button>
      </div>

      {/* Areas */}
      {areaOrder.map((area) => {
        const rows = catItems.filter((i) => (i.location || NO_AREA) === area);
        return (
          <div
            key={area}
            data-area-zone={area}
            style={{
              border: `1px solid ${BORDER}`, borderRadius: 14, background: PANEL, marginBottom: 14, overflow: "hidden",
              outline: drop && drop.area === area && drop.id === null ? `2px dashed ${GOLD}` : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(240,180,41,0.07)", borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ color: GOLD, fontSize: 12.5, fontWeight: 900, letterSpacing: "0.04em", flex: 1 }}>
                {area} <span style={{ color: "#64748b", fontWeight: 600 }}>· {rows.length}</span>
              </span>
              {area !== NO_AREA && (
                <button onClick={() => renameArea(area)} title="Rename area" style={miniBtn}>✎</button>
              )}
              <button onClick={() => addItem(area)} title="Add item here" style={miniBtn}>＋</button>
            </div>

            {rows.length === 0 && (
              <div style={{ padding: "16px 14px", color: "#475569", fontSize: 12.5 }}>
                Empty — drag an item here or tap ＋
              </div>
            )}

            {rows.map((item) => {
              const showBefore = drop?.id === item.id && drop.where === "before";
              const showAfter = drop?.id === item.id && drop.where === "after";
              const isDragging = dragId === item.id;
              return (
                <div key={item.id}>
                  {showBefore && <DropLine />}
                  <div
                    data-item-id={item.id}
                    data-area={area}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                      borderTop: `1px solid rgba(255,255,255,0.05)`, opacity: isDragging ? 0.4 : 1,
                      background: isDragging ? "rgba(240,180,41,0.06)" : "transparent",
                    }}
                  >
                    {/* Drag handle */}
                    <div
                      onPointerDown={(e) => onHandleDown(e, item)}
                      onPointerMove={onHandleMove}
                      onPointerUp={onHandleUp}
                      style={{ cursor: "grab", color: "#475569", fontSize: 20, lineHeight: 1, touchAction: "none", padding: "4px 2px", userSelect: "none" }}
                      title="Drag to reorder or move"
                    >
                      ⠿
                    </div>

                    {/* Name + controls */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <input
                        defaultValue={item.name}
                        onBlur={(e) => rename(item, e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                        style={{
                          width: "100%", background: "transparent", border: "none", borderBottom: "1px solid transparent",
                          color: item.skipOrder ? "#64748b" : "#f1f5f9", fontSize: 14, fontWeight: 600, fontFamily: "inherit",
                          padding: "2px 0", outline: "none", textDecoration: item.skipOrder ? "line-through" : "none",
                        }}
                        onFocus={(e) => (e.target.style.borderBottom = `1px solid ${GOLD}`)}
                        onBlurCapture={(e) => (e.target.style.borderBottom = "1px solid transparent")}
                      />
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                        {/* Relocate */}
                        <select
                          value={item.location || NO_AREA}
                          onChange={(e) => {
                            if (e.target.value === "__new__") { const n = prompt("New area name:"); if (n && n.trim()) relocate(item, n.trim()); return; }
                            relocate(item, e.target.value);
                          }}
                          style={{
                            background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, color: "#94a3b8",
                            borderRadius: 8, fontSize: 11.5, padding: "3px 6px", fontFamily: "inherit", maxWidth: 200,
                          }}
                        >
                          {areaOrder.map((a) => <option key={a} value={a}>{a}</option>)}
                          <option value="__new__">＋ New area…</option>
                        </select>
                        <button onClick={() => toggleSkip(item)} style={{ ...tagBtn, color: item.skipOrder ? "#fca5a5" : "#475569", borderColor: item.skipOrder ? "rgba(239,68,68,0.4)" : BORDER }}>
                          {item.skipOrder ? "SKIP ✓" : "Skip"}
                        </button>
                        <button onClick={() => removeItem(item)} style={{ ...tagBtn, color: "#64748b" }}>Delete</button>
                      </div>
                    </div>

                    {/* PAR stepper */}
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      <button onClick={() => changePar(item, -1)} style={stepBtn}>−</button>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={item.par}
                        onChange={(e) => setLocal(item.id, { par: Math.max(0, parseInt(e.target.value) || 0) })}
                        onBlur={(e) => setPar(item, parseInt(e.target.value) || 0)}
                        style={{
                          width: 44, textAlign: "center", background: NAVY, border: `1px solid ${BORDER}`, color: "#fff",
                          borderRadius: 8, fontSize: 15, fontWeight: 800, fontFamily: "inherit", padding: "6px 0", outline: "none",
                        }}
                      />
                      <button onClick={() => changePar(item, 1)} style={stepBtn}>＋</button>
                    </div>
                  </div>
                  {showAfter && <DropLine />}
                </div>
              );
            })}
          </div>
        );
      })}

      {catItems.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "#475569" }}>No items in this category yet. Tap ＋ Add item.</div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#1e293b", border: `1px solid ${BORDER}`, color: "#fff", padding: "10px 18px", borderRadius: 12, fontSize: 13.5, fontWeight: 600, zIndex: 50, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
          {toast}
        </div>
      )}

      <p style={{ marginTop: 24, padding: "12px 14px", border: `1px solid ${BORDER}`, borderRadius: 12, color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>
        PAR is the target quantity. The order asks for enough to bring usable stock (on-hand − expired) back up to PAR.
        Counting and voice ordering on <span style={{ color: "#94a3b8" }}>/inventory</span> are unaffected by edits here.
      </p>
    </div>
  );
}

function DropLine() {
  return <div style={{ height: 3, background: GOLD, margin: "0 12px", borderRadius: 2 }} />;
}

const primaryBtn: React.CSSProperties = {
  padding: "9px 16px", borderRadius: 11, border: "none", background: GOLD, color: NAVY,
  fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "inherit",
};
const ghostBtn: React.CSSProperties = {
  padding: "9px 16px", borderRadius: 11, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.04)",
  color: "#cbd5e1", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
};
const miniBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 8, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.05)",
  color: "#cbd5e1", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", lineHeight: 1,
};
const stepBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 9, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.06)",
  color: GOLD, fontSize: 20, fontWeight: 900, cursor: "pointer", fontFamily: "inherit", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center",
};
const tagBtn: React.CSSProperties = {
  padding: "3px 9px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent",
  fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
};

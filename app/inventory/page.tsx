"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface Item {
  id: string;
  categoryId: string;
  categoryName?: string;
  categorySlug?: string;
  name: string;
  location: string | null;
  par: number;
  currentStock: number;
  priorStock: number | null;
  expiredQty: number;
  qtyToOrder: number;
  delta: number | null;
  vendorSource: string | null;
  notes: string | null;
  skipOrder: boolean;
  sortOrder: number;
  version: number;
  updatedAt: string;
}

/* ── Speech hook ─────────────────────────────────────────────────────────── */

function useSpeech(onResult: (t: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);
  useEffect(() => {
    const SR = (window as unknown as Record<string, unknown>).SpeechRecognition ||
               (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    setSupported(!!SR);
    if (SR) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = new (SR as any)(); r.continuous = false; r.interimResults = false; r.lang = "en-US";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      r.onresult = (e: any) => { const t = e.results[0]?.[0]?.transcript?.trim(); if (t) onResult(t); };
      r.onend = () => setListening(false); r.onerror = () => setListening(false);
      recRef.current = r;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const toggle = useCallback(() => {
    if (!recRef.current) return;
    if (listening) recRef.current.stop(); else { recRef.current.start(); setListening(true); }
  }, [listening]);
  return { listening, supported, toggle };
}

/* ── Main ────────────────────────────────────────────────────────────────── */

export default function InventoryDashboard() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [activeCat, setActiveCat] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitNotes, setSubmitNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const lastPoll = useRef(new Date().toISOString());
  const editedCount = useRef(0);

  /* categories from items */
  const categories = (() => {
    const m = new Map<string, { name: string; slug: string; count: number; low: number }>();
    for (const i of items) {
      const s = i.categorySlug ?? "unknown";
      const e = m.get(s);
      if (e) { e.count++; if (i.qtyToOrder > 0 && !i.skipOrder) e.low++; }
      else m.set(s, { name: i.categoryName ?? s, slug: s, count: 1, low: i.qtyToOrder > 0 && !i.skipOrder ? 1 : 0 });
    }
    return Array.from(m.values());
  })();

  /* fetch */
  const fetchData = useCallback(async () => {
    try {
      const r = await fetch("/api/inventory/items");
      if (!r.ok) { router.push("/inventory/login"); return; }
      setItems(await r.json()); lastPoll.current = new Date().toISOString();
    } catch { router.push("/inventory/login"); } finally { setLoading(false); }
  }, [router]);
  useEffect(() => { fetchData(); }, [fetchData]);

  /* polling */
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`/api/inventory/items?since=${encodeURIComponent(lastPoll.current)}`);
        if (!r.ok) return;
        const upd = (await r.json()) as Item[];
        if (upd.length) {
          setItems(p => { const mp = new Map(p.map(i => [i.id, i])); for (const u of upd) if (!saving[u.id]) mp.set(u.id, u); return Array.from(mp.values()); });
          lastPoll.current = new Date().toISOString();
        }
      } catch {}
    }, 4000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving]);

  /* save */
  const saveItem = useCallback(async (item: Item, updates: { currentStock?: number; expiredQty?: number; notes?: string }) => {
    setSaving(s => ({ ...s, [item.id]: true }));
    try {
      const r = await fetch(`/api/inventory/items/${item.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: item.version, ...updates }),
      });
      if (r.status === 409) {
        const d = await r.json(); if (d.item) setItems(p => p.map(i => i.id === item.id ? d.item : i));
        msg("Conflict — refreshed"); return;
      }
      if (r.ok) { const u = await r.json(); setItems(p => p.map(i => i.id === item.id ? u : i)); editedCount.current++; }
    } catch { msg("Save failed"); } finally { setSaving(s => ({ ...s, [item.id]: false })); }
  }, []);

  function msg(t: string) { setToast(t); setTimeout(() => setToast(null), 2500); }

  /* speech */
  const [focusedIdx, setFocusedIdx] = useState(0);
  const handleSpeech = useCallback((transcript: string) => {
    const l = transcript.toLowerCase().trim();
    const filtered = getFiltered();
    if (l === "next" || l === "next item") { setFocusedIdx(i => Math.min(i + 1, filtered.length - 1)); msg("Next"); return; }
    const qm = l.match(/(?:quantity|stock|count|set)\s+(?:to\s+)?(\d+)/);
    const num = qm ? parseInt(qm[1]) : l.match(/^(\d+)$/) ? parseInt(l) : null;
    if (num !== null && filtered[focusedIdx]) { saveItem(filtered[focusedIdx], { currentStock: num }); msg(`Stock → ${num}`); return; }
    const em = l.match(/expired\s+(\d+)/);
    if (em && filtered[focusedIdx]) { saveItem(filtered[focusedIdx], { expiredQty: parseInt(em[1]) }); msg(`Expired → ${em[1]}`); return; }
    if (l.startsWith("note ") && filtered[focusedIdx]) { saveItem(filtered[focusedIdx], { notes: l.slice(5) }); msg("Note saved"); return; }
    if (l.startsWith("search ") || l.startsWith("find ") || l.startsWith("item ")) { setSearch(l.replace(/^(search|find|item)\s+/, "")); return; }
    msg(`"${transcript}" — ?`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedIdx, saveItem]);
  const { listening, supported, toggle: toggleSpeech } = useSpeech(handleSpeech);

  /* filter */
  function getFiltered() {
    return items.filter(i => {
      if (activeCat !== "all" && i.categorySlug !== activeCat) return false;
      if (search) { const s = search.toLowerCase(); return i.name.toLowerCase().includes(s) || (i.location ?? "").toLowerCase().includes(s); }
      return true;
    });
  }
  const filtered = getFiltered();

  /* group by location */
  const groups: { loc: string; items: Item[] }[] = [];
  let lastLoc = "___";
  for (const item of filtered) {
    const loc = item.location ?? "Other";
    if (loc !== lastLoc) { groups.push({ loc, items: [] }); lastLoc = loc; }
    groups[groups.length - 1].items.push(item);
  }

  /* submit */
  async function handleSubmit() {
    setSubmitting(true);
    try {
      await fetch("/api/inventory/submit", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categorySlug: activeCat === "all" ? null : activeCat, itemsUpdated: editedCount.current, notes: submitNotes || null, submittedBy: "Inventory User" }) });
      msg("Submitted!"); setShowSubmit(false); setSubmitNotes(""); editedCount.current = 0;
    } catch { msg("Failed"); } finally { setSubmitting(false); }
  }

  async function logout() { await fetch("/api/inventory/logout", { method: "POST" }); router.push("/inventory/login"); }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#040d1a]"><div className="text-slate-500 animate-pulse">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-[#040d1a]">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-[#020e1f]/95 backdrop-blur border-b border-white/8">
        <div className="max-w-2xl mx-auto">
          {/* Top row */}
          <div className="flex items-center gap-2 px-4 h-11">
            <div className="w-6 h-6 rounded-md bg-[#f0b429]/15 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#f0b429]"><path d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z"/></svg>
            </div>
            <span className="text-white font-black text-sm">Inventory</span>
            <div className="flex-1" />
            {supported && (
              <button onClick={toggleSpeech} className={`p-1.5 rounded-lg ${listening ? "bg-red-500/20 text-red-400 animate-pulse" : "text-slate-600 hover:text-white"}`}>
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
              </button>
            )}
            <button onClick={() => setShowSubmit(true)} className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-400/10">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
            </button>
            <button onClick={logout} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
            </button>
          </div>

          {/* Search */}
          <div className="px-4 pb-2">
            <div className="relative">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-slate-600 absolute left-3 top-1/2 -translate-y-1/2"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..."
                className="w-full pl-9 pr-3 py-2 bg-[#071428] border border-white/8 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-[#f0b429]/30" />
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1.5 px-4 pb-2.5 overflow-x-auto" style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
            <button onClick={() => setActiveCat("all")}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${activeCat === "all" ? "bg-[#f0b429] text-[#040d1a]" : "bg-white/5 text-slate-500"}`}>
              All
            </button>
            {categories.map(c => (
              <button key={c.slug} onClick={() => { setActiveCat(c.slug); setFocusedIdx(0); }}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${activeCat === c.slug ? "bg-[#f0b429] text-[#040d1a]" : "bg-white/5 text-slate-500"}`}>
                {c.name.replace(" Backstock", "").replace(" Supplies", "")}
                {c.low > 0 && <span className="ml-1 text-[10px] bg-red-500 text-white px-1 rounded-full">{c.low}</span>}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Items ── */}
      <div className="max-w-2xl mx-auto px-4 pt-3 pb-28">
        {/* Column headers */}
        <div className="flex items-center gap-2 px-2 pb-1 text-[10px] text-slate-600 uppercase tracking-wider font-bold">
          <span className="flex-1">Item</span>
          <span className="w-12 text-center">PAR</span>
          <span className="w-16 text-center">Stock</span>
          <span className="w-12 text-center">Need</span>
          <span className="w-14 text-center">Exp</span>
        </div>

        {groups.map((g, gi) => (
          <div key={gi} className="mb-5">
            {/* Location section header */}
            <div className="sticky top-[130px] z-10 bg-[#040d1a] pt-2 pb-1 mb-1">
              <div className="bg-[#0a1e3d] border border-[#f0b429]/20 rounded-lg px-3 py-1.5 flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-3 h-3 fill-[#f0b429] shrink-0"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
                <span className="text-[#f0b429] text-[11px] font-black uppercase tracking-wide">{g.loc}</span>
                <span className="text-slate-600 text-[10px] ml-auto">{g.items.length}</span>
              </div>
            </div>

            {/* Items */}
            {g.items.map(item => (
              <ItemRow key={item.id} item={item} isSaving={!!saving[item.id]} onSave={u => saveItem(item, u)} />
            ))}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-20 text-slate-600">{search ? "No matches" : "No items"}</div>
        )}
      </div>

      {/* Submit modal */}
      {showSubmit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
          <div className="bg-[#071428] border border-white/10 rounded-2xl p-5 w-full max-w-sm">
            <h2 className="text-lg font-black text-white mb-1">Submit Count</h2>
            <p className="text-slate-500 text-xs mb-3">{editedCount.current} items edited</p>
            <textarea value={submitNotes} onChange={e => setSubmitNotes(e.target.value)} placeholder="Notes (optional)" rows={2}
              className="w-full px-3 py-2 bg-[#040d1a] border border-white/10 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none mb-3" />
            <div className="flex gap-2">
              <button onClick={() => setShowSubmit(false)} className="flex-1 py-2.5 border border-white/10 rounded-xl text-slate-400 font-semibold text-sm">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-2.5 bg-emerald-500 text-white font-bold text-sm rounded-xl disabled:opacity-50">{submitting ? "..." : "Submit"}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#071428] border border-white/15 rounded-xl px-4 py-2 text-sm text-white shadow-xl">{toast}</div>}
    </div>
  );
}

/* ── Item Row ────────────────────────────────────────────────────────────── */

function ItemRow({ item, isSaving, onSave }: {
  item: Item; isSaving: boolean;
  onSave: (u: { currentStock?: number; expiredQty?: number; notes?: string }) => void;
}) {
  const [stock, setStock] = useState(item.currentStock === 0 ? "" : String(item.currentStock));
  const [expired, setExpired] = useState(item.expiredQty === 0 ? "" : String(item.expiredQty));
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(item.notes ?? "");

  useEffect(() => {
    setStock(item.currentStock === 0 ? "" : String(item.currentStock));
    setExpired(item.expiredQty === 0 ? "" : String(item.expiredQty));
    setNotes(item.notes ?? "");
  }, [item.currentStock, item.expiredQty, item.notes]);

  function commitStock() {
    const v = stock === "" ? 0 : parseInt(stock);
    if (!isNaN(v) && v !== item.currentStock) onSave({ currentStock: v });
  }
  function commitExpired() {
    const v = expired === "" ? 0 : parseInt(expired);
    if (!isNaN(v) && v !== item.expiredQty) onSave({ expiredQty: v });
  }
  function commitNotes() { if (notes !== (item.notes ?? "")) onSave({ notes }); }

  const needsOrder = item.qtyToOrder > 0 && !item.skipOrder;

  return (
    <div className={`border-b border-white/5 py-1.5 ${isSaving ? "opacity-70" : ""}`}>
      <div className="flex items-center gap-2 px-2">
        {/* Item name — wraps, never truncates */}
        <div className="flex-1 min-w-0 pr-1">
          <button onClick={() => setShowNotes(!showNotes)} className="text-left w-full">
            <div className={`text-[13px] leading-tight font-medium break-words ${needsOrder ? "text-amber-300" : "text-slate-200"}`}>
              {item.name}
            </div>
          </button>
        </div>

        {/* PAR */}
        <div className="w-12 text-center text-xs text-slate-500 font-mono shrink-0">{item.par}</div>

        {/* Stock input — ALWAYS visible */}
        <div className="w-16 shrink-0">
          <input
            type="number"
            inputMode="numeric"
            value={stock}
            onChange={e => setStock(e.target.value)}
            onBlur={commitStock}
            onKeyDown={e => e.key === "Enter" && commitStock()}
            placeholder="—"
            className={`w-full px-1 py-1.5 text-center rounded-lg border text-sm font-bold bg-[#040d1a] focus:outline-none focus:ring-1 focus:ring-[#f0b429]/50 focus:border-[#f0b429]/50 ${
              needsOrder ? "border-amber-500/40 text-amber-300" : item.currentStock > 0 ? "border-emerald-500/30 text-emerald-400" : "border-white/10 text-slate-500"
            }`}
          />
        </div>

        {/* Need to order */}
        <div className="w-12 text-center shrink-0">
          {item.skipOrder ? (
            <span className="text-[9px] text-slate-700 font-bold">SKIP</span>
          ) : needsOrder ? (
            <span className="text-sm font-black text-red-400">{item.qtyToOrder}</span>
          ) : (
            <span className="text-xs text-emerald-500/40">0</span>
          )}
        </div>

        {/* Expired input — ALWAYS visible */}
        <div className="w-14 shrink-0">
          <input
            type="number"
            inputMode="numeric"
            value={expired}
            onChange={e => setExpired(e.target.value)}
            onBlur={commitExpired}
            onKeyDown={e => e.key === "Enter" && commitExpired()}
            placeholder="—"
            className={`w-full px-1 py-1.5 text-center rounded-lg border text-xs bg-[#040d1a] focus:outline-none focus:ring-1 focus:ring-[#f0b429]/50 ${
              item.expiredQty > 0 ? "border-red-500/30 text-red-400 font-bold" : "border-white/10 text-slate-600"
            }`}
          />
        </div>
      </div>

      {/* Notes row — toggle on tap of name */}
      {showNotes && (
        <div className="px-2 pt-1 pb-0.5">
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} onBlur={commitNotes}
            onKeyDown={e => e.key === "Enter" && commitNotes()} placeholder="Add notes..."
            className="w-full px-2 py-1 rounded-lg border border-white/8 text-xs text-slate-400 bg-[#040d1a] placeholder-slate-700 focus:outline-none focus:border-[#f0b429]/30" />
        </div>
      )}
    </div>
  );
}

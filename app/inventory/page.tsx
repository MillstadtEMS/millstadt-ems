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

/** Need = PAR - (currentStock - expired). Expired items don't count as usable stock. */
function calcNeed(item: Item): number {
  if (item.skipOrder) return 0;
  const usable = Math.max(0, item.currentStock - item.expiredQty);
  return Math.max(0, item.par - usable);
}

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

export default function InventoryDashboard() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [activeCat, setActiveCat] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitNotes, setSubmitNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const lastPoll = useRef(new Date().toISOString());
  const editedCount = useRef(0);
  const [focusedIdx, setFocusedIdx] = useState(0);

  const categories = (() => {
    const m = new Map<string, { name: string; slug: string; count: number; low: number }>();
    for (const i of items) {
      const s = i.categorySlug ?? "unknown";
      const need = calcNeed(i);
      const e = m.get(s);
      if (e) { e.count++; if (need > 0) e.low++; }
      else m.set(s, { name: i.categoryName ?? s, slug: s, count: 1, low: need > 0 ? 1 : 0 });
    }
    return Array.from(m.values());
  })();

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch("/api/inventory/items");
      if (!r.ok) { router.push("/inventory/login"); return; }
      const data = await r.json() as Item[];
      setItems(data); lastPoll.current = new Date().toISOString();
      // Default to first category
      if (!activeCat && data.length > 0) {
        const firstSlug = data[0].categorySlug ?? "unknown";
        setActiveCat(firstSlug);
      }
    } catch { router.push("/inventory/login"); } finally { setLoading(false); }
  }, [router]);
  useEffect(() => { fetchData(); }, [fetchData]);

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
    if (l.startsWith("search ") || l.startsWith("find ")) { setSearch(l.replace(/^(search|find)\s+/, "")); return; }
    msg(`"${transcript}" — ?`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedIdx, saveItem]);
  const { listening, supported, toggle: toggleSpeech } = useSpeech(handleSpeech);

  function getFiltered() {
    return items.filter(i => {
      if (i.categorySlug !== activeCat) return false;
      if (search) { const s = search.toLowerCase(); return i.name.toLowerCase().includes(s) || (i.location ?? "").toLowerCase().includes(s); }
      return true;
    });
  }
  const filtered = getFiltered();

  const groups: { loc: string; items: Item[] }[] = [];
  let lastLoc = "___";
  for (const item of filtered) {
    const loc = item.location ?? "Other";
    if (loc !== lastLoc) { groups.push({ loc, items: [] }); lastLoc = loc; }
    groups[groups.length - 1].items.push(item);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await fetch("/api/inventory/submit", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categorySlug: activeCat, itemsUpdated: editedCount.current, notes: submitNotes || null, submittedBy: "Inventory User" }) });
      msg("Submitted!"); setShowSubmit(false); setSubmitNotes(""); editedCount.current = 0;
    } catch { msg("Failed"); } finally { setSubmitting(false); }
  }

  async function logout() { await fetch("/api/inventory/logout", { method: "POST" }); router.push("/inventory/login"); }

  if (loading) return <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950"><div className="text-slate-400 animate-pulse text-lg">Loading inventory...</div></div>;

  return (
    /* FIXED position to break out of root layout Nav/Footer completely */
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col overflow-hidden">

      {/* ══════════ HEADER ══════════ */}
      <header className="shrink-0 bg-slate-900 border-b border-slate-700 shadow-lg">
        <div className="max-w-[1200px] mx-auto px-8 lg:px-12 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-yellow-400"><path d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z"/></svg>
            </div>
            <div>
              <div className="text-white font-black text-base leading-none">Inventory</div>
              <div className="text-yellow-400/70 text-[10px] font-bold uppercase tracking-[0.15em] mt-0.5">Millstadt EMS</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {supported && (
              <button onClick={toggleSpeech} className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${listening ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"}`} title="Voice">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
              </button>
            )}
            <button onClick={() => setShowSubmit(true)} className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 flex items-center justify-center transition" title="Submit count">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
            </button>
            <button onClick={logout} className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 flex items-center justify-center transition" title="Sign out">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
            </button>
          </div>
        </div>
      </header>

      {/* ══════════ SEARCH + FILTERS ══════════ */}
      <div className="shrink-0 bg-slate-900/80 border-b border-slate-800">
        <div className="max-w-[1200px] mx-auto px-8 lg:px-12 py-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative w-full md:w-80">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-slate-500 absolute left-4 top-1/2 -translate-y-1/2"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..."
                className="w-full pl-11 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/25" />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <button key={c.slug} onClick={() => { setActiveCat(c.slug); setFocusedIdx(0); }}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${activeCat === c.slug ? "bg-yellow-500 text-slate-900" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
                  {c.name.replace(" Backstock", "").replace(" Supplies", "")}
                  {c.low > 0 && <span className="ml-1.5 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{c.low}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ TABLE ══════════ */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-8 lg:px-12 py-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-lg overflow-hidden">

            {/* Column header */}
            <div className="grid grid-cols-[1fr_70px_100px_70px_90px] gap-2 px-8 py-3 bg-slate-800 border-b border-slate-700 text-[11px] text-slate-400 uppercase tracking-wider font-bold">
              <div>Item</div>
              <div className="text-center">PAR</div>
              <div className="text-center">Stock</div>
              <div className="text-center">Need</div>
              <div className="text-center">Expired</div>
            </div>

            {groups.map((g, gi) => (
              <div key={gi}>
                <div className="bg-slate-800/80 border-l-4 border-yellow-400 px-8 py-2.5 flex items-center gap-3">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-yellow-400 shrink-0"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
                  <span className="text-yellow-400 text-xs font-bold uppercase tracking-wide">{g.loc}</span>
                  <span className="text-slate-500 text-[11px] ml-auto">{g.items.length} items</span>
                </div>
                <div className="divide-y divide-slate-800">
                  {g.items.map((item, idx) => (
                    <ItemRow key={item.id} item={item} isSaving={!!saving[item.id]} onSave={u => saveItem(item, u)} even={idx % 2 === 0} />
                  ))}
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="text-center py-20 text-slate-500 text-sm">{search ? "No items match your search." : "No items found."}</div>
            )}
          </div>
        </div>
      </div>

      {/* Submit modal */}
      {showSubmit && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-6">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-black text-white mb-2">Submit Inventory Count</h2>
            <p className="text-slate-400 text-sm mb-4">{editedCount.current} items edited</p>
            <textarea value={submitNotes} onChange={e => setSubmitNotes(e.target.value)} placeholder="Notes (optional)" rows={3}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-yellow-500/50 mb-4 resize-none" />
            <div className="flex gap-3">
              <button onClick={() => setShowSubmit(false)} className="flex-1 py-3 border border-slate-600 rounded-xl text-slate-300 font-semibold text-sm hover:bg-slate-700 transition">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl transition disabled:opacity-50">{submitting ? "..." : "Submit Count"}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[10000] bg-slate-800 border border-slate-600 rounded-xl px-5 py-3 text-sm text-white font-medium shadow-2xl">{toast}</div>}
    </div>
  );
}

function ItemRow({ item, isSaving, onSave, even }: {
  item: Item; isSaving: boolean; even: boolean;
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

  function commitStock() { const v = stock === "" ? 0 : parseInt(stock); if (!isNaN(v) && v !== item.currentStock) onSave({ currentStock: v }); }
  function commitExpired() { const v = expired === "" ? 0 : parseInt(expired); if (!isNaN(v) && v !== item.expiredQty) onSave({ expiredQty: v }); }
  function commitNotes() { if (notes !== (item.notes ?? "")) onSave({ notes }); }

  /* Need = PAR - (stock - expired). Expired reduces usable stock. */
  const need = calcNeed(item);
  const needsOrder = need > 0;

  return (
    <div className={`${even ? "bg-slate-900" : "bg-slate-900/60"} hover:bg-slate-800 transition-colors ${isSaving ? "opacity-60" : ""}`}>
      <div className="grid grid-cols-[1fr_70px_100px_70px_90px] gap-2 items-center px-8 py-3">

        {/* Item name */}
        <div className="pr-4 min-w-0">
          <button onClick={() => setShowNotes(!showNotes)} className="text-left w-full group">
            <div className={`text-sm font-medium leading-snug break-words group-hover:underline decoration-slate-600 ${needsOrder ? "text-amber-300" : "text-white"}`}>
              {item.name}
            </div>
            {item.vendorSource && <div className="text-[11px] text-slate-500 mt-0.5 break-words">{item.vendorSource}</div>}
          </button>
        </div>

        {/* PAR */}
        <div className="text-center">
          <span className="text-sm text-slate-400 font-mono font-semibold">{item.par}</span>
        </div>

        {/* Stock input */}
        <div className="flex items-center justify-center">
          <input type="number" inputMode="numeric" value={stock} onChange={e => setStock(e.target.value)}
            onBlur={commitStock} onKeyDown={e => e.key === "Enter" && commitStock()} placeholder="—"
            className={`w-[72px] px-2 py-2 text-center rounded-lg border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-yellow-500/40 focus:border-yellow-500/60 transition ${
              item.currentStock > 0 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-slate-800 border-slate-600 text-slate-400"
            }`} />
        </div>

        {/* Need (PAR - usable stock) */}
        <div className="text-center">
          {item.skipOrder ? (
            <span className="text-[10px] text-slate-600 font-bold uppercase">Skip</span>
          ) : needsOrder ? (
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/15 text-red-400 text-sm font-black">{need}</span>
          ) : (
            <span className="text-sm text-slate-600">—</span>
          )}
        </div>

        {/* Expired input */}
        <div className="flex items-center justify-center">
          <input type="number" inputMode="numeric" value={expired} onChange={e => setExpired(e.target.value)}
            onBlur={commitExpired} onKeyDown={e => e.key === "Enter" && commitExpired()} placeholder="—"
            className={`w-[72px] px-2 py-2 text-center rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/40 focus:border-yellow-500/60 transition ${
              item.expiredQty > 0 ? "bg-red-500/10 border-red-500/30 text-red-400 font-bold" : "bg-slate-800 border-slate-600 text-slate-500"
            }`} />
        </div>
      </div>

      {showNotes && (
        <div className="px-8 pb-3">
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} onBlur={commitNotes}
            onKeyDown={e => e.key === "Enter" && commitNotes()} placeholder="Add notes..."
            className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-800 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-yellow-500/50" />
        </div>
      )}
    </div>
  );
}

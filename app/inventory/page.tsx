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

// ── Speech ──────────────────────────────────────────────────────────────────

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
      const rec = new (SR as any)();
      rec.continuous = false; rec.interimResults = false; rec.lang = "en-US";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (e: any) => { const t = e.results[0]?.[0]?.transcript?.trim(); if (t) onResult(t); };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      recRef.current = rec;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const toggle = useCallback(() => {
    if (!recRef.current) return;
    if (listening) recRef.current.stop(); else { recRef.current.start(); setListening(true); }
  }, [listening]);
  return { listening, supported, toggle };
}

function parseSpeech(text: string): { cmd: string; value?: string | number } | null {
  const l = text.toLowerCase().trim();
  if (l === "next" || l === "next item") return { cmd: "next" };
  const qm = l.match(/(?:quantity|stock|count|set)\s+(?:to\s+)?(\d+)/); if (qm) return { cmd: "quantity", value: parseInt(qm[1]) };
  const em = l.match(/expired\s+(\d+)/); if (em) return { cmd: "expired", value: parseInt(em[1]) };
  const nm = l.match(/^note\s+(.+)/); if (nm) return { cmd: "note", value: nm[1] };
  const sm = l.match(/^(?:item|find|search)\s+(.+)/); if (sm) return { cmd: "search", value: sm[1] };
  const pn = l.match(/^(\d+)$/); if (pn) return { cmd: "quantity", value: parseInt(pn[1]) };
  const wn: Record<string, number> = { zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,fifteen:15,twenty:20 };
  if (wn[l] !== undefined) return { cmd: "quantity", value: wn[l] };
  return null;
}

// ── Main ────────────────────────────────────────────────────────────────────

export default function InventoryDashboard() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [activeCat, setActiveCat] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitNotes, setSubmitNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const lastPoll = useRef(new Date().toISOString());
  const editedCount = useRef(0);

  // ── Categories derived from items ──────────────────────────────────────

  const categories = (() => {
    const map = new Map<string, { name: string; slug: string; count: number; low: number }>();
    for (const i of items) {
      const slug = i.categorySlug ?? "unknown";
      const existing = map.get(slug);
      if (existing) {
        existing.count++;
        if (i.qtyToOrder > 0 && !i.skipOrder) existing.low++;
      } else {
        map.set(slug, { name: i.categoryName ?? slug, slug, count: 1, low: i.qtyToOrder > 0 && !i.skipOrder ? 1 : 0 });
      }
    }
    return Array.from(map.values());
  })();

  // ── Fetch ──────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory/items");
      if (!res.ok) { router.push("/inventory/login"); return; }
      setItems(await res.json());
      lastPoll.current = new Date().toISOString();
    } catch { router.push("/inventory/login"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Polling ────────────────────────────────────────────────────────────

  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const res = await fetch(`/api/inventory/items?since=${encodeURIComponent(lastPoll.current)}`);
        if (!res.ok) return;
        const updated = (await res.json()) as Item[];
        if (updated.length > 0) {
          setItems(prev => {
            const m = new Map(prev.map(i => [i.id, i]));
            for (const u of updated) if (!saving[u.id]) m.set(u.id, u);
            return Array.from(m.values()).sort((a, b) => {
              const ca = categories.findIndex(c => c.slug === a.categorySlug);
              const cb = categories.findIndex(c => c.slug === b.categorySlug);
              if (ca !== cb) return ca - cb;
              return a.sortOrder - b.sortOrder;
            });
          });
          lastPoll.current = new Date().toISOString();
        }
      } catch {}
    }, 4000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving]);

  // ── Save ───────────────────────────────────────────────────────────────

  const saveItem = useCallback(async (item: Item, updates: { currentStock?: number; expiredQty?: number; notes?: string }) => {
    setSaving(s => ({ ...s, [item.id]: true }));
    try {
      const res = await fetch(`/api/inventory/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: item.version, ...updates }),
      });
      if (res.status === 409) {
        const d = await res.json();
        if (d.item) setItems(p => p.map(i => i.id === item.id ? d.item : i));
        showMsg("Conflict — refreshed from server");
        return;
      }
      if (res.ok) {
        const updated = await res.json();
        setItems(p => p.map(i => i.id === item.id ? updated : i));
        editedCount.current++;
      }
    } catch { showMsg("Save failed"); }
    finally { setSaving(s => ({ ...s, [item.id]: false })); }
  }, []);

  function showMsg(m: string) { setToast(m); setTimeout(() => setToast(null), 2500); }

  // ── Speech ─────────────────────────────────────────────────────────────

  const handleSpeech = useCallback((transcript: string) => {
    const cmd = parseSpeech(transcript);
    if (!cmd) { showMsg(`"${transcript}" — not understood`); return; }
    if (cmd.cmd === "search" && typeof cmd.value === "string") { setSearch(cmd.value); return; }
    if (cmd.cmd === "next") {
      const filtered = getFiltered();
      const idx = filtered.findIndex(i => i.id === activeItemId);
      if (idx >= 0 && idx < filtered.length - 1) setActiveItemId(filtered[idx + 1].id);
      return;
    }
    const item = items.find(i => i.id === activeItemId);
    if (!item) { showMsg("Select an item first"); return; }
    if (cmd.cmd === "quantity" && typeof cmd.value === "number") { saveItem(item, { currentStock: cmd.value }); showMsg(`Stock → ${cmd.value}`); }
    if (cmd.cmd === "expired" && typeof cmd.value === "number") { saveItem(item, { expiredQty: cmd.value }); showMsg(`Expired → ${cmd.value}`); }
    if (cmd.cmd === "note" && typeof cmd.value === "string") { saveItem(item, { notes: cmd.value }); showMsg("Note saved"); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItemId, items, saveItem]);

  const { listening, supported, toggle: toggleSpeech } = useSpeech(handleSpeech);

  // ── Filter ─────────────────────────────────────────────────────────────

  function getFiltered() {
    return items.filter(i => {
      if (activeCat !== "all" && i.categorySlug !== activeCat) return false;
      if (search) {
        const s = search.toLowerCase();
        return i.name.toLowerCase().includes(s) || (i.location ?? "").toLowerCase().includes(s) || (i.notes ?? "").toLowerCase().includes(s);
      }
      return true;
    });
  }
  const filtered = getFiltered();

  // Group by location
  const groups: { location: string; items: Item[] }[] = [];
  let lastLoc = "__NONE__";
  for (const item of filtered) {
    const loc = item.location ?? "Other";
    if (loc !== lastLoc) {
      groups.push({ location: loc, items: [] });
      lastLoc = loc;
    }
    groups[groups.length - 1].items.push(item);
  }

  // ── Submit ─────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await fetch("/api/inventory/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categorySlug: activeCat === "all" ? null : activeCat, itemsUpdated: editedCount.current, notes: submitNotes || null, submittedBy: "Inventory User" }),
      });
      showMsg("Inventory submitted"); setShowSubmit(false); setSubmitNotes(""); editedCount.current = 0;
    } catch { showMsg("Submit failed"); }
    finally { setSubmitting(false); }
  }

  async function logout() { await fetch("/api/inventory/logout", { method: "POST" }); router.push("/inventory/login"); }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#040d1a]">
      <div className="text-slate-500 text-lg animate-pulse">Loading inventory...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#040d1a]">
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-30 bg-[#020e1f]/95 backdrop-blur border-b border-white/8">
        {/* Brand + actions */}
        <div className="flex items-center gap-3 px-4 h-12">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[#f0b429]/10 border border-[#f0b429]/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#f0b429]"><path d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z"/></svg>
            </div>
            <span className="text-white font-black text-sm hidden sm:block">Inventory</span>
          </div>

          <div className="flex-1 relative">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-slate-500 absolute left-3 top-1/2 -translate-y-1/2"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#071428] border border-white/10 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-[#f0b429]/40" />
          </div>

          {supported && (
            <button onClick={toggleSpeech} className={`p-2 rounded-lg shrink-0 ${listening ? "bg-red-500/20 text-red-400 animate-pulse" : "text-slate-500 hover:text-white hover:bg-white/5"}`}>
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
            </button>
          )}

          <button onClick={() => setShowSubmit(true)} className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-400/10 shrink-0" title="Submit count">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
          </button>

          <button onClick={logout} className="p-2 rounded-lg text-slate-500 hover:text-red-400 shrink-0" title="Sign out">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
          </button>
        </div>

        {/* Category tabs — horizontal scroll */}
        <div className="flex gap-1 px-3 pb-2 overflow-x-auto scrollbar-none">
          <button onClick={() => setActiveCat("all")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${activeCat === "all" ? "bg-[#f0b429] text-[#040d1a]" : "bg-white/5 text-slate-400 hover:text-white"}`}>
            All ({items.length})
          </button>
          {categories.map(c => (
            <button key={c.slug} onClick={() => { setActiveCat(c.slug); setActiveItemId(null); }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${activeCat === c.slug ? "bg-[#f0b429] text-[#040d1a]" : "bg-white/5 text-slate-400 hover:text-white"}`}>
              {c.name.replace(" Backstock", "").replace(" Supplies", "")}
              {c.low > 0 && <span className="ml-1.5 bg-red-500/80 text-white text-[10px] px-1.5 py-0.5 rounded-full">{c.low}</span>}
            </button>
          ))}
        </div>
      </header>

      {/* ── Items ── */}
      <div className="px-3 pb-24 pt-2 max-w-3xl mx-auto">
        {groups.map((group, gi) => (
          <div key={gi} className="mb-4">
            {/* Location header */}
            <div className="sticky top-[88px] z-20 bg-[#040d1a]/95 backdrop-blur-sm py-2 px-1 mb-1">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#f0b429] shrink-0"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                <span className="text-[#f0b429] text-xs font-black uppercase tracking-wider">{group.location}</span>
                <span className="text-slate-600 text-[10px]">({group.items.length})</span>
              </div>
            </div>

            {/* Items in this location */}
            <div className="space-y-1">
              {group.items.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  isActive={item.id === activeItemId}
                  isSaving={!!saving[item.id]}
                  onTap={() => setActiveItemId(item.id === activeItemId ? null : item.id)}
                  onSave={(u) => saveItem(item, u)}
                />
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-20 text-slate-600">
            {search ? "No items match your search" : "No items. Seed inventory from admin settings."}
          </div>
        )}
      </div>

      {/* ── Submit Modal ── */}
      {showSubmit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4 pb-4">
          <div className="bg-[#071428] border border-white/10 rounded-2xl p-5 w-full max-w-sm">
            <h2 className="text-lg font-black text-white mb-1">Submit Inventory Count</h2>
            <p className="text-slate-500 text-xs mb-3">This notifies the team and creates a record.</p>
            <div className="text-sm text-slate-400 mb-3">
              <span className="text-[#f0b429] font-bold">{editedCount.current}</span> items edited
              {activeCat !== "all" && <span> in <strong className="text-white">{categories.find(c => c.slug === activeCat)?.name}</strong></span>}
            </div>
            <textarea value={submitNotes} onChange={e => setSubmitNotes(e.target.value)} placeholder="Notes (optional)" rows={2}
              className="w-full px-3 py-2 bg-[#040d1a] border border-white/10 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-[#f0b429]/40 mb-3" />
            <div className="flex gap-2">
              <button onClick={() => setShowSubmit(false)} className="flex-1 py-2.5 border border-white/10 rounded-xl text-slate-400 font-semibold text-sm">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-2.5 bg-emerald-500 text-white font-bold text-sm rounded-xl disabled:opacity-50">{submitting ? "..." : "Submit"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#071428] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white font-medium shadow-xl">{toast}</div>}
    </div>
  );
}

// ── Item Card ───────────────────────────────────────────────────────────────

function ItemCard({ item, isActive, isSaving, onTap, onSave }: {
  item: Item; isActive: boolean; isSaving: boolean;
  onTap: () => void;
  onSave: (u: { currentStock?: number; expiredQty?: number; notes?: string }) => void;
}) {
  const [stock, setStock] = useState(String(item.currentStock));
  const [expired, setExpired] = useState(String(item.expiredQty));
  const [notes, setNotes] = useState(item.notes ?? "");

  useEffect(() => { setStock(String(item.currentStock)); setExpired(String(item.expiredQty)); setNotes(item.notes ?? ""); }, [item.currentStock, item.expiredQty, item.notes]);

  function commitStock() { const v = parseInt(stock); if (!isNaN(v) && v !== item.currentStock) onSave({ currentStock: v }); }
  function commitExpired() { const v = parseInt(expired); if (!isNaN(v) && v !== item.expiredQty) onSave({ expiredQty: v }); }
  function commitNotes() { if (notes !== (item.notes ?? "")) onSave({ notes }); }

  const needsOrder = item.qtyToOrder > 0 && !item.skipOrder;

  return (
    <div onClick={onTap} className={`rounded-xl border transition-all ${isActive ? "bg-[#0a1e3d] border-[#f0b429]/30" : "bg-[#071428] border-white/6 hover:border-white/12"}`}>
      {/* Main row — always visible */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Saving indicator */}
        {isSaving && <div className="w-1.5 h-1.5 rounded-full bg-[#f0b429] animate-pulse shrink-0" />}

        {/* Name */}
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold truncate ${needsOrder ? "text-amber-300" : "text-white"}`}>{item.name}</div>
          {item.vendorSource && <div className="text-[10px] text-slate-600 truncate">{item.vendorSource}</div>}
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-center">
            <div className="text-[10px] text-slate-600 uppercase">PAR</div>
            <div className="text-xs text-slate-400 font-bold">{item.par}</div>
          </div>
          <div className="text-center min-w-[36px]">
            <div className="text-[10px] text-slate-600 uppercase">Stock</div>
            <div className={`text-xs font-black ${needsOrder ? "text-amber-400" : "text-emerald-400"}`}>{item.currentStock}</div>
          </div>
          {needsOrder && (
            <div className="text-center">
              <div className="text-[10px] text-slate-600 uppercase">Need</div>
              <div className="text-xs font-black text-red-400">{item.qtyToOrder}</div>
            </div>
          )}
          {item.skipOrder && (
            <span className="text-[9px] text-slate-600 font-bold uppercase bg-white/5 px-1.5 py-0.5 rounded">Skip</span>
          )}
        </div>
      </div>

      {/* Expanded edit row — shown when active */}
      {isActive && (
        <div className="px-3 pb-3 pt-1 border-t border-white/5">
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div>
              <label className="text-[10px] text-slate-500 uppercase block mb-0.5">Stock</label>
              <input type="number" inputMode="numeric" value={stock} onChange={e => setStock(e.target.value)}
                onBlur={commitStock} onKeyDown={e => e.key === "Enter" && commitStock()}
                className={`w-full px-2 py-1.5 text-center rounded-lg border text-sm font-bold bg-[#040d1a] focus:outline-none focus:border-[#f0b429]/50 ${needsOrder ? "border-amber-500/30 text-amber-300" : "border-white/10 text-white"}`} />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase block mb-0.5">Expired</label>
              <input type="number" inputMode="numeric" value={expired} onChange={e => setExpired(e.target.value)}
                onBlur={commitExpired} onKeyDown={e => e.key === "Enter" && commitExpired()}
                className={`w-full px-2 py-1.5 text-center rounded-lg border text-sm bg-[#040d1a] focus:outline-none focus:border-[#f0b429]/50 ${item.expiredQty > 0 ? "border-red-500/30 text-red-400 font-bold" : "border-white/10 text-slate-500"}`} />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase block mb-0.5">Delta</label>
              <div className={`w-full px-2 py-1.5 text-center rounded-lg border border-white/5 text-sm bg-[#040d1a] ${item.delta != null ? (item.delta > 0 ? "text-emerald-400" : item.delta < 0 ? "text-red-400" : "text-slate-600") : "text-slate-700"}`}>
                {item.delta != null ? (item.delta > 0 ? `+${item.delta}` : item.delta) : "—"}
              </div>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase block mb-0.5">Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              onBlur={commitNotes} onKeyDown={e => e.key === "Enter" && commitNotes()}
              placeholder="Add notes..."
              className="w-full px-2 py-1.5 rounded-lg border border-white/10 text-sm text-slate-300 bg-[#040d1a] placeholder-slate-700 focus:outline-none focus:border-[#f0b429]/50" />
          </div>
          {item.priorStock != null && (
            <div className="mt-1.5 text-[10px] text-slate-600">Prior count: {item.priorStock}</div>
          )}
        </div>
      )}
    </div>
  );
}

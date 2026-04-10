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

function calcNeed(item: Item): number {
  if (item.skipOrder) return 0;
  const usable = Math.max(0, item.currentStock - item.expiredQty);
  return Math.max(0, item.par - usable);
}

/* ── Continuous speech ──────────────────────────────────────────────────── */

function useSpeech(onResult: (t: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [lastHeard, setLastHeard] = useState("");
  const activeRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);
  const cbRef = useRef(onResult);
  cbRef.current = onResult;

  // Detect iOS — continuous mode doesn't work there
  const isIOS = useRef(false);

  useEffect(() => {
    isIOS.current = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    const SR = (window as unknown as Record<string, unknown>).SpeechRecognition ||
               (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    setSupported(!!SR);
    if (!SR) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = new (SR as any)();
    // iOS: single-shot mode only. Android/Desktop: continuous.
    r.continuous = !isIOS.current;
    r.interimResults = false;
    r.lang = "en-US";
    r.maxAlternatives = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      // Get the latest final result
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const t = e.results[i][0]?.transcript?.trim();
          if (t) {
            setLastHeard(t);
            cbRef.current(t);
          }
        }
      }
    };
    r.onend = () => {
      // Auto-restart if still active
      if (activeRef.current) {
        // Small delay before restart to prevent rapid cycling
        setTimeout(() => {
          if (activeRef.current) {
            try { r.start(); } catch { /* already running or denied */ }
          }
        }, 300);
      } else {
        setListening(false);
      }
    };
    r.onerror = (ev: { error: string }) => {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
        activeRef.current = false;
        setListening(false);
        setLastHeard("Microphone access denied");
      }
      // "no-speech", "aborted", "network" — onend will auto-restart
    };
    recRef.current = r;
  }, []);

  const toggle = useCallback(() => {
    if (!recRef.current) return;
    if (activeRef.current) {
      activeRef.current = false;
      try { recRef.current.stop(); } catch {}
      setListening(false);
      setLastHeard("");
    } else {
      activeRef.current = true;
      setLastHeard("Listening...");
      try {
        recRef.current.start();
        setListening(true);
      } catch {
        // Might already be started, try stop then start
        try { recRef.current.stop(); } catch {}
        setTimeout(() => {
          try { recRef.current.start(); setListening(true); } catch { activeRef.current = false; setLastHeard("Could not start mic"); }
        }, 200);
      }
    }
  }, []);

  return { listening, supported, toggle, lastHeard };
}

/* ── Main ───────────────────────────────────────────────────────────────── */

export default function StateInventoryDashboard() {
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
      const r = await fetch("/api/inventory/items?type=state");
      if (!r.ok) { router.push("/inventory/login"); return; }
      const data = await r.json() as Item[];
      setItems(data); lastPoll.current = new Date().toISOString();
      if (!activeCat && data.length > 0) setActiveCat(data[0].categorySlug ?? "unknown");
    } catch { router.push("/inventory/login"); } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);
  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`/api/inventory/items?type=state&since=${encodeURIComponent(lastPoll.current)}`);
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
      if (r.status === 409) { const d = await r.json(); if (d.item) setItems(p => p.map(i => i.id === item.id ? d.item : i)); msg("Conflict — refreshed"); return; }
      if (r.ok) { const u = await r.json(); setItems(p => p.map(i => i.id === item.id ? u : i)); editedCount.current++; }
    } catch { msg("Save failed"); } finally { setSaving(s => ({ ...s, [item.id]: false })); }
  }, []);

  function msg(t: string) { setToast(t); setTimeout(() => setToast(null), 2500); }

  /** Speak item name aloud using text-to-speech */
  function speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // stop any current speech
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.1;
    u.pitch = 1;
    u.volume = 1;
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  }

  /** Move to an item and read its name aloud */
  function goToItem(idx: number) {
    const fil = getFiltered();
    const clamped = Math.max(0, Math.min(idx, fil.length - 1));
    setFocusedIdx(clamped);
    const item = fil[clamped];
    if (item) speak(item.name);
  }

  const wordNums: Record<string, number> = { zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50 };
  function parseNum(s: string): number | null { const n = parseInt(s); if (!isNaN(n)) return n; return wordNums[s] ?? null; }

  const handleSpeech = useCallback((transcript: string) => {
    const l = transcript.toLowerCase().trim();
    const fil = getFiltered();
    const cur = fil[focusedIdx];

    // "next" — advance and read next item name
    if (l === "next" || l === "next item" || l === "next one") {
      goToItem(focusedIdx + 1);
      return;
    }

    // "go back" / "back" / "previous" / "redo" — go back one and read it
    if (l === "back" || l === "go back" || l === "previous" || l === "redo" || l === "go back one") {
      goToItem(focusedIdx - 1);
      return;
    }

    // "erase" / "clear" — wipe current line (stock=0, expired=0, notes="")
    if (l === "erase" || l === "clear" || l === "delete" || l === "remove") {
      if (cur) {
        saveItem(cur, { currentStock: 0, expiredQty: 0, notes: "" });
        msg("Erased");
        speak("Erased");
      }
      return;
    }

    // "skip" — set 0 and advance, read next name
    if (l === "skip") {
      if (cur) saveItem(cur, { currentStock: 0 });
      goToItem(focusedIdx + 1);
      return;
    }

    // "expired N"
    const em = l.match(/expired?\s+(\w+)/);
    if (em && cur) { const n = parseNum(em[1]); if (n !== null) { saveItem(cur, { expiredQty: n }); msg(`Exp → ${n}`); speak(`Expired ${n}`); return; } }

    // "note ..."
    if (l.startsWith("note ") && cur) { saveItem(cur, { notes: l.slice(5) }); msg("Note saved"); speak("Note saved"); return; }

    // Plain number — set stock, auto-advance, read next item name
    const qm = l.match(/(?:quantity|stock|count|set)\s+(?:to\s+)?(\w+)/);
    const num = parseNum(qm ? qm[1] : l);
    if (num !== null && cur) {
      saveItem(cur, { currentStock: num });
      // Brief delay then advance and read next
      setTimeout(() => goToItem(focusedIdx + 1), 400);
      msg(`${num} → next`);
      return;
    }

    msg(`"${transcript}" ?`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedIdx, saveItem, items, activeCat, search]);
  const { listening, supported, toggle: toggleSpeech, lastHeard } = useSpeech(handleSpeech);

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
  for (const item of filtered) { const loc = item.location ?? "Other"; if (loc !== lastLoc) { groups.push({ loc, items: [] }); lastLoc = loc; } groups[groups.length - 1].items.push(item); }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await fetch("/api/inventory/submit", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categorySlug: activeCat, itemsUpdated: editedCount.current, notes: submitNotes || null, submittedBy: "State Inventory" }) });
      msg("Submitted!"); setShowSubmit(false); setSubmitNotes(""); editedCount.current = 0;
    } catch { msg("Failed"); } finally { setSubmitting(false); }
  }

  async function logout() { router.push("/inventory"); }

  if (loading) return <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950"><div className="text-slate-400 animate-pulse text-lg">Loading...</div></div>;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col overflow-hidden" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>

      {/* ══ HEADER ══ */}
      <header className="shrink-0 bg-slate-900 border-b border-slate-700">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-yellow-400"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
            </div>
            <div className="hidden sm:block">
              <div className="text-white font-black text-sm leading-none">State Inventory</div>
              <div className="text-yellow-400/60 text-[9px] font-bold uppercase tracking-widest mt-0.5">Millstadt EMS</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {supported && (
              <button onClick={() => { toggleSpeech(); if (!listening) { const fil = getFiltered(); const item = fil[focusedIdx]; if (item) setTimeout(() => speak(item.name), 500); } }} className={`h-9 rounded-xl flex items-center gap-1.5 px-3 text-sm font-bold transition ${listening ? "bg-red-500/25 text-red-400 ring-2 ring-red-500/50" : "bg-slate-800 text-slate-400 active:bg-slate-700"}`}>
                <svg viewBox="0 0 24 24" className={`w-5 h-5 fill-current ${listening ? "animate-pulse" : ""}`}><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                {listening ? "LIVE" : "Mic"}
              </button>
            )}
            <button onClick={() => setShowSubmit(true)} className="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-400 active:bg-emerald-500/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
            </button>
            <button onClick={logout} className="h-9 w-9 rounded-xl bg-slate-800 text-slate-400 active:text-white flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>
          </div>
        </div>
      </header>

      {/* ══ CATEGORIES ══ */}
      <div className="shrink-0 bg-slate-900/70 border-b border-slate-800">
        <div className="max-w-[1200px] mx-auto px-3 sm:px-8 py-2 flex gap-2 overflow-x-auto" style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
          {categories.map(c => (
            <button key={c.slug} onClick={() => { setActiveCat(c.slug); setFocusedIdx(0); }}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${activeCat === c.slug ? "bg-yellow-500 text-slate-900" : "bg-slate-800 text-slate-300 active:bg-slate-700"}`}>
              {c.name}
              {c.low > 0 && <span className="ml-1.5 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{c.low}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ══ SEARCH (collapsible on mobile) ══ */}
      <div className="shrink-0 bg-slate-950">
        <div className="max-w-[1200px] mx-auto px-3 sm:px-8 py-2">
          <div className="relative">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-slate-500 absolute left-3 top-1/2 -translate-y-1/2"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-yellow-500/40" />
          </div>
        </div>
      </div>

      {/* ══ COLUMN HEADERS (desktop only) ══ */}
      <div className="shrink-0 hidden md:block bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-[1000px] mx-auto px-10 lg:px-16">
          <div className="grid grid-cols-[1fr_60px_90px_60px_80px] gap-2 py-2 text-[10px] text-slate-500 uppercase tracking-wider font-bold px-10">
            <div className="pl-4">Item</div>
            <div className="text-center">PAR</div>
            <div className="text-center">Stock</div>
            <div className="text-center">Need</div>
            <div className="text-center">Expired</div>
          </div>
        </div>
      </div>

      {/* ══ ITEMS ══ */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-[1000px] mx-auto px-5 sm:px-10 lg:px-16 py-2 pb-20">
          {(() => {
            let gIdx = 0;
            return groups.map((g, gi) => (
              <div key={gi} className="mb-3">
                {/* Section header */}
                <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm py-1.5">
                  <div className="bg-slate-800 border-l-4 border-yellow-400 rounded-r-lg px-4 py-2 flex items-center gap-2">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-yellow-400 shrink-0"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                    <span className="text-yellow-400 text-[11px] font-bold uppercase tracking-wide flex-1">{g.loc}</span>
                    <span className="text-slate-500 text-[10px]">{g.items.length}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-px">
                  {g.items.map((item, idx) => {
                    const thisIdx = gIdx++;
                    return <ItemRow key={item.id} item={item} isSaving={!!saving[item.id]} onSave={u => saveItem(item, u)} even={idx % 2 === 0} focused={listening && thisIdx === focusedIdx} />;
                  })}
                </div>
              </div>
            ));
          })()}

          {filtered.length === 0 && <div className="text-center py-20 text-slate-600">{search ? "No matches" : "No items"}</div>}
        </div>
      </div>

      {/* ══ SUBMIT MODAL ══ */}
      {showSubmit && (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-5 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-black text-white mb-1">Submit Count</h2>
            <p className="text-slate-400 text-sm mb-3">{editedCount.current} items edited</p>
            <textarea value={submitNotes} onChange={e => setSubmitNotes(e.target.value)} placeholder="Notes (optional)" rows={2}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none mb-3 resize-none" />
            <div className="flex gap-3">
              <button onClick={() => setShowSubmit(false)} className="flex-1 py-3 border border-slate-600 rounded-xl text-slate-300 font-semibold text-sm">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-3 bg-emerald-500 text-white font-bold text-sm rounded-xl disabled:opacity-50">{submitting ? "..." : "Submit"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ VOICE PANEL — shows when mic is active ══ */}
      {listening && (
        <div className="fixed bottom-0 left-0 right-0 z-[10000] bg-slate-900 border-t border-red-500/30 shadow-2xl" style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}>
          <div className="max-w-[1000px] mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              {/* Pulsing mic indicator */}
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              </div>
              {/* Current item + last heard */}
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-bold truncate">
                  {filtered[focusedIdx]?.name ?? "No item selected"}
                </div>
                <div className="text-slate-400 text-xs truncate">
                  {lastHeard || "Say a number · next · go back · erase · skip · expired 2"}
                </div>
              </div>
              {/* Stop button */}
              <button onClick={toggleSpeech} className="shrink-0 px-4 py-2 rounded-xl bg-red-500/20 text-red-400 text-sm font-bold active:bg-red-500/30">
                Stop
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && !listening && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white shadow-2xl">{toast}</div>}
    </div>
  );
}

/* ══ ITEM ROW — responsive: stacked on mobile, grid on desktop ══ */

function ItemRow({ item, isSaving, onSave, even, focused }: {
  item: Item; isSaving: boolean; even: boolean; focused?: boolean;
  onSave: (u: { currentStock?: number; expiredQty?: number; notes?: string }) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (focused && rowRef.current) rowRef.current.scrollIntoView({ behavior: "smooth", block: "center" }); }, [focused]);

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

  const need = calcNeed(item);
  const needsOrder = need > 0;

  return (
    <div ref={rowRef} className={`transition-colors ${focused ? "bg-yellow-500/10 ring-1 ring-yellow-500/30 ring-inset" : even ? "bg-slate-900/80" : "bg-slate-900/40"} ${isSaving ? "opacity-60" : ""}`}>

      {/* ── MOBILE layout (stacked) ── */}
      <div className="md:hidden px-4 py-3">
        {/* Item name row */}
        <button onClick={() => setShowNotes(!showNotes)} className="text-left w-full mb-2">
          <div className={`text-[15px] font-semibold leading-snug break-words ${needsOrder ? "text-amber-300" : "text-white"}`}>
            {item.name}
          </div>
          {item.vendorSource && <div className="text-[11px] text-slate-500 mt-0.5">{item.vendorSource}</div>}
        </button>

        {/* Values row — 4 columns, big touch targets */}
        <div className="grid grid-cols-4 gap-2">
          {/* PAR */}
          <div className="text-center">
            <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">PAR</div>
            <div className="text-lg text-slate-400 font-bold">{item.par}</div>
          </div>

          {/* Stock */}
          <div className="text-center">
            <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Stock</div>
            <input type="number" inputMode="numeric" value={stock} onChange={e => setStock(e.target.value)}
              onBlur={commitStock} onKeyDown={e => e.key === "Enter" && commitStock()} placeholder="—"
              className={`w-full px-1 py-2 text-center rounded-xl border text-lg font-black focus:outline-none focus:ring-2 focus:ring-yellow-500/50 ${
                item.currentStock > 0 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-slate-800 border-slate-600 text-slate-400"
              }`} />
          </div>

          {/* Need */}
          <div className="text-center">
            <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Need</div>
            {item.skipOrder ? (
              <div className="text-xs text-slate-600 font-bold pt-2">SKIP</div>
            ) : needsOrder ? (
              <div className="text-lg font-black text-red-400 bg-red-500/10 rounded-xl py-2">{need}</div>
            ) : (
              <div className="text-lg text-slate-700 pt-2">—</div>
            )}
          </div>

          {/* Expired */}
          <div className="text-center">
            <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Exp</div>
            <input type="number" inputMode="numeric" value={expired} onChange={e => setExpired(e.target.value)}
              onBlur={commitExpired} onKeyDown={e => e.key === "Enter" && commitExpired()} placeholder="—"
              className={`w-full px-1 py-2 text-center rounded-xl border text-lg font-bold focus:outline-none focus:ring-2 focus:ring-yellow-500/50 ${
                item.expiredQty > 0 ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-slate-800 border-slate-600 text-slate-500"
              }`} />
          </div>
        </div>
      </div>

      {/* ── DESKTOP layout (single grid row) ── */}
      <div className="hidden md:grid grid-cols-[1fr_60px_90px_60px_80px] gap-2 items-center px-10 py-3">
        <div className="pl-4 pr-4 min-w-0">
          <button onClick={() => setShowNotes(!showNotes)} className="text-left w-full group">
            <div className={`text-sm font-medium leading-snug break-words group-hover:underline decoration-slate-600 ${needsOrder ? "text-amber-300" : "text-white"}`}>{item.name}</div>
            {item.vendorSource && <div className="text-[11px] text-slate-500 mt-0.5">{item.vendorSource}</div>}
          </button>
        </div>
        <div className="text-center text-sm text-slate-400 font-mono font-semibold">{item.par}</div>
        <div className="flex justify-center">
          <input type="number" inputMode="numeric" value={stock} onChange={e => setStock(e.target.value)}
            onBlur={commitStock} onKeyDown={e => e.key === "Enter" && commitStock()} placeholder="—"
            className={`w-[70px] px-2 py-1.5 text-center rounded-lg border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-yellow-500/40 ${
              item.currentStock > 0 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-slate-800 border-slate-600 text-slate-400"
            }`} />
        </div>
        <div className="text-center">
          {item.skipOrder ? <span className="text-[10px] text-slate-600 font-bold">SKIP</span>
          : needsOrder ? <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-500/15 text-red-400 text-sm font-black">{need}</span>
          : <span className="text-slate-600">—</span>}
        </div>
        <div className="flex justify-center">
          <input type="number" inputMode="numeric" value={expired} onChange={e => setExpired(e.target.value)}
            onBlur={commitExpired} onKeyDown={e => e.key === "Enter" && commitExpired()} placeholder="—"
            className={`w-[70px] px-2 py-1.5 text-center rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/40 ${
              item.expiredQty > 0 ? "bg-red-500/10 border-red-500/30 text-red-400 font-bold" : "bg-slate-800 border-slate-600 text-slate-500"
            }`} />
        </div>
      </div>

      {/* Notes */}
      {showNotes && (
        <div className="px-4 md:px-14 pb-3">
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} onBlur={commitNotes}
            onKeyDown={e => e.key === "Enter" && commitNotes()} placeholder="Add notes..."
            className="w-full px-3 py-2 rounded-xl border border-slate-600 bg-slate-800 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-yellow-500/40" />
        </div>
      )}
    </div>
  );
}

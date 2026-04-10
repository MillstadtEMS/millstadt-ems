"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  hasExpiry: boolean;
}

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

// ── Speech recognition hook ─────────────────────────────────────────────────

function useSpeech(onResult: (transcript: string) => void) {
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
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (e: any) => {
        const t = e.results[0]?.[0]?.transcript?.trim();
        if (t) onResult(t);
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      recRef.current = rec;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = useCallback(() => {
    if (!recRef.current) return;
    if (listening) {
      recRef.current.stop();
    } else {
      recRef.current.start();
      setListening(true);
    }
  }, [listening]);

  return { listening, supported, toggle };
}

// ── Parse speech commands ────────────────────────────────────────────────────

function parseSpeechCommand(text: string): { cmd: string; value?: string | number } | null {
  const lower = text.toLowerCase().trim();

  // "next" command
  if (lower === "next" || lower === "next item" || lower === "go next") {
    return { cmd: "next" };
  }

  // "quantity N" or "stock N" or "count N" or just a number
  const qtyMatch = lower.match(/(?:quantity|stock|count|set)\s+(?:to\s+)?(\d+)/);
  if (qtyMatch) return { cmd: "quantity", value: parseInt(qtyMatch[1]) };

  // "expired N"
  const expMatch = lower.match(/expired\s+(\d+)/);
  if (expMatch) return { cmd: "expired", value: parseInt(expMatch[1]) };

  // "note ..."
  const noteMatch = lower.match(/^note\s+(.+)/);
  if (noteMatch) return { cmd: "note", value: noteMatch[1] };

  // "item ..."
  const itemMatch = lower.match(/^(?:item|find|search)\s+(.+)/);
  if (itemMatch) return { cmd: "search", value: itemMatch[1] };

  // Plain number
  const plainNum = lower.match(/^(\d+)$/);
  if (plainNum) return { cmd: "quantity", value: parseInt(plainNum[1]) };

  // Word numbers
  const wordNums: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
    eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20,
  };
  if (wordNums[lower] !== undefined) return { cmd: "quantity", value: wordNums[lower] };

  return null;
}

// ── Debounce save ────────────────────────────────────────────────────────────

function useDebounce(fn: () => void, delay: number) {
  const timer = useRef<NodeJS.Timeout>(undefined);
  return useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(fn, delay);
  }, [fn, delay]);
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function InventoryDashboard() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [conflicts, setConflicts] = useState<Set<string>>(new Set());
  const [activeRow, setActiveRow] = useState<number>(0);
  const [toast, setToast] = useState<string | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitNotes, setSubmitNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const lastPoll = useRef(new Date().toISOString());
  const editedCount = useRef(0);

  // ── Fetch data ─────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const [catRes, itemRes] = await Promise.all([
        fetch("/api/inventory/items?category=").then(r => r.ok ? r.json() : []),
        fetch("/api/inventory/items").then(r => r.ok ? r.json() : null),
      ]);
      if (itemRes === null) {
        router.push("/inventory/login");
        return;
      }
      // Extract unique categories from items
      const catMap = new Map<string, Category>();
      for (const item of (itemRes as Item[])) {
        if (item.categorySlug && !catMap.has(item.categorySlug)) {
          catMap.set(item.categorySlug, {
            id: item.categoryId,
            name: item.categoryName ?? item.categorySlug,
            slug: item.categorySlug,
            sortOrder: 0,
            hasExpiry: false,
          });
        }
      }
      setCategories(Array.from(catMap.values()));
      setItems(itemRes as Item[]);
      lastPoll.current = new Date().toISOString();
    } catch {
      router.push("/inventory/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Polling for real-time sync ─────────────────────────────────────────────

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/inventory/items?since=${encodeURIComponent(lastPoll.current)}`);
        if (!res.ok) return;
        const updated = (await res.json()) as Item[];
        if (updated.length > 0) {
          setItems(prev => {
            const map = new Map(prev.map(i => [i.id, i]));
            for (const u of updated) {
              // Don't overwrite if we're currently saving this item
              if (!saving[u.id]) {
                map.set(u.id, u);
              }
            }
            return Array.from(map.values()).sort((a, b) => a.sortOrder - b.sortOrder);
          });
          lastPoll.current = new Date().toISOString();
        }
      } catch { /* polling failure is non-fatal */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [saving]);

  // ── Save item ──────────────────────────────────────────────────────────────

  const saveItem = useCallback(async (item: Item, updates: Partial<Item>) => {
    setSaving(s => ({ ...s, [item.id]: true }));
    try {
      const res = await fetch(`/api/inventory/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: item.version,
          currentStock: updates.currentStock,
          expiredQty: updates.expiredQty,
          notes: updates.notes,
          par: updates.par,
        }),
      });
      if (res.status === 409) {
        setConflicts(c => new Set(c).add(item.id));
        const data = await res.json();
        if (data.item) {
          setItems(prev => prev.map(i => i.id === item.id ? data.item : i));
        }
        showToast("Conflict — another user updated this item. Refreshed.");
        return;
      }
      if (res.ok) {
        const updated = await res.json();
        setItems(prev => prev.map(i => i.id === item.id ? updated : i));
        setConflicts(c => { const n = new Set(c); n.delete(item.id); return n; });
        editedCount.current++;
      }
    } catch {
      showToast("Save failed — check connection");
    } finally {
      setSaving(s => ({ ...s, [item.id]: false }));
    }
  }, []);

  // ── Toast ──────────────────────────────────────────────────────────────────

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // ── Speech ─────────────────────────────────────────────────────────────────

  const handleSpeech = useCallback((transcript: string) => {
    const cmd = parseSpeechCommand(transcript);
    if (!cmd) {
      showToast(`Didn't understand: "${transcript}"`);
      return;
    }

    const filtered = filteredItems;
    const currentItem = filtered[activeRow];

    if (cmd.cmd === "next") {
      setActiveRow(r => Math.min(r + 1, filtered.length - 1));
      showToast("Next item");
      return;
    }

    if (cmd.cmd === "search" && typeof cmd.value === "string") {
      setSearch(cmd.value);
      showToast(`Searching: ${cmd.value}`);
      return;
    }

    if (!currentItem) return;

    if (cmd.cmd === "quantity" && typeof cmd.value === "number") {
      saveItem(currentItem, { currentStock: cmd.value });
      showToast(`Stock → ${cmd.value}`);
      return;
    }

    if (cmd.cmd === "expired" && typeof cmd.value === "number") {
      saveItem(currentItem, { expiredQty: cmd.value });
      showToast(`Expired → ${cmd.value}`);
      return;
    }

    if (cmd.cmd === "note" && typeof cmd.value === "string") {
      saveItem(currentItem, { notes: cmd.value });
      showToast(`Note saved`);
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRow, saveItem]);

  const { listening, supported, toggle: toggleSpeech } = useSpeech(handleSpeech);

  // ── Filter items ───────────────────────────────────────────────────────────

  const filteredItems = items.filter(item => {
    if (activeCategory !== "all" && item.categorySlug !== activeCategory) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(s) ||
        (item.location ?? "").toLowerCase().includes(s) ||
        (item.notes ?? "").toLowerCase().includes(s)
      );
    }
    return true;
  });

  // ── Submit inventory ───────────────────────────────────────────────────────

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await fetch("/api/inventory/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categorySlug: activeCategory === "all" ? null : activeCategory,
          itemsUpdated: editedCount.current,
          notes: submitNotes || null,
          submittedBy: "Inventory User",
        }),
      });
      showToast("Inventory submitted successfully");
      setShowSubmit(false);
      setSubmitNotes("");
      editedCount.current = 0;
    } catch {
      showToast("Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  async function logout() {
    await fetch("/api/inventory/logout", { method: "POST" });
    router.push("/inventory/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#040d1a]">
        <div className="text-slate-500 text-lg">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#040d1a] flex overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#020f24] border-r border-white/8 flex flex-col transition-transform duration-300 ${sideOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <div className="px-5 pt-5 pb-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#f0b429]/10 border border-[#f0b429]/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#f0b429]">
                <path d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z"/>
              </svg>
            </div>
            <div>
              <div className="text-white font-black text-xs tracking-wider uppercase">Inventory</div>
              <div className="text-[#f0b429] text-[9px] tracking-[0.2em] uppercase mt-0.5">Millstadt EMS</div>
            </div>
          </div>
        </div>

        {/* Category nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          <button
            onClick={() => { setActiveCategory("all"); setSideOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeCategory === "all"
                ? "bg-[#f0b429]/15 text-[#f0b429] border border-[#f0b429]/25"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
            All Items
            <span className="ml-auto text-xs opacity-60">{items.length}</span>
          </button>
          {categories.map(cat => {
            const count = items.filter(i => i.categorySlug === cat.slug).length;
            const lowCount = items.filter(i => i.categorySlug === cat.slug && i.qtyToOrder > 0 && !i.skipOrder).length;
            return (
              <button
                key={cat.slug}
                onClick={() => { setActiveCategory(cat.slug); setSideOpen(false); setActiveRow(0); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeCategory === cat.slug
                    ? "bg-[#f0b429]/15 text-[#f0b429] border border-[#f0b429]/25"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                }`}
              >
                <span className="truncate flex-1 text-left">{cat.name}</span>
                <span className="flex items-center gap-1.5">
                  {lowCount > 0 && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-bold">{lowCount}</span>}
                  <span className="text-xs opacity-60">{count}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-2 py-3 border-t border-white/8 space-y-1">
          <button
            onClick={() => setShowSubmit(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-emerald-400 hover:bg-emerald-400/10 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
            Submit Count
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-red-400 hover:bg-red-400/5 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sideOpen && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSideOpen(false)} />}

      {/* Sidebar spacer */}
      <div className="hidden lg:block w-64 shrink-0" />

      {/* ── Main ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-14 bg-[#010c1e]/95 backdrop-blur border-b border-white/8 flex items-center px-4 gap-3 shrink-0">
          <button onClick={() => setSideOpen(v => !v)} className="lg:hidden text-slate-400 hover:text-white">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
          </button>

          {/* Search */}
          <div className="flex-1 relative max-w-md">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-slate-500 absolute left-3 top-1/2 -translate-y-1/2"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search items..."
              className="w-full pl-9 pr-4 py-2 bg-[#071428] border border-white/10 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-[#f0b429]/40"
            />
          </div>

          {/* Speech toggle */}
          {supported && (
            <button
              onClick={toggleSpeech}
              className={`p-2 rounded-lg transition-all ${
                listening
                  ? "bg-red-500/20 text-red-400 animate-pulse"
                  : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
              }`}
              title={listening ? "Stop listening" : "Voice commands"}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>
          )}

          {/* Item count */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <span className="font-bold text-slate-300">{filteredItems.length}</span> items
          </div>
        </header>

        {/* ── Item table ── */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[#071428] border-b border-white/10">
              <tr>
                <th className="text-left px-3 py-2.5 text-slate-500 font-semibold text-xs uppercase tracking-wider">Item</th>
                <th className="text-left px-2 py-2.5 text-slate-500 font-semibold text-xs uppercase tracking-wider hidden md:table-cell">Location</th>
                <th className="text-center px-2 py-2.5 text-slate-500 font-semibold text-xs uppercase tracking-wider w-16">PAR</th>
                <th className="text-center px-2 py-2.5 text-slate-500 font-semibold text-xs uppercase tracking-wider w-20">Stock</th>
                <th className="text-center px-2 py-2.5 text-slate-500 font-semibold text-xs uppercase tracking-wider w-16">Order</th>
                <th className="text-center px-2 py-2.5 text-slate-500 font-semibold text-xs uppercase tracking-wider w-16 hidden sm:table-cell">Exp</th>
                <th className="text-center px-2 py-2.5 text-slate-500 font-semibold text-xs uppercase tracking-wider w-16 hidden lg:table-cell">Prior</th>
                <th className="text-center px-2 py-2.5 text-slate-500 font-semibold text-xs uppercase tracking-wider w-16 hidden lg:table-cell">Delta</th>
                <th className="text-left px-2 py-2.5 text-slate-500 font-semibold text-xs uppercase tracking-wider hidden xl:table-cell">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, idx) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  isActive={idx === activeRow}
                  isConflict={conflicts.has(item.id)}
                  isSaving={!!saving[item.id]}
                  onClick={() => setActiveRow(idx)}
                  onSave={(updates) => saveItem(item, updates)}
                />
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-20 text-slate-600">
                    {search ? "No items match your search" : "No items found. Seed inventory from admin."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Submit modal ── */}
      {showSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60">
          <div className="bg-[#071428] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-black text-white mb-1">Submit Inventory Count</h2>
            <p className="text-slate-500 text-sm mb-4">This will notify the team and create a record.</p>

            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-400">Category</span>
                <span className="text-white font-semibold">{activeCategory === "all" ? "All Categories" : categories.find(c => c.slug === activeCategory)?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Items edited</span>
                <span className="text-[#f0b429] font-semibold">{editedCount.current}</span>
              </div>
            </div>

            <textarea
              value={submitNotes}
              onChange={e => setSubmitNotes(e.target.value)}
              placeholder="Add notes (optional)"
              rows={3}
              className="w-full px-3 py-2.5 bg-[#040d1a] border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-[#f0b429]/40 mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmit(false)}
                className="flex-1 py-3 border border-white/10 rounded-xl text-slate-400 font-semibold hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#071428] border border-white/15 rounded-xl px-5 py-3 text-sm text-white font-medium shadow-xl animate-[fadeIn_0.2s]">
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Item Row Component ───────────────────────────────────────────────────────

function ItemRow({
  item,
  isActive,
  isConflict,
  isSaving,
  onClick,
  onSave,
}: {
  item: Item;
  isActive: boolean;
  isConflict: boolean;
  isSaving: boolean;
  onClick: () => void;
  onSave: (updates: Partial<Item>) => void;
}) {
  const [localStock, setLocalStock] = useState(String(item.currentStock));
  const [localExpired, setLocalExpired] = useState(String(item.expiredQty));
  const [localNotes, setLocalNotes] = useState(item.notes ?? "");

  // Sync from server updates
  useEffect(() => {
    setLocalStock(String(item.currentStock));
    setLocalExpired(String(item.expiredQty));
    setLocalNotes(item.notes ?? "");
  }, [item.currentStock, item.expiredQty, item.notes]);

  function commitStock() {
    const val = parseInt(localStock);
    if (!isNaN(val) && val !== item.currentStock) {
      onSave({ currentStock: val });
    }
  }

  function commitExpired() {
    const val = parseInt(localExpired);
    if (!isNaN(val) && val !== item.expiredQty) {
      onSave({ expiredQty: val });
    }
  }

  function commitNotes() {
    if (localNotes !== (item.notes ?? "")) {
      onSave({ notes: localNotes });
    }
  }

  const needsOrder = item.qtyToOrder > 0 && !item.skipOrder;
  const delta = item.delta;

  return (
    <tr
      onClick={onClick}
      className={`border-b border-white/5 transition-colors cursor-pointer ${
        isActive ? "bg-[#f0b429]/5" : "hover:bg-white/[0.02]"
      } ${isConflict ? "bg-red-500/5" : ""}`}
    >
      {/* Item name */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          {isSaving && (
            <div className="w-1.5 h-1.5 rounded-full bg-[#f0b429] animate-pulse shrink-0" />
          )}
          <div className="min-w-0">
            <div className={`font-semibold text-sm truncate ${needsOrder ? "text-amber-300" : "text-white"}`}>
              {item.name}
            </div>
            {item.vendorSource && (
              <div className="text-[10px] text-slate-600 truncate">{item.vendorSource}</div>
            )}
            {/* Mobile-only location */}
            <div className="md:hidden text-[10px] text-slate-600 truncate">{item.location}</div>
          </div>
        </div>
      </td>

      {/* Location */}
      <td className="px-2 py-2 text-slate-500 text-xs hidden md:table-cell">
        <span className="truncate block max-w-[140px]">{item.location}</span>
      </td>

      {/* PAR */}
      <td className="px-2 py-2 text-center text-slate-400 font-mono text-xs">{item.par}</td>

      {/* Current Stock - editable */}
      <td className="px-1 py-1 text-center">
        <input
          type="number"
          inputMode="numeric"
          value={localStock}
          onChange={e => setLocalStock(e.target.value)}
          onBlur={commitStock}
          onKeyDown={e => e.key === "Enter" && commitStock()}
          className={`w-16 px-2 py-1.5 text-center rounded-lg border text-sm font-bold bg-[#040d1a] focus:outline-none focus:border-[#f0b429]/50 ${
            needsOrder
              ? "border-amber-500/30 text-amber-300"
              : "border-white/10 text-white"
          }`}
        />
      </td>

      {/* Qty to Order */}
      <td className="px-2 py-2 text-center">
        {item.skipOrder ? (
          <span className="text-[10px] text-slate-600 font-bold uppercase">Skip</span>
        ) : needsOrder ? (
          <span className="text-amber-400 font-bold text-sm">{item.qtyToOrder}</span>
        ) : (
          <span className="text-emerald-500/50 text-xs">0</span>
        )}
      </td>

      {/* Expired */}
      <td className="px-1 py-1 text-center hidden sm:table-cell">
        <input
          type="number"
          inputMode="numeric"
          value={localExpired}
          onChange={e => setLocalExpired(e.target.value)}
          onBlur={commitExpired}
          onKeyDown={e => e.key === "Enter" && commitExpired()}
          className={`w-14 px-2 py-1.5 text-center rounded-lg border text-xs bg-[#040d1a] focus:outline-none focus:border-[#f0b429]/50 ${
            item.expiredQty > 0
              ? "border-red-500/30 text-red-400"
              : "border-white/10 text-slate-500"
          }`}
        />
      </td>

      {/* Prior */}
      <td className="px-2 py-2 text-center text-slate-500 font-mono text-xs hidden lg:table-cell">
        {item.priorStock ?? "—"}
      </td>

      {/* Delta */}
      <td className="px-2 py-2 text-center hidden lg:table-cell">
        {delta != null ? (
          <span className={`text-xs font-bold ${delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-slate-600"}`}>
            {delta > 0 ? `+${delta}` : delta}
          </span>
        ) : (
          <span className="text-slate-700">—</span>
        )}
      </td>

      {/* Notes */}
      <td className="px-1 py-1 hidden xl:table-cell">
        <input
          type="text"
          value={localNotes}
          onChange={e => setLocalNotes(e.target.value)}
          onBlur={commitNotes}
          onKeyDown={e => e.key === "Enter" && commitNotes()}
          placeholder="—"
          className="w-full px-2 py-1.5 bg-transparent border border-transparent rounded text-xs text-slate-400 placeholder-slate-700 focus:outline-none focus:border-white/10 focus:bg-[#040d1a]"
        />
      </td>
    </tr>
  );
}

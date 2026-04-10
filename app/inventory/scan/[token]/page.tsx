"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";

interface ScanItem {
  id: string;
  name: string;
  location: string | null;
  categoryName: string;
  par: number;
  currentStock: number;
  expiredQty: number;
  qtyToOrder: number;
  version: number;
}

interface QueuedUpdate {
  token: string;
  item: ScanItem;
  recommendedQty: number;
  notes: string;
}

export default function QrScanPage() {
  const params = useParams();
  const token = params.token as string;

  const [item, setItem] = useState<ScanItem | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [queue, setQueue] = useState<QueuedUpdate[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchItem = useCallback(async () => {
    try {
      const res = await fetch(`/api/inventory/scan/${token}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Invalid QR code");
        return;
      }
      const data = await res.json();
      setItem(data);
      setQty(String(data.currentStock));
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  function addToQueue() {
    if (!item) return;
    const recQty = parseInt(qty);
    if (isNaN(recQty)) return;

    setQueue(q => [...q, {
      token,
      item,
      recommendedQty: recQty,
      notes,
    }]);
    setQty("");
    setNotes("");
    setItem(null);
    setError("Item queued. Scan another QR code or submit below.");
  }

  async function saveDirectly() {
    if (!item) return;
    const recQty = parseInt(qty);
    if (isNaN(recQty)) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/inventory/scan/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStock: recQty,
          notes: notes || undefined,
          version: item.version,
        }),
      });
      if (res.status === 409) {
        const data = await res.json();
        setItem(data.item);
        setError("Item was updated by someone else. Please review and try again.");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setItem(data.item);
        setSubmitted(true);
      }
    } catch {
      setError("Save failed — check connection");
    } finally {
      setSaving(false);
    }
  }

  async function submitQueue() {
    setSubmitting(true);
    try {
      for (const entry of queue) {
        await fetch(`/api/inventory/scan/${entry.token}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentStock: entry.recommendedQty,
            notes: entry.notes || undefined,
            version: entry.item.version,
          }),
        });
      }

      // Send email notification for QR submission
      try {
        await fetch("/api/inventory/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            submittedBy: "QR Scanner",
            itemsUpdated: queue.length,
            notes: `QR scan batch: ${queue.map(q => q.item.name).join(", ")}`,
          }),
        });
      } catch { /* non-fatal */ }

      setSubmitted(true);
      setQueue([]);
    } catch {
      setError("Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#040d1a]">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#040d1a] px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-emerald-400"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Updated</h1>
          <p className="text-slate-400 text-sm">Inventory has been updated. You can close this page.</p>
        </div>
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#040d1a] px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-red-400"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          </div>
          <h1 className="text-xl font-black text-white mb-2">QR Code Error</h1>
          <p className="text-slate-400 text-sm">{error}</p>

          {/* Show queue if exists */}
          {queue.length > 0 && (
            <div className="mt-6">
              <h2 className="text-white font-bold mb-3">Queued Items ({queue.length})</h2>
              {queue.map((q, i) => (
                <div key={i} className="bg-[#071428] border border-white/10 rounded-xl p-3 mb-2 text-left">
                  <div className="text-white text-sm font-semibold">{q.item.name}</div>
                  <div className="text-[#f0b429] text-xs">Qty: {q.recommendedQty}</div>
                </div>
              ))}
              <button
                onClick={submitQueue}
                disabled={submitting}
                className="w-full mt-3 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit All"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040d1a] px-4 py-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-[#f0b429]/10 border border-[#f0b429]/20 rounded-full px-3 py-1 mb-3">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#f0b429]"><path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 13h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2zm-2-2h2v2h-2v-2z"/></svg>
            <span className="text-[#f0b429] text-xs font-bold uppercase tracking-wider">QR Scan</span>
          </div>
          <h1 className="text-xl font-black text-white">{item?.name}</h1>
          <p className="text-slate-500 text-sm mt-1">{item?.categoryName}</p>
        </div>

        {error && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-amber-400 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Item info */}
        <div className="bg-[#071428] border border-white/10 rounded-2xl p-5 mb-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Location</div>
              <div className="text-white text-sm font-medium">{item?.location ?? "—"}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Category</div>
              <div className="text-white text-sm font-medium">{item?.categoryName}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#040d1a] rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-white">{item?.par ?? 0}</div>
              <div className="text-slate-500 text-[10px] uppercase tracking-wider mt-1">PAR</div>
            </div>
            <div className="bg-[#040d1a] rounded-xl p-3 text-center">
              <div className={`text-2xl font-black ${(item?.qtyToOrder ?? 0) > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                {item?.currentStock ?? 0}
              </div>
              <div className="text-slate-500 text-[10px] uppercase tracking-wider mt-1">Stock</div>
            </div>
            <div className="bg-[#040d1a] rounded-xl p-3 text-center">
              <div className={`text-2xl font-black ${(item?.qtyToOrder ?? 0) > 0 ? "text-red-400" : "text-slate-600"}`}>
                {item?.qtyToOrder ?? 0}
              </div>
              <div className="text-slate-500 text-[10px] uppercase tracking-wider mt-1">Need</div>
            </div>
          </div>
        </div>

        {/* Update form */}
        <div className="bg-[#071428] border border-white/10 rounded-2xl p-5 mb-4">
          <h2 className="text-white font-bold text-sm mb-3">Update Stock</h2>

          <div className="mb-3">
            <label className="text-slate-500 text-xs uppercase tracking-wider mb-1 block">Current Quantity</label>
            <input
              type="number"
              inputMode="numeric"
              value={qty}
              onChange={e => setQty(e.target.value)}
              className="w-full px-4 py-3 bg-[#040d1a] border border-white/10 rounded-xl text-white text-lg font-bold text-center focus:outline-none focus:border-[#f0b429]/50"
            />
          </div>

          <div className="mb-4">
            <label className="text-slate-500 text-xs uppercase tracking-wider mb-1 block">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add a note..."
              className="w-full px-4 py-2.5 bg-[#040d1a] border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-[#f0b429]/50"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={addToQueue}
              className="flex-1 py-3 border border-[#f0b429]/30 text-[#f0b429] font-bold rounded-xl hover:bg-[#f0b429]/10 transition-colors"
            >
              Queue & Scan More
            </button>
            <button
              onClick={saveDirectly}
              disabled={saving}
              className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Now"}
            </button>
          </div>
        </div>

        {/* Queue */}
        {queue.length > 0 && (
          <div className="bg-[#071428] border border-white/10 rounded-2xl p-5">
            <h2 className="text-white font-bold text-sm mb-3">Queued Updates ({queue.length})</h2>
            {queue.map((q, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <div className="text-white text-sm font-semibold">{q.item.name}</div>
                  <div className="text-slate-500 text-xs">{q.item.location}</div>
                </div>
                <div className="text-right">
                  <div className="text-[#f0b429] font-bold">{q.recommendedQty}</div>
                  <button
                    onClick={() => setQueue(queue.filter((_, j) => j !== i))}
                    className="text-red-400 text-xs hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={submitQueue}
              disabled={submitting}
              className="w-full mt-3 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-50"
            >
              {submitting ? "Submitting..." : `Submit All (${queue.length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

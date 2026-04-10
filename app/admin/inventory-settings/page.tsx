"use client";

import { useState, useEffect } from "react";

interface QrToken {
  id: string;
  token: string;
  itemId: string;
  itemName: string;
  label: string | null;
  active: boolean;
  createdAt: string;
}

interface Category {
  slug: string;
  name: string;
}

interface Item {
  id: string;
  name: string;
  categorySlug?: string;
  categoryName?: string;
  location: string | null;
}

export default function InventorySettingsPage() {
  const [tab, setTab] = useState<"password" | "qr" | "seed">("password");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const [qrTokens, setQrTokens] = useState<QrToken[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [qrResult, setQrResult] = useState<{ url: string; qrDataUrl: string } | null>(null);
  const [bulkResults, setBulkResults] = useState<{ itemName: string; url: string; qrDataUrl: string }[]>([]);

  const [seedLoading, setSeedLoading] = useState(false);
  const [seedResult, setSeedResult] = useState("");

  useEffect(() => {
    loadQrTokens();
    loadItems();
  }, []);

  async function loadQrTokens() {
    try {
      const res = await fetch("/api/admin/inventory/qr");
      if (res.ok) setQrTokens(await res.json());
    } catch { /* ignore */ }
  }

  async function loadItems() {
    try {
      // Use the inventory items API (needs admin cookie which shares auth)
      const res = await fetch("/api/admin/inventory/reports?type=submissions");
      // Also try to get items for the dropdown
      const itemRes = await fetch("/api/inventory/items");
      if (itemRes.ok) {
        const allItems = await itemRes.json() as Item[];
        setItems(allItems);
        const catMap = new Map<string, string>();
        for (const i of allItems) {
          if (i.categorySlug && i.categoryName) catMap.set(i.categorySlug, i.categoryName);
        }
        setCategories(Array.from(catMap.entries()).map(([slug, name]) => ({ slug, name })));
      }
    } catch { /* ignore */ }
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) {
      setPwMsg("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setPwMsg("Password must be at least 6 characters");
      return;
    }
    setPwLoading(true);
    setPwMsg("");
    try {
      const res = await fetch("/api/admin/inventory/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwMsg("Password updated successfully. All inventory sessions invalidated.");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPwMsg(data.error || "Failed to update password");
      }
    } catch {
      setPwMsg("Connection error");
    }
    setPwLoading(false);
  }

  async function generateQr() {
    if (!selectedItem) return;
    setQrLoading(true);
    try {
      const res = await fetch("/api/admin/inventory/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: selectedItem }),
      });
      if (res.ok) {
        const data = await res.json();
        setQrResult({ url: data.url, qrDataUrl: data.qrDataUrl });
        loadQrTokens();
      }
    } catch { /* ignore */ }
    setQrLoading(false);
  }

  async function generateBulkQr() {
    if (!selectedCat) return;
    setQrLoading(true);
    setBulkResults([]);
    try {
      const res = await fetch("/api/admin/inventory/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulkCategorySlug: selectedCat }),
      });
      if (res.ok) {
        const data = await res.json();
        setBulkResults(data.tokens.map((t: { itemName: string; url: string; qrDataUrl: string }) => ({
          itemName: t.itemName,
          url: t.url,
          qrDataUrl: t.qrDataUrl,
        })));
        loadQrTokens();
      }
    } catch { /* ignore */ }
    setQrLoading(false);
  }

  async function revokeToken(id: string) {
    await fetch("/api/admin/inventory/qr", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadQrTokens();
  }

  async function seedInventory() {
    if (!confirm("This will clear all existing inventory data and re-import from the Excel file. Continue?")) return;
    setSeedLoading(true);
    setSeedResult("");
    try {
      const res = await fetch("/api/inventory/seed", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSeedResult(`Success: ${data.message}`);
      } else {
        setSeedResult(`Error: ${data.error}`);
      }
    } catch {
      setSeedResult("Connection error");
    }
    setSeedLoading(false);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <span className="h-px w-8 bg-[#f0b429]" />
          <span className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase">Inventory</span>
        </div>
        <h1 className="text-2xl font-black text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage inventory password, QR codes, and data</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#071428] rounded-xl p-1 w-fit">
        {(["password", "qr", "seed"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t ? "bg-[#f0b429]/15 text-[#f0b429]" : "text-slate-400 hover:text-white"
            }`}
          >
            {t === "password" ? "Password" : t === "qr" ? "QR Codes" : "Seed Data"}
          </button>
        ))}
      </div>

      {/* Password tab */}
      {tab === "password" && (
        <div className="max-w-md">
          <div className="bg-[#071428] border border-white/10 rounded-2xl p-6">
            <h3 className="text-white font-bold mb-1">Change Inventory Password</h3>
            <p className="text-slate-500 text-xs mb-4">This will invalidate all active inventory sessions.</p>

            <div className="space-y-3 mb-4">
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="New password"
                className="w-full px-4 py-3 bg-[#040d1a] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#f0b429]/40"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-4 py-3 bg-[#040d1a] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#f0b429]/40"
              />
            </div>

            {pwMsg && (
              <div className={`mb-4 text-sm font-medium ${pwMsg.includes("success") ? "text-emerald-400" : "text-red-400"}`}>
                {pwMsg}
              </div>
            )}

            <button
              onClick={changePassword}
              disabled={pwLoading || !newPassword || !confirmPassword}
              className="w-full py-3 bg-[#f0b429] hover:bg-[#d4a127] text-[#040d1a] font-bold rounded-xl disabled:opacity-50"
            >
              {pwLoading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </div>
      )}

      {/* QR tab */}
      {tab === "qr" && (
        <div className="space-y-6">
          {/* Single QR */}
          <div className="bg-[#071428] border border-white/10 rounded-2xl p-6">
            <h3 className="text-white font-bold mb-3">Generate Single QR Code</h3>
            <div className="flex gap-3 mb-4">
              <select
                value={selectedItem}
                onChange={e => setSelectedItem(e.target.value)}
                className="flex-1 px-3 py-2.5 bg-[#040d1a] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#f0b429]/40"
              >
                <option value="">Select item...</option>
                {items.map(i => (
                  <option key={i.id} value={i.id}>{i.categoryName} — {i.name}</option>
                ))}
              </select>
              <button
                onClick={generateQr}
                disabled={!selectedItem || qrLoading}
                className="px-5 py-2.5 bg-[#f0b429] hover:bg-[#d4a127] text-[#040d1a] font-bold text-sm rounded-xl disabled:opacity-50"
              >
                Generate
              </button>
            </div>

            {qrResult && (
              <div className="flex items-center gap-4 bg-[#040d1a] rounded-xl p-4">
                <img src={qrResult.qrDataUrl} alt="QR Code" className="w-32 h-32 rounded-lg" />
                <div>
                  <div className="text-white text-sm font-medium mb-1">QR Code Generated</div>
                  <div className="text-slate-500 text-xs break-all mb-2">{qrResult.url}</div>
                  <a
                    href={qrResult.qrDataUrl}
                    download="qr-code.png"
                    className="text-[#f0b429] text-xs font-semibold hover:underline"
                  >
                    Download PNG
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Bulk QR */}
          <div className="bg-[#071428] border border-white/10 rounded-2xl p-6">
            <h3 className="text-white font-bold mb-3">Bulk Generate (by Category)</h3>
            <div className="flex gap-3 mb-4">
              <select
                value={selectedCat}
                onChange={e => setSelectedCat(e.target.value)}
                className="flex-1 px-3 py-2.5 bg-[#040d1a] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#f0b429]/40"
              >
                <option value="">Select category...</option>
                {categories.map(c => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={generateBulkQr}
                disabled={!selectedCat || qrLoading}
                className="px-5 py-2.5 bg-[#f0b429] hover:bg-[#d4a127] text-[#040d1a] font-bold text-sm rounded-xl disabled:opacity-50"
              >
                {qrLoading ? "Generating..." : "Generate All"}
              </button>
            </div>

            {bulkResults.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {bulkResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 bg-[#040d1a] rounded-xl px-4 py-2">
                    <img src={r.qrDataUrl} alt="QR" className="w-12 h-12 rounded" />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-medium truncate">{r.itemName}</div>
                      <div className="text-slate-600 text-[10px] truncate">{r.url}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active tokens */}
          <div className="bg-[#071428] border border-white/10 rounded-2xl p-6">
            <h3 className="text-white font-bold mb-3">Active QR Tokens ({qrTokens.filter(t => t.active).length})</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {qrTokens.filter(t => t.active).map(t => (
                <div key={t.id} className="flex items-center justify-between bg-[#040d1a] rounded-xl px-4 py-3">
                  <div>
                    <div className="text-white text-sm font-medium">{t.itemName}</div>
                    <div className="text-slate-600 text-xs">{new Date(t.createdAt).toLocaleDateString()}</div>
                  </div>
                  <button
                    onClick={() => revokeToken(t.id)}
                    className="text-red-400 text-xs font-semibold hover:underline"
                  >
                    Revoke
                  </button>
                </div>
              ))}
              {qrTokens.filter(t => t.active).length === 0 && (
                <div className="text-center py-8 text-slate-600 text-sm">No active QR tokens</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Seed tab */}
      {tab === "seed" && (
        <div className="max-w-md">
          <div className="bg-[#071428] border border-white/10 rounded-2xl p-6">
            <h3 className="text-white font-bold mb-1">Seed from Excel</h3>
            <p className="text-slate-500 text-xs mb-4">
              Import inventory from "2026 Millstadt EMS Order _ Inv Form.xlsx".
              This will clear existing inventory data.
            </p>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-amber-400 text-xs mb-4">
              Warning: This replaces all existing inventory items, categories, and QR tokens.
            </div>

            {seedResult && (
              <div className={`mb-4 text-sm font-medium ${seedResult.startsWith("Success") ? "text-emerald-400" : "text-red-400"}`}>
                {seedResult}
              </div>
            )}

            <button
              onClick={seedInventory}
              disabled={seedLoading}
              className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl disabled:opacity-50"
            >
              {seedLoading ? "Seeding..." : "Import from Excel"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

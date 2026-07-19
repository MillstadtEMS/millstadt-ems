"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function WorkbookUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function upload() {
    if (!file) return;
    setBusy(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/board/admin/import", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ ok: false, text: data.error || "Update failed." }); return; }
      setMsg({ ok: true, text: `Updated referendum model cache: ${data.finance} figures, ${data.budgetLines} budget lines, ${data.personnelGroups ?? 0} personnel groups, ${data.truckUnits ?? 0} fleet units, ${data.debts ?? 0} debts, ${data.forecastRows ?? 0} forecast rows.` });
      setFile(null); if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch { setMsg({ ok: false, text: "Network error. Please try again." }); }
    finally { setBusy(false); }
  }

  return (
    <div className="board-card" style={{ maxWidth: 560 }}>
      <div className="board-eyebrow" style={{ marginBottom: 6 }}>Update from workbook</div>
      <p style={{ margin: "0 0 14px", color: "var(--b-ink-2)", fontSize: 14 }}>
        Upload the approved referendum workbook (.xlsx). The portal refreshes the projected model cache. Formulas in the workbook are not modified by this upload.
      </p>
      <input ref={inputRef} type="file" accept=".xlsx" className="board-input" style={{ padding: 9 }}
        onChange={(e) => { setFile(e.target.files?.[0] ?? null); setMsg(null); }} />
      <button className="board-submit" style={{ marginTop: 14, width: "auto", padding: "11px 22px" }} disabled={!file || busy} onClick={upload}>
        {busy ? "Updating…" : "Update financials"}
      </button>
      {msg && (
        <div className={msg.ok ? "board-note" : "board-err"} style={msg.ok ? { color: "var(--b-good)", marginTop: 14 } : { marginTop: 14 }} role="status">
          {msg.text}
        </div>
      )}
    </div>
  );
}
